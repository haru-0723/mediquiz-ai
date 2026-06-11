import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { ADMIN_EMAIL } from '@/lib/constants';

export type UsageStats = {
  generateTotal: number;
  cbtTotal: number;
  kokushiTotal: number;
  generateMonth: number;
  cbtMonth: number;
  kokushiMonth: number;
  topUsers: Array<{
    userId: string;
    generate: number;
    cbt: number;
    kokushi: number;
    total: number;
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
    { data: generateLogs },
    { data: cbtLogs },
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
    supabase.from('generate_logs').select('user_id').limit(10000),
    supabase.from('cbt_logs').select('user_id').limit(10000),
  ]);

  // kokushi_logs はテーブルが存在しない場合もあるので個別に取得
  let kokushiTotal = 0, kokushiMonth = 0;
  let kokushiLogs: { user_id: string }[] = [];
  const kokushiTotalRes = await supabase.from('kokushi_logs').select('*', { count: 'exact', head: true });
  if (!kokushiTotalRes.error) {
    kokushiTotal = kokushiTotalRes.count ?? 0;
    const [monthRes, logsRes] = await Promise.all([
      supabase.from('kokushi_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
      supabase.from('kokushi_logs').select('user_id').limit(10000),
    ]);
    kokushiMonth = monthRes.count ?? 0;
    kokushiLogs = logsRes.data ?? [];
  }

  // ユーザーごとの利用回数を集計
  const userStats: Record<string, { generate: number; cbt: number; kokushi: number }> = {};
  for (const log of generateLogs ?? []) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].generate++;
  }
  for (const log of cbtLogs ?? []) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].cbt++;
  }
  for (const log of kokushiLogs) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].kokushi++;
  }
  const topUsers = Object.entries(userStats)
    .map(([userId, counts]) => ({ userId, ...counts, total: counts.generate + counts.cbt + counts.kokushi }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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
