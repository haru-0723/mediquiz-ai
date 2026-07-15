import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJSTMondayStr } from '@/lib/week';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { correctCount, questionsCount } = await request.json();
    if (typeof correctCount !== 'number' || typeof questionsCount !== 'number') {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
    }

    const { data: examSetting } = await supabase
      .from('user_exam_settings')
      .select('exam_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    const examType = examSetting?.exam_type;
    if (examType !== 'cbt' && examType !== 'kokushi') {
      return NextResponse.json({ error: '週次診断は国試・CBT向けの機能です' }, { status: 400 });
    }

    const { error } = await supabase.from('weekly_diagnostics').upsert({
      user_id: user.id,
      week_start: getJSTMondayStr(),
      exam_type: examType,
      questions_count: questionsCount,
      correct_count: correctCount,
    }, { onConflict: 'user_id,week_start' });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[weekly-diagnostic-submit]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '保存に失敗しました' }, { status: 500 });
  }
}
