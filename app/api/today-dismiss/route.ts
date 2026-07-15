import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJSTDateStr } from '@/lib/recommendation/getTodayUnits';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { unitId } = await request.json();
    if (!unitId || typeof unitId !== 'string') {
      return NextResponse.json({ error: '単元が指定されていません' }, { status: 400 });
    }

    const { error } = await supabase.from('today_dismissals').upsert({
      user_id: user.id,
      unit_id: unitId,
      dismissed_on: getJSTDateStr(),
    });
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[today-dismiss]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '保存に失敗しました' }, { status: 500 });
  }
}
