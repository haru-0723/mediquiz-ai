import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan === 'standard') {
      await supabase.from('kokushi_logs').insert({ user_id: user.id });
      return NextResponse.json({ allowed: true });
    }

    return NextResponse.json({
      allowed: false,
      error: '国試モードはスタンダードプランの機能です。アップグレードしてご利用ください。',
      upgrade: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
