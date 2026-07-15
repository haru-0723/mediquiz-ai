import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSourceInstruction } from '@/lib/departmentUtils';
import { extractQuestions, randomizeAnswerPosition, type RawQuestion } from '@/lib/questionUtils';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHECK_QUESTION_COUNT = 3;

type UnitInfo = { unitId: string; unitName: string; subjectName: string };

export type CheckQuestion = RawQuestion & {
  id: string;
  unitId: string;
  unitName: string;
  subjectName: string;
};

function getCheckPrompt(examLabel: string, subjectName: string, unitName: string): string {
  return `あなたは薬学部生向けの${examLabel}対策問題を作成する専門家です。
科目「${subjectName}」の単元「${unitName}」について、理解度を確認するための4択問題を${CHECK_QUESTION_COUNT}問作成してください。

IMPORTANT: Return ONLY raw JSON. No explanation, no markdown, no code blocks.
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"${subjectName}","difficulty":"medium"}]}

Rules:
- answer must be: A, B, C, or D（文字のみ）
- 問題文・選択肢・解説はすべて日本語
- 「${unitName}」の内容から外れないこと
- 選択肢A〜Dの文章の長さをできるだけ揃える
${getSourceInstruction('pharmacy')}`;
}

async function generateForUnit(examLabel: string, unit: UnitInfo): Promise<CheckQuestion[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: getCheckPrompt(examLabel, unit.subjectName, unit.unitName) }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return extractQuestions(text)
      .slice(0, CHECK_QUESTION_COUNT)
      .map(randomizeAnswerPosition)
      .map(q => ({ ...q, id: crypto.randomUUID(), unitId: unit.unitId, unitName: unit.unitName, subjectName: unit.subjectName }));
  } catch (e) {
    console.error('[unit-check-generate] failed for unit', unit.unitId, e);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const body = await request.json();
    // 単一（unitId）と複数（unitIds）の両方を受け付ける
    const rawIds: string[] = Array.isArray(body.unitIds)
      ? body.unitIds
      : typeof body.unitId === 'string' ? [body.unitId] : [];
    const unitIds = Array.from(new Set(rawIds.filter(id => typeof id === 'string' && id))).slice(0, 10);
    if (unitIds.length === 0) {
      return NextResponse.json({ error: '単元が指定されていません' }, { status: 400 });
    }

    const { data: examSetting } = await supabase
      .from('user_exam_settings')
      .select('exam_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    const examLabel = examSetting?.exam_type === 'cbt' ? '薬学共用試験（CBT）' : '薬剤師国家試験';

    const { data: unitRows } = await supabase
      .from('units')
      .select('id, name, subjects(name)')
      .in('id', unitIds);

    const units: UnitInfo[] = (unitRows ?? []).map(u => {
      const subject = Array.isArray(u.subjects) ? u.subjects[0] : u.subjects;
      return { unitId: u.id, unitName: u.name, subjectName: (subject?.name as string) ?? '' };
    });
    if (units.length === 0) return NextResponse.json({ error: '単元が見つかりません' }, { status: 404 });

    const batches = await Promise.all(units.map(u => generateForUnit(examLabel, u)));
    const questions = batches.flat();
    if (questions.length === 0) throw new Error('問題を生成できませんでした');

    return NextResponse.json({ questions });
  } catch (e) {
    console.error('[unit-check-generate]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
