import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import {
  Stethoscope, Settings, GraduationCap, Award, Flame,
  CalendarCheck, Zap, RotateCcw, Target, Sparkles, BookMarked, Upload, ClipboardList,
  BookOpen, Repeat, Trophy, History, FileText, Image as ImageIcon, Library,
  AlertTriangle, Infinity as InfinityIcon, Lock,
} from 'lucide-react';
import ExamSection from './ExamSection';
import LogoutButton from './LogoutButton';
import HelpModal from '@/components/HelpModal';
import { dashboardHelp } from '@/lib/helpContent';
import GuideBanner from './GuideBanner';
import WeakAnalysisCard from './WeakAnalysisCard';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { getTitleInfo } from '@/lib/titleUtils';
import { getEffectivePlan, getPlanExpiry } from '@/lib/planUtils';

const FEATURE_CARDS = [
  { href: '/today',    icon: CalendarCheck, title: '今日の問題',    desc: '毎日5問で実力アップ',          tint: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { href: '/quiz',      icon: Zap,           title: '演習を始める',  desc: '科目・難易度を選んで演習',      tint: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { href: '/review',   icon: RotateCcw,     title: '復習モード',    desc: '間違えた問題を再チャレンジ',    tint: 'bg-sky-50',     iconColor: 'text-sky-600' },
  { href: '/cbt',      icon: Target,        title: 'CBTモード',      desc: '医・薬・看護向けの模試形式',    tint: 'bg-sky-50',     iconColor: 'text-sky-600' },
  { href: '/generate', icon: Sparkles,      title: 'AI問題生成',    desc: '教材からAIが問題を自動作成',    tint: 'bg-teal-50',    iconColor: 'text-teal-600' },
  { href: '/questions',icon: BookMarked,    title: 'マイ問題集',    desc: '自分の問題をフォルダ管理',      tint: 'bg-slate-100',  iconColor: 'text-slate-600' },
  { href: '/materials',icon: Upload,        title: '教材管理',      desc: 'PDFや画像をアップロード',        tint: 'bg-slate-100',  iconColor: 'text-slate-600' },
  { href: '/kokushi',  icon: ClipboardList, title: '国試モード',    desc: '国試形式の本格模試に挑戦',      tint: 'bg-teal-50',    iconColor: 'text-teal-600' },
];

const PLAN_LABEL: Record<string, string> = { free: '無料プラン', standard: '有料プラン', premium: 'プレミアム' };

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const name = user.user_metadata?.name ?? user.email ?? '';

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, trial_ends_at, plan_expires_at, generate_credits, university, department, grade, target_exam')
    .eq('id', user.id)
    .single();

  const plan = getEffectivePlan(profile);
  const isAdmin = user.email === ADMIN_EMAIL;

  // プラン残量（残り教材数・残り日数）の算出
  const dbPlan = profile?.plan ?? 'free';
  const planExpiry = getPlanExpiry(profile); // 買い切りパックの有効期限（ISO or null）
  const trialEndsAt = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date()
    ? profile.trial_ends_at : null;
  const credits = typeof profile?.generate_credits === 'number' ? profile.generate_credits : null;
  // premium / 手動付与standard（期限なし）は無制限
  const isUnlimited = dbPlan === 'premium' || (dbPlan === 'standard' && !planExpiry);
  // 残り日数のカウント元（パック優先、なければトライアル）
  const expirySource = planExpiry ?? trialEndsAt;
  const remainingDays = expirySource
    ? Math.max(0, Math.ceil((new Date(expirySource).getTime() - Date.now()) / 86400000))
    : null;
  const expiryDateLabel = expirySource
    ? new Date(expirySource).toLocaleDateString('ja-JP')
    : null;

  // 今週の月曜日 00:00:00 を算出
  const now = new Date();
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString();

  const isFreePlan = plan === 'free';

  const [
    { data: exams },
    { data: sessions },
    { data: weekSessions },
    { data: allSessions },
    { data: materials },
    { count: freeGenerateCount },
  ] = await Promise.all([
    supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date'),
    supabase.from('quiz_sessions').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(50),
    supabase.from('quiz_sessions').select('correct_count, total_questions').eq('user_id', user.id).gte('completed_at', weekStart),
    supabase.from('quiz_sessions').select('subject, correct_count, total_questions, mode, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(200),
    supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    isFreePlan
      ? supabase.from('generate_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      : Promise.resolve({ count: null }),
  ]);

  const FREE_GENERATE_LIMIT = 5;
  const freeGenerateRemaining = isFreePlan
    ? Math.max(0, FREE_GENERATE_LIMIT - (freeGenerateCount ?? 0))
    : null;

  const weekQuestions = weekSessions?.reduce((s, r) => s + r.total_questions, 0) ?? 0;
  const weekCorrect = weekSessions?.reduce((s, r) => s + r.correct_count, 0) ?? 0;
  const weekAccuracy = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : null;
  const weekBestAccuracy = weekSessions && weekSessions.length > 0
    ? Math.max(...weekSessions.map(s => Math.round((s.correct_count / s.total_questions) * 100)))
    : null;
  const weekSessionCount = weekSessions?.length ?? 0;
  const hasWeekData = weekSessionCount > 0;

  // 最近の演習（CBT・国試は同一分にまとめて1件扱い）
  type SessionEntry = { id: string; label: string; mode: string; total: number; correct: number; completedAt: string };
  const recentSessions: SessionEntry[] = [];
  const seen = new Set<string>();
  for (const s of sessions ?? []) {
    const mode = (s.mode as string | null) ?? 'quiz';
    if (mode === 'quiz') {
      recentSessions.push({ id: s.id, label: s.subject ?? '演習', mode, total: s.total_questions, correct: s.correct_count, completedAt: s.completed_at });
    } else {
      const key = mode + '_' + (s.completed_at as string).slice(0, 16);
      if (!seen.has(key)) {
        seen.add(key);
        const group = (sessions ?? []).filter(r => ((r.mode as string | null) ?? 'quiz') === mode && (r.completed_at as string).slice(0, 16) === (s.completed_at as string).slice(0, 16));
        const total = group.reduce((a, r) => a + r.total_questions, 0);
        const correct = group.reduce((a, r) => a + r.correct_count, 0);
        recentSessions.push({ id: key, label: mode === 'cbt' ? 'CBT演習' : '国試演習', mode, total, correct, completedAt: s.completed_at });
      }
    }
    if (recentSessions.length >= 5) break;
  }

  // 科目別正解率（mode別）
  function buildSubjectStats(sessions: typeof allSessions, modes: string[]) {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const s of sessions ?? []) {
      if (!modes.includes((s.mode as string | null) ?? 'quiz')) continue;
      const subj = (s.subject as string | null) ?? 'その他';
      if (!map[subj]) map[subj] = { correct: 0, total: 0 };
      map[subj].correct += s.correct_count as number;
      map[subj].total += s.total_questions as number;
    }
    return Object.entries(map)
      .map(([subject, { correct, total }]) => ({
        subject,
        accuracy: Math.round((correct / total) * 100),
        total,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }
  const cbtStats = buildSubjectStats(allSessions, ['cbt']);
  const kokushiStats = buildSubjectStats(allSessions, ['kokushi']);

  // ストリーク計算（JST基準）
  function calcStreak(sessions: typeof allSessions) {
    if (!sessions || sessions.length === 0) return { current: 0, longest: 0, todayDone: false };
    const toJSTDate = (iso: string) => {
      const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    };
    const dates = Array.from(new Set(sessions.map(s => toJSTDate(s.completed_at as string)))).sort().reverse();
    const todayJST = toJSTDate(new Date().toISOString());
    const todayDone = dates[0] === todayJST;
    let current = 0;
    let longest = 0;
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        const diff = (new Date(todayJST).getTime() - new Date(dates[0]).getTime()) / 86400000;
        if (diff > 1) { longest = Math.max(longest, streak); streak = 1; current = 0; }
        else streak = 1;
      } else {
        const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86400000;
        if (diff === 1) streak++;
        else { longest = Math.max(longest, streak); streak = 1; }
      }
      if (i === 0 && todayDone) current = streak;
      else if (i === 0) current = 0;
    }
    longest = Math.max(longest, streak);
    if (todayDone) current = streak;
    return { current, longest, todayDone };
  }
  const streak = calcStreak(allSessions);
  const totalQuestions = (allSessions ?? []).reduce((s, r) => s + (r.total_questions as number), 0);

  // 今週（月〜日）の日別問題数
  const weekDailyQuestions: number[] = Array(7).fill(0);
  const toJSTDate = (iso: string) => {
    const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
    return d;
  };
  const todayJST = toJSTDate(new Date().toISOString());
  const mondayJST = new Date(todayJST);
  mondayJST.setUTCDate(todayJST.getUTCDate() - (todayJST.getUTCDay() === 0 ? 6 : todayJST.getUTCDay() - 1));
  mondayJST.setUTCHours(0, 0, 0, 0);
  for (const s of allSessions ?? []) {
    const d = toJSTDate(s.completed_at as string);
    const diffDays = Math.floor((d.getTime() - mondayJST.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      weekDailyQuestions[diffDays] += s.total_questions as number;
    }
  }
  const todayIdx = todayJST.getUTCDay() === 0 ? 6 : todayJST.getUTCDay() - 1;
  const titleInfo = getTitleInfo(totalQuestions);
  const weekLabels = ['月', '火', '水', '木', '金', '土', '日'];

  const profileSummary = [
    profile?.university,
    profile?.department,
    profile?.grade ? `${profile.grade}年生` : null,
  ].filter(Boolean).join(' ・ ');

  const isFirstTime = !profileSummary && (sessions?.length ?? 0) === 0;

  const statCards = [
    { label: '今週の学習問題数', value: hasWeekData ? `${weekQuestions}` : '--', hint: hasWeekData ? '問 解答' : '今週はまだ演習していません', icon: BookOpen },
    { label: '今週の正解率',     value: weekAccuracy !== null ? `${weekAccuracy}%` : '--', hint: hasWeekData ? '頑張ってます！' : '今週はまだ演習していません', icon: Target },
    { label: '今週の演習回数',   value: hasWeekData ? `${weekSessionCount}` : '--', hint: hasWeekData ? '回 実施' : '今週はまだ演習していません', icon: Repeat },
    { label: '今週の最高正解率', value: weekBestAccuracy !== null ? `${weekBestAccuracy}%` : '--', hint: hasWeekData ? '自己ベスト更新中🏆' : '今週はまだ演習していません', icon: Trophy },
  ];

  const modeStyle: Record<string, { label: string; cls: string }> = {
    quiz: { label: '演習', cls: 'bg-slate-100 text-slate-600' },
    cbt: { label: 'CBT', cls: 'bg-sky-100 text-sky-700' },
    kokushi: { label: '国試', cls: 'bg-teal-100 text-teal-700' },
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* トップナビ */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600">
              <Stethoscope className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              MediQuiz<span className="text-emerald-600"> AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Link href="/admin" className="mr-1 rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600">管理者</Link>
            )}
            <HelpModal steps={dashboardHelp.steps} pageTitle={dashboardHelp.pageTitle} />
            <Link href="/settings" aria-label="設定"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <Settings className="h-5 w-5" strokeWidth={2} />
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">

          {/* グリーティング + ストリーク */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/pricing"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      plan === 'premium' ? 'bg-purple-50 text-purple-700' :
                      plan === 'standard' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-orange-50 text-orange-600'
                    }`}>
                    <GraduationCap className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {PLAN_LABEL[plan]}
                  </Link>
                  {profileSummary && <span className="truncate text-xs text-slate-400">{profileSummary}</span>}
                </div>

                <Link href="/settings" className="group mt-3 block">
                  <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 sm:text-[28px]">
                    おかえりなさい、{name.split(' ')[0]}さん
                  </h1>
                  {!profileSummary && (
                    <p className="mt-1 text-sm text-slate-500">プロフィールを設定しましょう →</p>
                  )}
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <Award className="h-4 w-4 text-amber-500" strokeWidth={2.2} />
                  <span className="font-medium text-slate-900">{titleInfo.name}</span>
                  <span className="text-slate-300">·</span>
                  <span>Lv.{titleInfo.level}</span>
                  <span className="text-slate-300">·</span>
                  <span>累計 {totalQuestions.toLocaleString()} 問</span>
                </div>

                <div className="mt-3 max-w-md">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${titleInfo.progress}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">次のレベルまで あと {titleInfo.nextLevelAt - totalQuestions} 問</p>
                </div>
              </div>

              {/* ストリーク */}
              <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:min-w-[260px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100">
                      <Flame className="h-5 w-5 text-orange-500" strokeWidth={2.2} />
                    </span>
                    <div>
                      <p className="text-xl font-bold leading-none text-slate-900">{streak.current}日</p>
                      <p className="mt-0.5 text-xs text-slate-500">{streak.todayDone ? '連続学習中' : '今日はまだ'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">最長 {streak.longest}日</p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-1">
                  {weekLabels.map((label, i) => {
                    const q = weekDailyQuestions[i];
                    const done = q > 0;
                    const isToday = i === todayIdx;
                    const future = i > todayIdx;
                    return (
                      <div key={label} className="flex flex-1 flex-col items-center gap-1">
                        <span className={[
                          'flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-colors',
                          done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-300 ring-1 ring-slate-200',
                          isToday && !done ? 'ring-2 ring-emerald-300' : '',
                          future ? 'opacity-40' : '',
                        ].join(' ')}>
                          {done ? q : ''}
                        </span>
                        <span className={`text-[10px] ${isToday ? 'font-semibold text-emerald-600' : 'text-slate-400'}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* プラン残量 */}
          {isUnlimited ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <InfinityIcon className="h-5 w-5 text-emerald-600" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">AI問題生成は無制限でご利用いただけます</p>
                <p className="mt-0.5 text-xs text-slate-400">{dbPlan === 'premium' ? 'プレミアムプラン' : '有料プラン'}特典</p>
              </div>
            </div>
          ) : (planExpiry || trialEndsAt) ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">残り教材生成数</p>
                {planExpiry ? (
                  <>
                    <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${(credits ?? 0) <= 3 ? 'text-orange-500' : 'text-slate-900'}`}>
                      {credits ?? 0}<span className="ml-1 text-base font-normal text-slate-400">件</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{(credits ?? 0) > 0 ? 'AI問題生成に使えます' : '料金ページで買い足せます'}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">1日10回</p>
                    <p className="mt-1 text-xs text-slate-400">トライアル中の生成上限</p>
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-medium text-slate-500">プラン残り日数</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${(remainingDays ?? 0) <= 3 ? 'text-orange-500' : 'text-slate-900'}`}>
                  {remainingDays ?? 0}<span className="ml-1 text-base font-normal text-slate-400">日</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">{expiryDateLabel} まで</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 sm:items-center">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center sm:mt-0">
                <Lock className="h-4 w-4 text-orange-500" strokeWidth={2} />
              </span>
              <p className="flex-1 text-sm text-orange-800">
                無料プランのAI問題生成は残り<span className="font-semibold">{freeGenerateRemaining ?? 0}回</span>（通算{FREE_GENERATE_LIMIT}回まで）・保存は<span className="font-semibold">30問</span>まで
              </p>
              <Link href="/pricing" className="whitespace-nowrap text-xs font-medium text-orange-700 hover:underline">アップグレード →</Link>
            </div>
          )}

          {/* 初回オンボーディング */}
          {isFirstTime && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="mb-1 font-semibold text-emerald-900">👋 MediQuiz AIへようこそ！</h2>
              <p className="mb-4 text-sm text-emerald-800">教材がなくてもすぐ試せます。まずは1問解いてみましょう。</p>
              <Link href="/trial"
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                🎯 まず1問やってみる（教材アップロード不要）
              </Link>
              <p className="mb-2 text-xs font-medium text-emerald-700">慣れてきたら、こちらもおすすめです</p>
              <ol className="space-y-3">
                {[
                  { n: 1, title: '教材をアップロードして自分専用の問題を作る', desc: '授業スライドや教科書の写真からAIが問題を自動生成します', href: '/upload', cta: 'アップロードする →' },
                  { n: 2, title: 'プロフィールを設定する', desc: '学部・目標国試を設定すると、AIが最適な問題を出してくれます', href: '/settings', cta: '設定する →' },
                  { n: 3, title: '今日の問題に挑戦する', desc: '毎日5問、AIが厳選した問題で実力を積み上げましょう', href: '/today', cta: '挑戦する →' },
                ].map(step => (
                  <li key={step.n} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-medium text-white">{step.n}</span>
                    <div>
                      <p className="text-sm font-medium text-emerald-900">{step.title}</p>
                      <p className="mt-0.5 text-xs text-emerald-700">{step.desc}</p>
                      <Link href={step.href} className="mt-1 inline-block text-xs font-medium text-emerald-600 hover:underline">{step.cta}</Link>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <AddToHomeScreen inline />
          <GuideBanner />

          {/* 国試未設定バナー */}
          {(!profile?.target_exam || profile.target_exam === 'other') && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:items-center">
              <span className="text-lg">📝</span>
              <p className="flex-1 text-sm text-amber-800">目指している国試を設定すると、AIが最適な科目の問題を生成します</p>
              <Link href="/settings" className="whitespace-nowrap text-xs font-medium text-amber-700 hover:underline">設定する →</Link>
            </div>
          )}

          {/* 学習メニュー */}
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">学習メニュー</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {FEATURE_CARDS.map(card => {
                const Icon = card.icon;
                return (
                  <Link key={card.href} href={card.href}
                    className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-sm sm:p-5">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tint}`}>
                      <Icon className={`h-5 w-5 ${card.iconColor}`} strokeWidth={2} />
                    </span>
                    <div className="mt-1">
                      <p className="text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">{card.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{card.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 今週のサマリー */}
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">今週のサマリー</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {statCards.map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                      <p className="text-xs font-medium text-slate-500">{s.label}</p>
                    </div>
                    <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{s.value}</p>
                    <p className="mt-1 text-xs text-slate-400">{s.hint}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 苦手分野分析 */}
          {plan !== 'standard' && plan !== 'premium' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900">苦手分野分析</h2>
              </div>
              <div className="rounded-xl bg-slate-50 py-8 text-center">
                <p className="text-sm text-slate-500">有料プランで科目別の弱点を可視化できます</p>
                <Link href="/pricing"
                  className="mt-3 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700">
                  アップグレードする →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <WeakAnalysisCard title="苦手分野分析（CBT）" stats={cbtStats} emptyMessage="CBTモードを行うと分析が表示されます" emptyLink="/cbt" />
              <WeakAnalysisCard title="苦手分野分析（国試）" stats={kokushiStats} emptyMessage="国試モードを行うと分析が表示されます" emptyLink="/kokushi" />
            </div>
          )}

          {/* 試験カウントダウン / 最近の演習 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExamSection userId={user.id} initialExams={exams ?? []} />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900">最近の演習</h2>
              </div>
              {recentSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {recentSessions.map(session => {
                    const acc = Math.round((session.correct / session.total) * 100);
                    const accColor = acc >= 80 ? 'text-emerald-600' : acc >= 60 ? 'text-amber-600' : 'text-rose-500';
                    const ms = modeStyle[session.mode] ?? modeStyle.quiz;
                    return (
                      <div key={session.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${ms.cls}`}>{ms.label}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{session.label}</p>
                            <p className="text-xs text-slate-400">{session.total}問</p>
                          </div>
                        </div>
                        <span className={`text-sm font-bold tabular-nums ${accColor}`}>{acc}%</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-slate-400">まだ演習履歴がありません</p>
                  <Link href="/quiz" className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline">演習を始める →</Link>
                </div>
              )}
            </div>
          </div>

          {/* 教材一覧 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Library className="h-4 w-4 text-slate-500" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900">教材一覧</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Link href="/materials" className="text-slate-400 hover:text-slate-600 hover:underline">管理・削除</Link>
                <Link href="/upload" className="font-medium text-emerald-600 hover:underline">+ 追加</Link>
              </div>
            </div>
            {materials && materials.length > 0 ? (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {materials.map(material => {
                  const isPdf = material.file_type?.includes('pdf');
                  const Icon = isPdf ? FileText : ImageIcon;
                  return (
                    <div key={material.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isPdf ? 'bg-rose-50 text-rose-500' : 'bg-sky-50 text-sky-500'}`}>
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-slate-900">{material.title}</p>
                        {material.subject && <p className="text-xs text-slate-400">{material.subject}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-400">教材がまだありません</p>
                <Link href="/upload" className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline">教材をアップロードする →</Link>
              </div>
            )}
          </div>

          {/* 注意書き */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" strokeWidth={2} />
            <p className="text-xs leading-relaxed text-amber-700">
              本サービスのAI生成問題は学習補助を目的としており、内容の正確性を保証するものではありません。医療行為の判断には必ず公式テキスト・医療専門家の指示に従ってください。
            </p>
          </div>

          <p className="text-center text-xs text-slate-400">
            お問い合わせはこちらまで：
            <a href="mailto:harumaru0723@yahoo.co.jp" className="underline hover:text-slate-600">harumaru0723@yahoo.co.jp</a>
          </p>
        </div>
      </main>
    </div>
  );
}
