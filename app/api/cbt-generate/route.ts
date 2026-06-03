import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { subject, count } = await request.json();

    const prompt = `あなたは医療系大学生の国家試験・定期試験対策を支援するAIです。
${subject !== 'すべて' ? `「${subject}」分野の` : '医療系（看護・医学・薬学・リハビリ）の'}CBT形式の4択問題を${count}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 国家試験レベルを意識した問題を作成する
- subjectは具体的な科目名を日本語で書く（例：循環器系、呼吸器系、薬理学など）`;
    - 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解を長く詳しく書かない

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    const parsed = JSON.parse(jsonMatch[0]);

    // 生成した問題をDBに保存
    const questionsToSave = parsed.questions.map((q: Record<string, string>) => ({
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
    }));

    const { data: saved, error: saveError } = await supabase
      .from('questions')
      .insert(questionsToSave)
      .select();

    if (saveError) throw saveError;

    return NextResponse.json({ questions: saved });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
