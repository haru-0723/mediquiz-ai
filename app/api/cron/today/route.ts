import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEPT_TYPES = ['medical', 'pharmacy', 'nursing'] as const;

function getJSTDateStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

function getPrompt(deptType: string): string {
  const label: Record<string, string> = {
    medical: '医学部生（医師国家試験・CBT対策）',
    pharmacy: '薬学部生（薬剤師国家試験・CBT対策）',
    nursing: '看護学生（看護師国家試験・CBT対策）',
  };
  return `あなたは医療系大学生の学習支援AIです。${label[deptType]}向けの「今日の問題」として、異なる分野からバランスよく5問の4択問題を作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard（3種類をバランスよく使う）
- answer must be: A, B, C, or D（A〜Dが均等になるよう分散させる）
- 問題文・選択肢・解説はすべて日本語
- 国家試験・CBTレベルを意識した実践的な問題
- 5問は必ず異なる科目・分野から出題する
- 選択肢A〜Dの文章の長さ・文体を揃える（正解だけ長くしない）`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const dateStr = getJSTDateStr();
  const results: Record<string, string> = {};

  for (const deptType of DEPT_TYPES) {
    try {
      // 既に生成済みならスキップ
      const { data: existing } = await admin
        .from('today_questions')
        .select('id')
        .eq('department_type', deptType)
        .eq('date', dateStr)
        .single();

      if (existing) {
        results[deptType] = 'skipped (already exists)';
        continue;
      }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: getPrompt(deptType) }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSONが見つかりません');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.questions)) throw new Error('問題データが見つかりません');

      const questions = parsed.questions.slice(0, 5).map((q: Record<string, string>) => ({
        id: crypto.randomUUID(),
        ...q,
      }));

      await admin.from('today_questions').insert({
        department_type: deptType,
        date: dateStr,
        questions,
      });

      results[deptType] = `generated (${questions.length} questions)`;
    } catch (e) {
      results[deptType] = `error: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[cron/today] ${deptType}:`, e);
    }
  }

  return NextResponse.json({ date: dateStr, results });
}
