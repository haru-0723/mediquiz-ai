import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDepartmentType } from '@/lib/departmentUtils';
import { getTodayPrompt } from '@/lib/todayPrompt';

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


async function generateTodayQuestions(deptType: string): Promise<TodayQuestion[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
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
