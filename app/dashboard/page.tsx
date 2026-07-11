import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import ExamSection from './ExamSection';
import LogoutButton from './LogoutButton';
import HelpModal from '@/components/HelpModal';
import { dashboardHelp } from '@/lib/helpContent';
import GuideBanner from './GuideBanner';
import WeakAnalysisCard from './WeakAnalysisCard';
import StreakCard from './StreakCard';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import { getTitleInfo } from '@/lib/titleUtils';
import { getEffectivePlan, getPlanExpiry } from '@/lib/planUtils';

const FEATURE_CARDS = [
  { href: '/today',    icon: '📅', title: '今日の問題',    desc: '毎日5問で実力アップ' },
  { href: '/quiz',      icon: '⚡', title: '演習を始める',  desc: '科目・難易度を選んで演習' },
  { href: '/review',   icon: '🔁', title: '復習モード',    desc: '間違えた問題を再チャレンジ' },
  { href: '/cbt',      icon: '🎯', title: 'CBTモード',      desc: '医学部・薬学部・看護学部向けの模試形式' },
  { href: '/generate', icon: '✨', title: 'AI問題生成',    desc: '教材からAIが問題を自動作成' },
  { href: '/questions',icon: '📚', title: 'マイ問題集',    desc: '自分の問題をフォルダ管理' },
  { href: '/materials',icon: '📤', title: '教材管理',      desc: 'PDFや画像をアップロード' },
  { href: '/kokushi', icon: '📝', title: '国試モード',    desc: '国試形式の本格模試に挑戦' },
];

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
  mondayJST.setDate(todayJST.getDate() - (todayJST.getDay() === 0 ? 6 : todayJST.getDay() - 1));
  mondayJST.setHours(0, 0, 0, 0);
  for (const s of allSessions ?? []) {
    const d = toJSTDate(s.completed_at as string);
    const diffDays = Math.floor((d.getTime() - mondayJST.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays < 7) {
      weekDailyQuestions[diffDays] += s.total_questions as number;
    }
  }
  const titleInfo = getTitleInfo(totalQuestions);

  const profileSummary = [
    profile?.university,
    profile?.department,
    profile?.grade ? `${profile.grade}年生` : null,
  ].filter(Boolean).join(' ・ ');

  const isFirstTime = !profileSummary && (sessions?.length ?? 0) === 0;

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold text-sm sm:text-base">MediQuiz AI</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAdmin && (
            <Link href="/admin" className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">管理者</Link>
          )}
          <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600">設定</Link>
          <HelpModal steps={dashboardHelp.steps} pageTitle={dashboardHelp.pageTitle} />
          <LogoutButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <GuideBanner />

        {/* プロフィールカード */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/pricing"
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${plan === 'premium' ? 'bg-purple-100 text-purple-700' : plan === 'standard' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}
            >
              {plan === 'premium' ? '👑 プレミアム' : plan === 'standard' ? '⭐ 有料プラン' : '🔓 無料プラン'}
            </Link>
          </div>
          <Link href="/settings" className="group block bg-white rounded-2xl border p-4 sm:p-6 hover:border-green-300 hover:shadow-sm transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 group-hover:text-green-700 transition-colors leading-snug break-all">
                  こんにちは、{name.split(' ')[0]}さん 👋
                </h1>
                <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                  {profileSummary || '今日も一緒に頑張りましょう。プロフィールを設定しましょう →'}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 font-medium px-2.5 py-1 rounded-full">
                    {titleInfo.name} Lv.{titleInfo.level}
                  </span>
                  <span className="text-xs text-gray-400">累計 {totalQuestions}問</span>
                </div>
                <div className="mt-2 w-full sm:max-w-xs">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${titleInfo.progress}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">次のレベルまであと {titleInfo.nextLevelAt - totalQuestions}問</p>
                </div>
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400 group-hover:text-green-600 flex items-center gap-1 transition-colors self-start sm:self-auto">
                プロフィール編集 <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>

        {/* プラン残量（残り教材数・残り日数） */}
        {isUnlimited ? (
          <div className="mb-6 sm:mb-8 flex items-center gap-3 bg-white rounded-2xl border p-4 sm:p-5">
            <span className="text-2xl flex-shrink-0">♾️</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">AI問題生成は無制限でご利用いただけます</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {dbPlan === 'premium' ? 'プレミアムプラン' : '有料プラン'}特典
              </p>
            </div>
          </div>
        ) : (planExpiry || trialEndsAt) ? (
          <div className="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-gray-400 mb-1">残り教材生成数</p>
              {planExpiry ? (
                <>
                  <p className={`text-2xl sm:text-3xl font-semibold ${(credits ?? 0) <= 3 ? 'text-orange-500' : 'text-gray-900'}`}>
                    {credits ?? 0}<span className="text-base font-normal text-gray-400 ml-1">件</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(credits ?? 0) > 0 ? 'AI問題生成に使えます' : '料金ページで買い足せます'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-semibold text-gray-900">1日10回</p>
                  <p className="text-xs text-gray-400 mt-1">トライアル中の生成上限</p>
                </>
              )}
            </div>
            <div className="bg-white rounded-2xl border p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-gray-400 mb-1">プラン残り日数</p>
              <p className={`text-2xl sm:text-3xl font-semibold ${(remainingDays ?? 0) <= 3 ? 'text-orange-500' : 'text-gray-900'}`}>
                {remainingDays ?? 0}<span className="text-base font-normal text-gray-400 ml-1">日</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{expiryDateLabel} まで</p>
            </div>
          </div>
        ) : (
          <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
            <span className="text-lg flex-shrink-0">🔓</span>
            <p className="text-sm text-orange-800 flex-1">
              無料プランのAI問題生成は残り<span className="font-medium">{freeGenerateRemaining ?? 0}回</span>（通算{FREE_GENERATE_LIMIT}回まで）・保存は<span className="font-medium">30問</span>までです
            </p>
            <Link href="/pricing" className="text-xs text-orange-700 font-medium hover:underline whitespace-nowrap flex-shrink-0">
              アップグレード →
            </Link>
          </div>
        )}

        <AddToHomeScreen inline />

        {/* 初回ユーザー向けオンボーディング */}
        {isFirstTime && (
          <div className="mb-6 sm:mb-8 bg-green-50 border border-green-200 rounded-2xl p-5">
            <h2 className="font-semibold text-green-900 mb-1">👋 MediQuiz AIへようこそ！</h2>
            <p className="text-sm text-green-800 mb-4">教材がなくてもすぐ試せます。まずは1問解いてみましょう。</p>
            <Link href="/trial"
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-green-700 transition-colors mb-4">
              🎯 まず1問やってみる（教材アップロード不要）
            </Link>
            <p className="text-xs text-green-700 font-medium mb-2">慣れてきたら、こちらもおすすめです</p>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">1</span>
                <div>
                  <p className="text-sm font-medium text-green-900">教材をアップロードして自分専用の問題を作る</p>
                  <p className="text-xs text-green-700 mt-0.5">授業スライドや教科書の写真からAIが問題を自動生成します</p>
                  <Link href="/upload" className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">アップロードする →</Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">2</span>
                <div>
                  <p className="text-sm font-medium text-green-900">プロフィールを設定する</p>
                  <p className="text-xs text-green-700 mt-0.5">学部・目標国試を設定すると、AIが最適な問題を出してくれます</p>
                  <Link href="/settings" className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">設定する →</Link>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">3</span>
                <div>
                  <p className="text-sm font-medium text-green-900">今日の問題に挑戦する</p>
                  <p className="text-xs text-green-700 mt-0.5">毎日5問、AIが厳選した問題で実力を積み上げましょう</p>
                  <Link href="/today" className="text-xs text-green-600 font-medium hover:underline mt-1 inline-block">挑戦する →</Link>
                </div>
              </li>
            </ol>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <StreakCard
            current={streak.current}
            longest={streak.longest}
            todayDone={streak.todayDone}
            weekAccuracy={weekAccuracy}
            totalQuestions={totalQuestions}
            weekDailyQuestions={weekDailyQuestions}
          />
        </div>


        {/* 国試未設定バナー */}
        {(!profile?.target_exam || profile.target_exam === 'other') && (
          <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">📝</span>
            <p className="text-sm text-yellow-800 flex-1">
              目指している国試を設定すると、AIが最適な科目の問題を生成します
            </p>
            <Link href="/settings" className="text-xs text-yellow-700 font-medium hover:underline whitespace-nowrap flex-shrink-0">
              プロフィールを設定する →
            </Link>
          </div>
        )}

        {/* 機能カード 6枚 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {FEATURE_CARDS.map(card => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-2xl border p-4 sm:p-5 hover:border-green-300 hover:shadow-sm transition-all flex flex-col gap-2"
            >
              <span className="text-2xl">{card.icon}</span>
              <p className="font-semibold text-sm sm:text-base text-gray-900 leading-snug">{card.title}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{card.desc}</p>
            </Link>
          ))}
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">今週の学習問題数</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{hasWeekData ? weekQuestions : '--'}</p>
            <p className="text-xs text-gray-400 mt-1">{hasWeekData ? '問題解いてます！' : '今週はまだ演習していません'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">今週の正解率</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{weekAccuracy !== null ? `${weekAccuracy}%` : '--'}</p>
            <p className="text-xs text-gray-400 mt-1">{hasWeekData ? '頑張ってます！' : '今週はまだ演習していません'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">今週の演習回数</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{hasWeekData ? `${weekSessionCount}回` : '--'}</p>
            <p className="text-xs text-gray-400 mt-1">{hasWeekData ? '毎日続けよう🔥' : '今週はまだ演習していません'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">今週の最高正解率</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{weekBestAccuracy !== null ? `${weekBestAccuracy}%` : '--'}</p>
            <p className="text-xs text-gray-400 mt-1">{hasWeekData ? '自己ベストを更新しよう🏆' : '今週はまだ演習していません'}</p>
          </div>
        </div>

        {/* 苦手分野分析 */}
        {plan !== 'standard' && plan !== 'premium' ? (
          <div className="bg-white rounded-2xl border p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="font-semibold text-gray-900 mb-4">📊 苦手分野分析</h2>
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">有料プランの機能です</p>
              <Link href="/pricing"
                className="inline-block text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                アップグレードする →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6 sm:mb-8">
            {/* CBT */}
            <WeakAnalysisCard
              title="🎯 苦手分野分析（CBT）"
              stats={cbtStats}
              emptyMessage="CBTモードを行うと分析が表示されます"
              emptyLink="/cbt"
            />
            {/* 国試 */}
            <WeakAnalysisCard
              title="📝 苦手分野分析（国試）"
              stats={kokushiStats}
              emptyMessage="国試モードを行うと分析が表示されます"
              emptyLink="/kokushi"
            />
          </div>
        )}

        {/* 試験予定 / 最近の演習 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
          <ExamSection userId={user.id} initialExams={exams ?? []} />
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-4">最近の演習</h2>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map(session => {
                  const acc = Math.round((session.correct / session.total) * 100);
                  const modeLabel = session.mode === 'cbt' ? 'CBT' : session.mode === 'kokushi' ? '国試' : '演習';
                  const modeCls = session.mode === 'cbt' ? 'bg-blue-100 text-blue-600' : session.mode === 'kokushi' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500';
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="min-w-0 mr-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${modeCls}`}>{modeLabel}</span>
                          <p className="text-sm font-medium text-gray-900 truncate">{session.label}</p>
                        </div>
                        <p className="text-xs text-gray-400">{session.total}問</p>
                      </div>
                      <span className={`text-sm font-semibold flex-shrink-0 ${acc >= 80 ? 'text-green-600' : acc >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{acc}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">まだ演習履歴がありません</p>
                <Link href="/quiz" className="text-xs text-green-600 hover:underline mt-2 inline-block">演習を始める</Link>
              </div>
            )}
          </div>
        </div>

        {/* 教材一覧 */}
        <div className="bg-white rounded-2xl border p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">教材一覧</h2>
            <div className="flex items-center gap-3">
              <Link href="/materials" className="text-xs text-gray-400 hover:underline">管理・削除</Link>
              <Link href="/upload" className="text-xs text-green-600 hover:underline">+ 追加</Link>
            </div>
          </div>
          {materials && materials.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map(material => (
                <div key={material.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                    {material.file_type?.includes('pdf') ? '📄' : '🖼️'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words line-clamp-2">{material.title}</p>
                    {material.subject && <p className="text-xs text-gray-400">{material.subject}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">教材がまだありません</p>
              <Link href="/upload" className="text-xs text-green-600 hover:underline mt-2 inline-block">教材をアップロードする</Link>
            </div>
          )}
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 text-xs text-yellow-700">
          ⚠️ 本サービスのAI生成問題は学習補助を目的としており、内容の正確性を保証するものではありません。医療行為の判断には必ず公式テキスト・医療専門家の指示に従ってください。
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          お問い合わせはこちらまでメールをお送りください：
          <a href="mailto:harumaru0723@yahoo.co.jp" className="underline hover:text-gray-600">harumaru0723@yahoo.co.jp</a>
        </p>
      </div>
    </div>
    </>
  );
}
