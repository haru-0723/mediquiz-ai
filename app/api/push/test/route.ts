import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification, type PushSubscription } from '@/lib/webpush';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_subscription')
      .eq('id', user.id)
      .single();

    if (!profile?.push_subscription) {
      return NextResponse.json({ error: '通知が登録されていません' }, { status: 400 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidMailto = process.env.VAPID_MAILTO;

    if (!vapidPublic || !vapidPrivate || !vapidMailto) {
      return NextResponse.json({
        error: 'VAPID環境変数が未設定',
        vapidPublic: !!vapidPublic,
        vapidPrivate: !!vapidPrivate,
        vapidMailto: !!vapidMailto,
      }, { status: 500 });
    }

    const result = await sendPushNotification(
      profile.push_subscription as PushSubscription,
      { title: '🔔 テスト通知', body: 'MediQuiz AIの通知が正常に動作しています！', url: '/today' },
    );

    return NextResponse.json({ result });
  } catch (e) {
    console.error('[push/test]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
