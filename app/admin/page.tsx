import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { ADMIN_EMAIL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export type TopUser = {
  userId: string;
  generate: number;
  cbt: number;
  kokushi: number;
  total: number;
  university: string | null;
  department: string | null;
  grade: number | null;
  plan: string | null;
};

export type UsageStats = {
  generateTotal: number;
  cbtTotal: number;
  kokushiTotal: number;
  generateMonth: number;
  cbtMonth: number;
  kokushiMonth: number;
  totalUsers: number;
  topUsers: TopUser[];
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
    { data: allProfiles },
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
    supabase.from('profiles').select('id, university, department, grade, plan').limit(1000),
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
    kokushiLogs = (logsRes.data ?? []) as { user_id: string }[];
  }

  // profiles を起点に全ユーザーの利用回数を集計
  const profileMap = Object.fromEntries(
    (allProfiles ?? []).map(p => [p.id, p])
  );

  // 全 profiles ユーザーを 0 カウントで初期化
  const userStats: Record<string, { generate: number; cbt: number; kokushi: number }> = {};
  for (const p of allProfiles ?? []) {
    userStats[p.id] = { generate: 0, cbt: 0, kokushi: 0 };
  }

  // generate_logs を user_id ごとに集計
  for (const log of generateLogs ?? []) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].generate++;
  }

  // cbt_logs を user_id ごとに集計
  for (const log of cbtLogs ?? []) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].cbt++;
  }

  // kokushi_logs を user_id ごとに集計
  for (const log of kokushiLogs) {
    if (!userStats[log.user_id]) userStats[log.user_id] = { generate: 0, cbt: 0, kokushi: 0 };
    userStats[log.user_id].kokushi++;
  }

  // 合計利用回数でソートして上位10名を取得
  const topUsers: TopUser[] = Object.entries(userStats)
    .map(([userId, counts]) => ({
      userId,
      ...counts,
      total: counts.generate + counts.cbt + counts.kokushi,
      university: profileMap[userId]?.university ?? null,
      department: profileMap[userId]?.department ?? null,
      grade: profileMap[userId]?.grade ?? null,
      plan: profileMap[userId]?.plan ?? null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const usageStats: UsageStats = {
    generateTotal: generateTotal ?? 0,
    cbtTotal: cbtTotal ?? 0,
    kokushiTotal,
    generateMonth: generateMonth ?? 0,
    cbtMonth: cbtMonth ?? 0,
    kokushiMonth,
    totalUsers: allProfiles?.length ?? 0,
    topUsers,
  };

  return <AdminClient reports={reports ?? []} usageStats={usageStats} />;
}
