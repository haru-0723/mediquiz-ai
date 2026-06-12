import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { ADMIN_EMAIL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export type UsageStats = {
  generateTotal: number;
  cbtTotal: number;
  kokushiTotal: number;
  generateMonth: number;
  cbtMonth: number;
  kokushiMonth: number;
  topUsers: Array<{
    userId: string;
    sessions: number;
    questions: number;
    correct: number;
  }>;
};

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard');
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStr = startOfMonth.toISOString();

  const [
    { data: reports },
    { count: generateTotal },
    { count: cbtTotal },
    { count: generateMonth },
    { count: cbtMonth },
    { data: allSessions },
  ] = await Promise.all([
    supabase
      .from('question_reports')
      .select('*, questions(id,question,option_a,option_b,option_c,option_d,answer,explanation,subject,difficulty)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('generate_logs').select('*', { count: 'exact', head: true }),
    supabase.from('cbt_logs').select('*', { count: 'exact', head: true }),
    supabase.from('generate_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
    supabase.from('cbt_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
    supabase.from('quiz_sessions').select('user_id, total_questions, correct_count').limit(10000),
  ]);

  // kokushi_logs はテーブルが存在しない場合もあるので個別に取得
  let kokushiTotal = 0, kokushiMonth = 0;
  const kokushiTotalRes = await supabase.from('kokushi_logs').select('*', { count: 'exact', head: true });
  if (!kokushiTotalRes.error) {
    kokushiTotal = kokushiTotalRes.count ?? 0;
    const monthRes = await supabase.from('kokushi_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr);
    kokushiMonth = monthRes.count ?? 0;
  }

  // quiz_sessions からユーザーごとの演習回数・問題数・正解数を集計
  const sessionStats: Record<string, { sessions: number; questions: number; correct: number }> = {};
  for (const s of allSessions ?? []) {
    if (!sessionStats[s.user_id]) sessionStats[s.user_id] = { sessions: 0, questions: 0, correct: 0 };
    sessionStats[s.user_id].sessions++;
    sessionStats[s.user_id].questions += s.total_questions as number;
    sessionStats[s.user_id].correct += s.correct_count as number;
  }
  const topUsers = Object.entries(sessionStats)
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const usageStats: UsageStats = {
    generateTotal: generateTotal ?? 0,
    cbtTotal: cbtTotal ?? 0,
    kokushiTotal,
    generateMonth: generateMonth ?? 0,
    cbtMonth: cbtMonth ?? 0,
    kokushiMonth,
    topUsers,
  };

  return <AdminClient reports={reports ?? []} usageStats={usageStats} />;
}
