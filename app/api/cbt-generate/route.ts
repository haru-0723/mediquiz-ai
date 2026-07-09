import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDepartmentType, getCBTSubjectInstruction, getSourceInstruction } from '@/lib/departmentUtils';
import { extractQuestions, type RawQuestion } from '@/lib/questionUtils';
import { getEffectivePlan } from '@/lib/planUtils';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// batchCount 問を1回のAPI呼び出しで生成
async function generateBatch(
  subject: string,
  batchCount: number,
  department: string | null | undefined,
  targetExam?: string | null,
): Promise<RawQuestion[]> {
  const examType = getDepartmentType(department, targetExam);
  const prompt = `あなたは医療系大学生の国家試験・定期試験対策を支援するAIです。
${subject !== 'すべて' ? `「${subject}」分野の` : '医療系（看護・医学・薬学・リハビリ）の'}CBT形式の4択問題を${batchCount}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.
必ず有効なJSON形式で返してください。JSONが長くなる場合も途中で切らないでください。全${batchCount}問を必ず完全に出力してください。

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 国家試験レベルを意識した問題を作成する
${getCBTSubjectInstruction(department, targetExam)}
${getSourceInstruction(examType)}
- 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解を長く詳しく書かない
- 正解はA・B・C・Dが均等になるように分散させてください
- 選択肢A〜Dの文章の長さ・文体・詳しさを必ず揃えること。正解の選択肢だけ長くしたり、詳しく書いたりしないこと。全ての選択肢が同じくらいの文字数・同じ文体になるようにすること`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return extractQuestions(text);
}

export async function POST(request: NextRequest) {
  const admin = createAdminClient();
  let quotaLogId: string | null = null;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, plan_expires_at, department, target_exam')
      .eq('id', user.id)
      .single();

    const effectivePlan = getEffectivePlan(profile);

    const { subject, count: rawCount } = await request.json();
    const count = Math.min(Math.max(Math.floor(Number(rawCount) || 10), 1), 30);

    // 月間のCBT生成上限を原子的に消費（premiumは無制限）
    if (effectivePlan !== 'premium') {
      const isFree = effectivePlan === 'free';
      const limit = isFree ? 2 : 15;
      const { data: newLogId, error: quotaError } = await admin.rpc('consume_usage_quota', {
        p_user_id: user.id,
        p_table: 'cbt_logs',
        p_period: 'month',
        p_limit: limit,
      });
      if (quotaError) {
        console.error('[cbt-generate] quota rpc error:', quotaError);
        return NextResponse.json({ error: '利用状況の確認に失敗しました' }, { status: 500 });
      }
      if (!newLogId) {
        return NextResponse.json({
          error: isFree
            ? '無料プランのCBT模試は月2回までです。有料プランにアップグレードしてください。'
            : '有料プランのCBT模試は今月の上限（月15回）に達しました。翌月にリセットされます。',
          upgrade: true,
        }, { status: 403 });
      }
      quotaLogId = newLogId as string;
    }

    // 10問ずつバッチに分割して順番に生成
    const BATCH_SIZE = 10;
    const allRawQuestions: RawQuestion[] = [];
    let remaining = count;

    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      const batch = await generateBatch(subject, batchCount, profile?.department, profile?.target_exam);
      allRawQuestions.push(...batch);
      remaining -= batchCount;
    }

    if (allRawQuestions.length === 0) {
      throw new Error('問題を生成できませんでした');
    }

    const deptType = getDepartmentType(profile?.department, profile?.target_exam);
    const isCbt = deptType !== 'other';

    const questionsToSave = allRawQuestions.map((q: RawQuestion) => ({
      user_id: user.id,
      subject: q.subject,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      is_cbt: isCbt,
      department_type: deptType,
    }));

    const { data: saved, error: saveError } = await supabase
      .from('questions')
      .insert(questionsToSave)
      .select();

    if (saveError) throw saveError;

    return NextResponse.json({ questions: saved });

  } catch (e) {
    if (quotaLogId) {
      try { await admin.rpc('release_usage_quota', { p_table: 'cbt_logs', p_log_id: quotaLogId }); } catch { /* best effort */ }
    }
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
