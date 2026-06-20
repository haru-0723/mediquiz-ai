import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_EMAIL } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 });
  }

  const { questionId, updates } = await request.json();
  if (!questionId || !updates) {
    return NextResponse.json({ error: '不正なリクエスト' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('questions').update({
    question: updates.question,
    option_a: updates.option_a,
    option_b: updates.option_b,
    option_c: updates.option_c,
    option_d: updates.option_d,
    answer: updates.answer,
    explanation: updates.explanation,
  }).eq('id', questionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
