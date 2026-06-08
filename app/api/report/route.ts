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
      const { data: saved, error } = await supabase
        .from('questions')
        .insert({ user_id: user.id, ...question_data })
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
