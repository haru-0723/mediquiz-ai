import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSourceInstruction } from '@/lib/departmentUtils';
import { extractQuestions, randomizeAnswerPosition, type RawQuestion } from '@/lib/questionUtils';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHECK_QUESTION_COUNT = 3;
const MAX_ATTEMPTS = 2;

type UnitInfo = { unitId: string; unitName: string; subjectName: string };

export type CheckQuestion = {
  id: string;
  unitId: string;
  unitName: string;
  subjectName: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string;
  difficulty: string;
};

function getCheckPrompt(examLabel: string, subjectName: string, unitName: string): string {
  return `あなたは薬学部生向けの${examLabel}対策問題を作成する専門家です。
科目「${subjectName}」の単元「${unitName}」について、理解度を確認するための4択問題を1問作成してください。

IMPORTANT: Return ONLY raw JSON. No explanation, no markdown, no code blocks.
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"${subjectName}","difficulty":"medium"}]}

Rules:
- answer must be: A, B, C, or D（文字のみ）
- 問題文・選択肢・解説はすべて日本語
- 「${unitName}」の内容から外れないこと
- 選択肢A〜Dの文章の長さをできるだけ揃える
${getSourceInstruction('pharmacy')}`;
}

async function generateOne(examLabel: string, unit: UnitInfo): Promise<RawQuestion | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: getCheckPrompt(examLabel, unit.subjectName, unit.unitName) }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const [q] = extractQuestions(text);
      if (q) return q;
    } catch (e) {
      console.error('[unit-check-generate] attempt', attempt, 'failed for unit', unit.unitId, e);
    }
  }
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
    // regular_test 等、CBT以外は国試レベルの問題バンクを共用する
    const bankExamType = examSetting?.exam_type === 'cbt' ? 'cbt' : 'kokushi';
    const examLabel = bankExamType === 'cbt' ? '薬学共用試験（CBT）' : '薬剤師国家試験';

    const { data: unitRows } = await supabase
      .from('units')
      .select('id, name, subjects(name)')
      .in('id', unitIds);

    const units: UnitInfo[] = (unitRows ?? []).map(u => {
      const subject = Array.isArray(u.subjects) ? u.subjects[0] : u.subjects;
      return { unitId: u.id, unitName: u.name, subjectName: (subject?.name as string) ?? '' };
    });
    if (units.length === 0) return NextResponse.json({ error: '単元が見つかりません' }, { status: 404 });

    const [{ data: bankRows }, { data: historyRows }] = await Promise.all([
      supabase.from('unit_question_bank').select('*').eq('exam_type', bankExamType).in('unit_id', unitIds),
      supabase.from('user_question_history').select('question_id').eq('user_id', user.id),
    ]);

    const seenIds = new Set((historyRows ?? []).map(h => h.question_id));
    const bankByUnit = new Map<string, NonNullable<typeof bankRows>>();
    for (const row of bankRows ?? []) {
      const list = bankByUnit.get(row.unit_id) ?? [];
      list.push(row);
      bankByUnit.set(row.unit_id, list);
    }

    const admin = createAdminClient();
    const servedQuestionIds: string[] = [];
    const questions: CheckQuestion[] = [];

    for (const unit of units) {
      const candidates = shuffle((bankByUnit.get(unit.unitId) ?? []).filter(r => !seenIds.has(r.id)));
      const picked = candidates.slice(0, CHECK_QUESTION_COUNT);
      const shortBy = CHECK_QUESTION_COUNT - picked.length;

      const unitQuestions: CheckQuestion[] = picked.map(row => ({
        id: row.id,
        unitId: unit.unitId,
        unitName: unit.unitName,
        subjectName: unit.subjectName,
        ...randomizeAnswerPosition({
          question: row.question,
          option_a: row.option_a,
          option_b: row.option_b,
          option_c: row.option_c,
          option_d: row.option_d,
          answer: row.answer,
          explanation: row.explanation,
          subject: unit.subjectName,
          difficulty: row.difficulty,
        }),
      }));

      if (shortBy > 0) {
        const generated = await Promise.all(Array.from({ length: shortBy }, () => generateOne(examLabel, unit)));
        const toInsert = generated.filter((q): q is RawQuestion => q !== null);
        if (toInsert.length > 0) {
          const { data: inserted } = await admin
            .from('unit_question_bank')
            .insert(toInsert.map(q => ({
              unit_id: unit.unitId,
              exam_type: bankExamType,
              question: q.question,
              option_a: q.option_a,
              option_b: q.option_b,
              option_c: q.option_c,
              option_d: q.option_d,
              answer: q.answer,
              explanation: q.explanation,
              difficulty: q.difficulty,
            })))
            .select();
          for (const row of inserted ?? []) {
            unitQuestions.push({
              id: row.id,
              unitId: unit.unitId,
              unitName: unit.unitName,
              subjectName: unit.subjectName,
              ...randomizeAnswerPosition({
                question: row.question,
                option_a: row.option_a,
                option_b: row.option_b,
                option_c: row.option_c,
                option_d: row.option_d,
                answer: row.answer,
                explanation: row.explanation,
                subject: unit.subjectName,
                difficulty: row.difficulty,
              }),
            });
          }
        }
      }

      for (const q of unitQuestions) servedQuestionIds.push(q.id);
      questions.push(...unitQuestions);
    }

    if (questions.length === 0) throw new Error('問題を生成できませんでした');

    if (servedQuestionIds.length > 0) {
      await supabase.from('user_question_history').upsert(
        servedQuestionIds.map(question_id => ({ user_id: user.id, question_id })),
        { onConflict: 'user_id,question_id', ignoreDuplicates: true }
      );
    }

    return NextResponse.json({ questions });
  } catch (e) {
    console.error('[unit-check-generate]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
