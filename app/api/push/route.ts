import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const subscription = await request.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: '無効なサブスクリプション' }, { status: 400 });
    }

    const admin = createAdminClient();
    await admin.from('profiles').update({ push_subscription: subscription }).eq('id', user.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push] 登録エラー:', e);
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}
