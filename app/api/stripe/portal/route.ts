import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const originHeader = request.headers.get('origin');
  if (originHeader) return originHeader;
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

async function resolveCustomerId(profileCustomerId: string | null, userEmail: string): Promise<string | null> {
  if (profileCustomerId) return profileCustomerId;
  // stripe_customer_id が未保存の場合、メールで検索
  const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
  return customers.data[0]?.id ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const customerId = await resolveCustomerId(profile?.stripe_customer_id ?? null, user.email!);

    if (!customerId) {
      return NextResponse.json({
        error: 'サブスクリプション情報が見つかりません。サポートにお問い合わせください。'
      }, { status: 404 });
    }

    // 見つかった customer_id を DB に保存（webhook 未着の場合の補完）
    if (!profile?.stripe_customer_id) {
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const origin = getOrigin(request);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    console.error('[stripe/portal]', e);
    const stripeError = e as { message?: string; code?: string };
    if (stripeError.code === 'resource_missing') {
      return NextResponse.json({
        error: 'Stripeカスタマーポータルが設定されていません。Stripeダッシュボードで有効化してください。'
      }, { status: 500 });
    }
    const message = stripeError.message ?? 'ポータルの作成に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
