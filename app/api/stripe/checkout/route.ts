import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { PACKS, isPackKey } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { pack } = await request.json().catch(() => ({ pack: '1m' }));
    if (!isPackKey(pack)) {
      return NextResponse.json({ error: '不正なプランです' }, { status: 400 });
    }
    const { amount, label, plan } = PACKS[pack];

    const origin = new URL(request.url).origin;

    // 買い切り（都度払い）。PayPayはサブスク非対応のため mode: 'payment' が必須。
    // 決済手段(カード/PayPay)は payment_method_types を指定せず、Stripeダッシュボードで
    // 有効化した方法を自動表示させる（automatic payment methods）。PayPayはダッシュボードで要有効化。
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'jpy',
          unit_amount: amount,
          product_data: {
            name: `MediQuiz AI ${label}プラン`,
            description: `${label}の買い切りプラン（自動更新なし）`,
          },
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/pricing`,
      locale: 'ja',
      customer_email: user.email,
      client_reference_id: user.id,
      // webhookで付与内容を確定するためのメタデータ（金額・日数はサーバー側PACKSから再計算する）
      metadata: { userId: user.id, pack, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 });
  }
}
