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
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session as { customer_email?: string }).customer_email;
    const customerId = (session as { customer?: string }).customer;
    const subscriptionId = (session as { subscription?: string }).subscription;

    if (email) {
      const { data: users } = await supabase.auth.admin.listUsers();
      const user = users?.users.find(u => u.email === email);
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          plan: 'standard',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const customerId = (sub as { customer?: string }).customer;
    await supabase.from('profiles')
      .update({ plan: 'free', stripe_subscription_id: null })
      .eq('stripe_customer_id', customerId);
  }

  return NextResponse.json({ received: true });
}on({ received: true });
}
