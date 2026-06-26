import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification, type PushSubscription } from '@/lib/webpush';

export async function POST(request: NextRequest) {
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

  const result = await sendPushNotification(
    profile.push_subscription as PushSubscription,
    { title: '🔔 テスト通知', body: 'MediQuiz AIの通知が正常に動作しています！', url: '/today' },
  );

  return NextResponse.json({ result });
}
