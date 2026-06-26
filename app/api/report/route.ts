import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { question_id, question_data, reason } = await request.json();

    let qId = question_id;

    // question_id がない場合（AI生成で未保存）は先に問題をDBに保存
    if (!qId && question_data) {
      // クライアントからの入力をホワイトリストで制限
      const safeData = {
        question:    typeof question_data.question    === 'string' ? question_data.question.slice(0, 1000)    : '',
        option_a:    typeof question_data.option_a    === 'string' ? question_data.option_a.slice(0, 500)     : '',
        option_b:    typeof question_data.option_b    === 'string' ? question_data.option_b.slice(0, 500)     : '',
        option_c:    typeof question_data.option_c    === 'string' ? question_data.option_c.slice(0, 500)     : null,
        option_d:    typeof question_data.option_d    === 'string' ? question_data.option_d.slice(0, 500)     : null,
        answer:      typeof question_data.answer      === 'string' ? question_data.answer.slice(0, 10)        : '',
        explanation: typeof question_data.explanation === 'string' ? question_data.explanation.slice(0, 2000) : '',
        subject:     typeof question_data.subject     === 'string' ? question_data.subject.slice(0, 100)      : '',
        difficulty:  ['easy', 'medium', 'hard'].includes(question_data.difficulty) ? question_data.difficulty : 'medium',
      };
      const { data: saved, error } = await supabase
        .from('questions')
        .insert({ user_id: user.id, ...safeData })
        .select('id')
        .single();
      if (error) throw error;
      qId = saved.id;
    }

    if (!qId) {
      return NextResponse.json({ error: '問題IDが見つかりません' }, { status: 400 });
    }

    const { error } = await supabase.from('question_reports').insert({
      question_id: qId,
      user_id: user.id,
      reason,
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[report]', e);
    return NextResponse.json({ error: '報告の送信に失敗しました' }, { status: 500 });
  }
}
