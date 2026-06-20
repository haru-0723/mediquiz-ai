import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile && (profile.plan === 'standard' || profile.plan === 'premium')) {
      return NextResponse.json({ allowed: true });
    }

    // 無料プランは月2回まで（adminクライアントでRLSバイパス）
    const admin = createAdminClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await admin
      .from('cbt_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    if ((count ?? 0) >= 2) {
      return NextResponse.json({
        allowed: false,
        error: '無料プランのCBT模試は月2回までです。スタンダードプランにアップグレードしてください。',
        upgrade: true
      });
    }

    return NextResponse.json({ allowed: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
