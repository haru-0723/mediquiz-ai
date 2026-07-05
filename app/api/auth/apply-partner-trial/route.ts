import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();
    if (!userId || !code) {
      return NextResponse.json({ error: '無効なリクエストです' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: partnerCode } = await admin
      .from('partner_codes')
      .select('trial_days, partner_name')
      .eq('code', String(code).toUpperCase())
      .eq('is_active', true)
      .single();

    if (!partnerCode) {
      return NextResponse.json({ error: '無効なパートナーコードです' }, { status: 400 });
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + partnerCode.trial_days);

    const { error } = await admin
      .from('profiles')
      .upsert({ id: userId, trial_ends_at: trialEndsAt.toISOString() }, { onConflict: 'id' });

    if (error) {
      console.error('[apply-partner-trial] upsert error:', error);
      return NextResponse.json({ error: 'トライアルの適用に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true, partnerName: partnerCode.partner_name, trialDays: partnerCode.trial_days });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
