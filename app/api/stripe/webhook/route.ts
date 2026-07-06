import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_email;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // 購入したpriceIDでプランを判定
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
    const plan = (priceId && premiumPriceId && priceId === premiumPriceId) ? 'premium' : 'standard';

    if (email) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      if (profile) {
        await supabase.from('profiles').upsert({
          id: profile.id,
          email,
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });
      }
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;

    // ポータルでの解約予約(期末解約)は、まだ期間中なのでプランを維持する
    if (sub.cancel_at_period_end) {
      // 何もしない：期末に customer.subscription.deleted が届いた時点で free に戻す
    } else if (sub.status === 'active' || sub.status === 'trialing') {
      // プラン変更(スタンダード⇄プレミアム)を price ID から判定して反映
      const priceId = sub.items.data[0]?.price?.id;
      const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
      const plan = (priceId && premiumPriceId && priceId === premiumPriceId) ? 'premium' : 'standard';
      await supabase.from('profiles')
        .update({ plan, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', customerId);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = sub.customer as string;
    await supabase.from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', customerId);
  }

  return NextResponse.json({ received: true });
}
