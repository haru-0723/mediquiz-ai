import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';
import { ADMIN_EMAIL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export type TopUser = {
  userId: string;
  name: string | null;
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

  const admin = createAdminClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthStr = startOfMonth.toISOString();

  const [
    { data: reports },
    { count: generateTotal, error: genTotalErr },
    { count: cbtTotal, error: cbtTotalErr },
    { count: generateMonth },
    { count: cbtMonth },
    { data: allProfiles, error: profilesErr },
    { data: generateLogs, error: genLogsErr },
    { data: cbtLogs, error: cbtLogsErr },
  ] = await Promise.all([
    admin
      .from('question_reports')
      .select('*, questions(id,question,option_a,option_b,option_c,option_d,answer,explanation,subject,difficulty)')
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('generate_logs').select('*', { count: 'exact', head: true }),
    admin.from('cbt_logs').select('*', { count: 'exact', head: true }),
    admin.from('generate_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
    admin.from('cbt_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
    admin.from('profiles').select('id, name, university, department, grade, plan').limit(5000),
    admin.from('generate_logs').select('user_id').limit(50000),
    admin.from('cbt_logs').select('user_id').limit(50000),
  ]);

  if (genTotalErr) console.error('[Admin] generate_logs count error:', genTotalErr);
  if (cbtTotalErr) console.error('[Admin] cbt_logs count error:', cbtTotalErr);
  if (profilesErr) console.error('[Admin] profiles error:', profilesErr);
  if (genLogsErr) console.error('[Admin] generate_logs fetch error:', genLogsErr);
  if (cbtLogsErr) console.error('[Admin] cbt_logs fetch error:', cbtLogsErr);

  const uniqueGenerateUserIds = Array.from(new Set((generateLogs ?? []).map(l => l.user_id)));
  const uniqueCbtUserIds = Array.from(new Set((cbtLogs ?? []).map(l => l.user_id)));
  console.log('[Admin] generate_logs 総件数:', generateLogs?.length ?? 0, '/ ユニークユーザー数:', uniqueGenerateUserIds.length);
  console.log('[Admin] cbt_logs 総件数:', cbtLogs?.length ?? 0, '/ ユニークユーザー数:', uniqueCbtUserIds.length);
  console.log('[Admin] profiles 総件数:', allProfiles?.length ?? 0);
  console.log('[Admin] generate_logs ユーザーID(先頭10件):', uniqueGenerateUserIds.slice(0, 10));

  let kokushiTotal = 0, kokushiMonth = 0;
  let kokushiLogs: { user_id: string }[] = [];
  const kokushiTotalRes = await admin.from('kokushi_logs').select('*', { count: 'exact', head: true });
  if (!kokushiTotalRes.error) {
    kokushiTotal = kokushiTotalRes.count ?? 0;
    const [monthRes, logsRes] = await Promise.all([
      admin.from('kokushi_logs').select('*', { count: 'exact', head: true }).gte('created_at', monthStr),
      admin.from('kokushi_logs').select('user_id').limit(50000),
    ]);
    kokushiMonth = monthRes.count ?? 0;
    kokushiLogs = (logsRes.data ?? []) as { user_id: string }[];
  }
  console.log('[Admin] kokushi_logs 総件数:', kokushiTotal);

  const profileMap = Object.fromEntries(
    (allProfiles ?? []).map(p => [p.id, p])
  );

  const userStats: Record<string, { generate: number; cbt: number; kokushi: number }> = {};
  for (const p of allProfiles ?? []) {
    userStats[p.id] = { generate: 0, cbt: 0, kokushi: 0 };
  }

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

  const topUsers: TopUser[] = Object.entries(userStats)
    .map(([userId, counts]) => ({
      userId,
      name: profileMap[userId]?.name ?? null,
      ...counts,
      total: counts.generate + counts.cbt + counts.kokushi,
      university: profileMap[userId]?.university ?? null,
      department: profileMap[userId]?.department ?? null,
      grade: profileMap[userId]?.grade ?? null,
      plan: profileMap[userId]?.plan ?? null,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  console.log('[Admin] ランキング上位10名:', topUsers.map(u => ({
    userId: u.userId.slice(0, 8),
    name: u.name,
    total: u.total,
    generate: u.generate,
    cbt: u.cbt,
  })));

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
