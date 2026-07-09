import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { PACKS, isPackKey } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 買い切りパックをユーザーに付与する（残り期間があれば延長）
  async function grantPack(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId || session.client_reference_id || undefined;
    const packKey = session.metadata?.pack;
    const customerId = (session.customer as string) || null;
    if (!userId || !isPackKey(packKey)) return;

    const { plan, days } = PACKS[packKey];

    // 既に残り期間があれば、その終端から延長する（なければ今から）
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_expires_at')
      .eq('id', userId)
      .single();

    const now = Date.now();
    const currentExpiry = profile?.plan_expires_at ? new Date(profile.plan_expires_at).getTime() : 0;
    const base = Math.max(now, currentExpiry);
    const newExpiry = new Date(base + days * 24 * 60 * 60 * 1000);

    await supabase.from('profiles')
      .update({
        plan,
        plan_expires_at: newExpiry.toISOString(),
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      })
      .eq('id', userId);
  }

  // 買い切り（都度払い）の購入完了。カードは即時 paid、PayPay等の遅延決済は
  // async_payment_succeeded で後から確定するため両方を処理する。
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'payment' && session.payment_status === 'paid') {
      await grantPack(session);
    }
  }

  if (event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'payment') {
      await grantPack(session);
    }
  }

  // 以下はレガシー（旧サブスク）のための後始末。買い切り移行後は新規では発火しない。
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    await supabase.from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', customerId);
  }

  return NextResponse.json({ received: true });
}
