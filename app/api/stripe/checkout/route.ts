import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { PACKS, ADDONS, isPackKey, isAddonKey } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    // item は基本パック('24h'等) または 追加クレジット('add10'等)
    const { item } = await request.json().catch(() => ({ item: '1m' }));

    let productName: string;
    let amount: number;
    let metadata: Record<string, string>;

    if (isPackKey(item)) {
      const p = PACKS[item];
      productName = `MediQuiz AI ${p.label}プラン`;
      amount = p.amount;
      metadata = { userId: user.id, type: 'pack', item, credits: String(p.credits), days: String(p.days) };
    } else if (isAddonKey(item)) {
      // 追加クレジットは、有効期限内の買い切りプラン利用中のみ購入可能
      const { data: prof } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at')
        .eq('id', user.id)
        .single();
      const active = prof?.plan === 'standard'
        && !!prof?.plan_expires_at && new Date(prof.plan_expires_at) > new Date();
      if (!active) {
        return NextResponse.json({
          error: '追加教材クレジットは、有料プラン（買い切り）をご利用中の方のみ購入できます。まずはプランをご購入ください。',
        }, { status: 400 });
      }
      const a = ADDONS[item];
      productName = `MediQuiz AI ${a.label}`;
      amount = a.amount;
      metadata = { userId: user.id, type: 'addon', item, credits: String(a.credits) };
    } else {
      return NextResponse.json({ error: '不正な商品です' }, { status: 400 });
    }

    const origin = new URL(request.url).origin;

    // 買い切り（都度払い）。PayPayはサブスク非対応のため mode: 'payment' が必須。
    // 決済手段(カード/PayPay/Apple Pay)は payment_method_types を指定せず、
    // Stripeダッシュボードで有効化した方法を自動表示させる（automatic payment methods）。
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: amount,
          product_data: { name: productName },
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      locale: 'ja',
      customer_email: user.email,
      client_reference_id: user.id,
      metadata,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 });
  }
}
