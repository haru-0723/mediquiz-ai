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

export type FunnelStats = {
  registered: number;
  generatedAttempt: number; // generate_logs に記録された生成試行者数（無料/トライアルの日次カウントのみ。有料パック/プレミアムはログなしのため不含）
  saved: number;    // questions テーブルに1件以上保存があるユーザー数
  quizzed: number;  // quiz_sessions に1件以上あるユーザー数
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
  funnel: FunnelStats;
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

  // 活性化ファネル（登録→生成試行→保存→クイズ）用の集計
  const [
    { data: questionUserRows, error: questionUserErr },
    { data: quizUserRows, error: quizUserErr },
  ] = await Promise.all([
    admin.from('questions').select('user_id').limit(100000),
    admin.from('quiz_sessions').select('user_id').limit(100000),
  ]);
  if (questionUserErr) console.error('[Admin] questions user_id fetch error:', questionUserErr);
  if (quizUserErr) console.error('[Admin] quiz_sessions user_id fetch error:', quizUserErr);

  if (genTotalErr) console.error('[Admin] generate_logs count error:', genTotalErr);
  if (cbtTotalErr) console.error('[Admin] cbt_logs count error:', cbtTotalErr);
  if (profilesErr) console.error('[Admin] profiles error:', profilesErr);
  if (genLogsErr) console.error('[Admin] generate_logs fetch error:', genLogsErr);
  if (cbtLogsErr) console.error('[Admin] cbt_logs fetch error:', cbtLogsErr);

  const uniqueGenerateUserIds = Array.from(new Set((generateLogs ?? []).map(l => l.user_id)));

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

  const savedUserIds = new Set((questionUserRows ?? []).map(r => r.user_id));
  const quizzedUserIds = new Set((quizUserRows ?? []).map(r => r.user_id));

  const funnel: FunnelStats = {
    registered: allProfiles?.length ?? 0,
    generatedAttempt: uniqueGenerateUserIds.length,
    saved: savedUserIds.size,
    quizzed: quizzedUserIds.size,
  };

  const usageStats: UsageStats = {
    generateTotal: generateTotal ?? 0,
    cbtTotal: cbtTotal ?? 0,
    kokushiTotal,
    generateMonth: generateMonth ?? 0,
    cbtMonth: cbtMonth ?? 0,
    kokushiMonth,
    totalUsers: allProfiles?.length ?? 0,
    topUsers,
    funnel,
  };

  return <AdminClient reports={reports ?? []} usageStats={usageStats} />;
}
