import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PACKS } from '@/lib/plans';

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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + partnerCode.trial_days);

    // 日数が有料パックと一致する場合は、購入と同じ特典（standardプラン＋クレジット）を付与する
    const matchingPack = Object.values(PACKS).find(p => p.days === partnerCode.trial_days);

    if (matchingPack) {
      const { error } = await admin
        .from('profiles')
        .upsert({
          id: userId,
          plan: 'standard',
          plan_expires_at: expiresAt.toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        console.error('[apply-partner-trial] upsert error:', error);
        return NextResponse.json({ error: 'トライアルの適用に失敗しました' }, { status: 500 });
      }

      const { error: creditError } = await admin.rpc('add_generate_credits', {
        p_user_id: userId,
        p_amount: matchingPack.credits,
        p_reset: false,
      });
      if (creditError) {
        console.error('[apply-partner-trial] credit rpc error:', creditError);
      }

      return NextResponse.json({ success: true, partnerName: partnerCode.partner_name, trialDays: partnerCode.trial_days, credits: matchingPack.credits });
    }

    // 対応するパックがない日数の場合は従来通り日次上限つきのトライアル扱い
    const { error } = await admin
      .from('profiles')
      .upsert({ id: userId, trial_ends_at: expiresAt.toISOString() }, { onConflict: 'id' });

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
