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
      // 全ユーザーをページネーションで取得（デフォルトの1000件制限を回避）
      let allUsers: { id: string; email?: string; email_confirmed_at?: string | null }[] = [];
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data: batch } = await supabase.auth.admin.listUsers({ page, perPage });
        if (!batch?.users?.length) break;
        allUsers = allUsers.concat(batch.users);
        if (batch.users.length < perPage) break;
        page++;
      }
      const user = allUsers.find(
        u => u.email === email && u.email_confirmed_at !== null
      );
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });
      }
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
