import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSourceInstruction } from '@/lib/departmentUtils';
import { extractQuestions, randomizeAnswerPosition, shuffle, type RawQuestion } from '@/lib/questionUtils';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DIAGNOSTIC_QUESTION_COUNT = 50;
const GENERATION_CONCURRENCY = 5;
const MAX_ATTEMPTS = 2;

const EXAM_LABEL: Record<string, string> = {
  cbt: '薬学共用試験（CBT）',
  kokushi: '薬剤師国家試験',
};

type UnitTarget = { unitId: string; unitName: string; subjectName: string; subjectId: string };

export type DiagnosticQuestion = {
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

function getDiagnosticPrompt(examType: string, subjectName: string, unitName: string): string {
  const examLabel = EXAM_LABEL[examType] ?? '薬剤師国家試験';
  return `あなたは薬学部生向けの${examLabel}対策問題を作成する専門家です。
科目「${subjectName}」の単元「${unitName}」について、実力チェック用の4択問題を1問作成してください。

IMPORTANT: Return ONLY raw JSON. No explanation, no markdown, no code blocks.
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"${subjectName}","difficulty":"medium"}]}

Rules:
- answer must be: A, B, C, or D（文字のみ）
- 問題文・選択肢・解説はすべて日本語
- 「${unitName}」の内容から外れないこと
- ${examLabel}本番に近い難易度・形式にする
- 選択肢A〜Dの文章の長さをできるだけ揃える
${getSourceInstruction('pharmacy')}`;
}

async function generateOne(examType: string, target: UnitTarget): Promise<RawQuestion | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: getDiagnosticPrompt(examType, target.subjectName, target.unitName) }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const [q] = extractQuestions(text);
      if (q) return q;
    } catch (e) {
      console.error('[diagnostic-generate] attempt', attempt, 'failed for unit', target.unitId, e);
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { examType, subjectId, count } = await request.json();
    if (examType !== 'cbt' && examType !== 'kokushi') {
      return NextResponse.json({ error: '不正な試験種別です' }, { status: 400 });
    }
    const questionCount = Math.min(Math.max(Math.floor(Number(count) || DIAGNOSTIC_QUESTION_COUNT), 1), DIAGNOSTIC_QUESTION_COUNT);

    const { data: scopes } = await supabase
      .from('unit_scopes')
      .select('unit_id, units(id, name, subject_id, subjects(name))')
      .eq('exam_type', examType)
      .eq('grade', 0);

    let allTargets: UnitTarget[] = (scopes ?? [])
      .filter(s => s.units)
      .map(s => {
        const unit = Array.isArray(s.units) ? s.units[0] : s.units;
        const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
        return {
          unitId: unit.id as string,
          unitName: unit.name as string,
          subjectId: unit.subject_id as string,
          subjectName: (subject?.name as string) ?? '',
        };
      });

    if (typeof subjectId === 'string' && subjectId) {
      allTargets = allTargets.filter(t => t.subjectId === subjectId);
    }

    if (allTargets.length === 0) {
      return NextResponse.json({ error: '出題範囲がまだ準備されていません' }, { status: 404 });
    }

    // 失敗時の代替に使えるよう、必要数より多めの候補単元をシャッフルして確保する
    const candidates = shuffle(allTargets);
    const candidateIds = candidates.map(t => t.unitId);

    const [{ data: bankRows }, { data: historyRows }] = await Promise.all([
      supabase.from('unit_question_bank').select('*').eq('exam_type', examType).in('unit_id', candidateIds),
      supabase.from('user_question_history').select('question_id').eq('user_id', user.id),
    ]);

    const seenIds = new Set((historyRows ?? []).map(h => h.question_id));
    const bankByUnit = new Map<string, NonNullable<typeof bankRows>>();
    for (const row of bankRows ?? []) {
      const list = bankByUnit.get(row.unit_id) ?? [];
      list.push(row);
      bankByUnit.set(row.unit_id, list);
    }

    const questions: DiagnosticQuestion[] = [];
    const missing: UnitTarget[] = [];

    for (const target of candidates) {
      const cached = (bankByUnit.get(target.unitId) ?? []).filter(r => !seenIds.has(r.id));
      if (cached.length > 0) {
        const pick = cached[Math.floor(Math.random() * cached.length)];
        questions.push({
          id: pick.id,
          unitId: target.unitId,
          unitName: target.unitName,
          subjectName: target.subjectName,
          ...randomizeAnswerPosition({
            question: pick.question,
            option_a: pick.option_a,
            option_b: pick.option_b,
            option_c: pick.option_c,
            option_d: pick.option_d,
            answer: pick.answer,
            explanation: pick.explanation,
            subject: target.subjectName,
            difficulty: pick.difficulty,
          }),
        });
      } else {
        missing.push(target);
      }
    }

    // バンクだけで足りていれば生成をスキップ
    if (questions.length < questionCount && missing.length > 0) {
      const admin = createAdminClient();
      for (let i = 0; i < missing.length && questions.length < questionCount; i += GENERATION_CONCURRENCY) {
        const batch = missing.slice(i, i + GENERATION_CONCURRENCY);
        const results = await Promise.all(batch.map(target => generateOne(examType, target)));

        const toInsert = batch
          .map((target, idx) => ({ target, q: results[idx] }))
          .filter((r): r is { target: UnitTarget; q: RawQuestion } => r.q !== null);

        if (toInsert.length > 0) {
          const { data: inserted } = await admin
            .from('unit_question_bank')
            .insert(toInsert.map(({ target, q }) => ({
              unit_id: target.unitId,
              exam_type: examType,
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
            const target = toInsert.find(t => t.target.unitId === row.unit_id)?.target;
            if (!target) continue;
            questions.push({
              id: row.id,
              unitId: target.unitId,
              unitName: target.unitName,
              subjectName: target.subjectName,
              ...randomizeAnswerPosition({
                question: row.question,
                option_a: row.option_a,
                option_b: row.option_b,
                option_c: row.option_c,
                option_d: row.option_d,
                answer: row.answer,
                explanation: row.explanation,
                subject: target.subjectName,
                difficulty: row.difficulty,
              }),
            });
          }
        }
      }
    }

    if (questions.length === 0) {
      throw new Error('問題を準備できませんでした');
    }

    const finalQuestions = shuffle(questions).slice(0, questionCount);
    await supabase.from('user_question_history').upsert(
      finalQuestions.map(q => ({ user_id: user.id, question_id: q.id })),
      { onConflict: 'user_id,question_id', ignoreDuplicates: true }
    );

    return NextResponse.json({ questions: finalQuestions });
  } catch (e) {
    console.error('[diagnostic-generate]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題の準備に失敗しました' }, { status: 500 });
  }
}
