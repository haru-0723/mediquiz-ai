import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { ADMIN_EMAIL } from '@/lib/constants';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 管理者チェック
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  // レポート一覧を取得
  const { data: reports } = await supabase
    .from('question_reports')
    .select(`
      *,
      questions (
        id,
        question,
        option_a,
        option_b,
        option_c,
        option_d,
        answer,
        explanation,
        subject,
        difficulty
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  return <AdminClient reports={reports ?? []} />;
}
