import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEffectivePlan } from '@/lib/planUtils';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, plan_expires_at')
      .eq('id', user.id)
      .single();

    const effectivePlan = getEffectivePlan(profile);

    if (effectivePlan === 'premium') {
      return NextResponse.json({ allowed: true });
    }

    const admin = createAdminClient();
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const startOfMonth = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), 1, -9, 0, 0, 0));

    const { count } = await admin
      .from('cbt_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString());

    const isStandard = effectivePlan === 'standard';
    const limit = isStandard ? 15 : 2;
    if ((count ?? 0) >= limit) {
      return NextResponse.json({
        allowed: false,
        error: isStandard
          ? '有料プランのCBT模試は今月の上限（月15回）に達しました。翌月にリセットされます。'
          : '無料プランのCBT模試は月2回までです。有料プランにアップグレードしてください。',
        upgrade: true
      });
    }

    return NextResponse.json({ allowed: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
