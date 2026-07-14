import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getSourceInstruction } from '@/lib/departmentUtils';
import { extractQuestions, randomizeAnswerPosition, type RawQuestion } from '@/lib/questionUtils';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CHECK_QUESTION_COUNT = 3;

function getCheckPrompt(subjectName: string, unitName: string): string {
  return `あなたは薬学部生向けの薬剤師国家試験対策問題を作成する専門家です。
科目「${subjectName}」の単元「${unitName}」について、理解度を確認するための4択問題を${CHECK_QUESTION_COUNT}問作成してください。

IMPORTANT: Return ONLY raw JSON. No explanation, no markdown, no code blocks.
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"${subjectName}","difficulty":"medium"}]}

Rules:
- answer must be: A, B, C, or D（文字のみ）
- 問題文・選択肢・解説はすべて日本語
- 「${unitName}」の内容から外れないこと
- 選択肢A〜Dの文章の長さをできるだけ揃える
- 正解はA・B・C・Dが均等になるように分散させる
${getSourceInstruction('pharmacy')}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { unitId } = await request.json();
    if (!unitId || typeof unitId !== 'string') {
      return NextResponse.json({ error: '単元が指定されていません' }, { status: 400 });
    }

    const { data: unit } = await supabase
      .from('units')
      .select('name, subjects(name)')
      .eq('id', unitId)
      .single();

    if (!unit) return NextResponse.json({ error: '単元が見つかりません' }, { status: 404 });
    const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: getCheckPrompt(subject?.name ?? '', unit.name) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const questions: RawQuestion[] = extractQuestions(text).slice(0, CHECK_QUESTION_COUNT).map(randomizeAnswerPosition);

    if (questions.length === 0) {
      throw new Error('問題を生成できませんでした');
    }

    return NextResponse.json({
      questions: questions.map(q => ({ ...q, id: crypto.randomUUID() })),
    });
  } catch (e) {
    console.error('[unit-check-generate]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
