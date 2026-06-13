import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDepartmentType } from '@/lib/departmentUtils';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type TodayQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string;
  subject: string;
  difficulty: string;
};

function getJSTDateStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

function getTodayPrompt(deptType: string): string {
  const label: Record<string, string> = {
    medical: '医学部生（医師国家試験・CBT対策）',
    pharmacy: '薬学部生（薬剤師国家試験・CBT対策）',
    nursing: '看護学生（看護師国家試験・CBT対策）',
    other: '医療系学生（看護・医学・薬学・リハビリ）',
  };
  return `あなたは医療系大学生の学習支援AIです。${label[deptType] ?? '医療系学生'}向けの「今日の問題」として、異なる分野からバランスよく5問の4択問題を作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard（3種類をバランスよく使う）
- answer must be: A, B, C, or D（A〜Dが均等になるよう分散させる）
- 問題文・選択肢・解説はすべて日本語
- 国家試験・CBTレベルを意識した実践的な問題
- 5問は必ず異なる科目・分野から出題する
- 選択肢A〜Dの文章の長さ・文体を揃える（正解だけ長くしない）
- 解説は簡潔かつ正確に（なぜその答えが正しいか・他の選択肢が誤りかを説明）`;
}

async function generateTodayQuestions(deptType: string): Promise<TodayQuestion[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: getTodayPrompt(deptType) }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSONが見つかりません');

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed.questions)) throw new Error('問題データが見つかりません');

  return (parsed.questions as Omit<TodayQuestion, 'id'>[]).slice(0, 5).map(q => ({
    id: crypto.randomUUID(),
    question: q.question,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    answer: q.answer,
    explanation: q.explanation,
    subject: q.subject,
    difficulty: q.difficulty,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('department')
      .eq('id', user.id)
      .single();

    const deptType = getDepartmentType(profile?.department);
    const dateStr = getJSTDateStr();

    // 同じ学部・同じ日の問題が既にあれば返す
    const { data: existing } = await admin
      .from('today_questions')
      .select('questions')
      .eq('department_type', deptType)
      .eq('date', dateStr)
      .single();

    if (existing?.questions) {
      return NextResponse.json({ questions: existing.questions as TodayQuestion[], deptType });
    }

    // AIで5問生成
    const questions = await generateTodayQuestions(deptType);

    await admin.from('today_questions').insert({
      department_type: deptType,
      date: dateStr,
      questions,
    });

    return NextResponse.json({ questions, deptType });

  } catch (e) {
    console.error('[today-generate]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
