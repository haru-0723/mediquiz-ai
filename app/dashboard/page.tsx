import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ADMIN_EMAIL } from '@/lib/constants';
import Link from 'next/link';
import ExamSection from './ExamSection';
import LogoutButton from './LogoutButton';
import HelpModal from '@/components/HelpModal';
import { dashboardHelp } from '@/lib/helpContent';
import GuideBanner from './GuideBanner';
import AddToHomeScreen from '@/components/AddToHomeScreen';

const FEATURE_CARDS = [
  { href: '/quiz',      icon: '⚡', title: '演習を始める',  desc: '科目・難易度を選んで演習' },
  { href: '/review',   icon: '🔁', title: '復習モード',    desc: '間違えた問題を再チャレンジ' },
  { href: '/cbt',      icon: '🎯', title: 'CBTモード',      desc: '本番形式で実力を測る' },
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
    .select('plan, university, department, grade')
    .eq('id', user.id)
    .single();

  const plan = profile?.plan ?? 'free';
  const isAdmin = user.email === ADMIN_EMAIL;

  // 今週の月曜日 00:00:00 を算出
  const now = new Date();
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const weekStart = monday.toISOString();

  const [
    { data: exams },
    { data: sessions },
    { data: weekSessions },
    { data: allSessions },
    { data: materials },
  ] = await Promise.all([
    supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date'),
    supabase.from('quiz_sessions').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5),
    supabase.from('quiz_sessions').select('correct_count, total_questions').eq('user_id', user.id).gte('completed_at', weekStart),
    supabase.from('quiz_sessions').select('subject, correct_count, total_questions').eq('user_id', user.id).limit(500),
    supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);

  const weekQuestions = weekSessions?.reduce((s, r) => s + r.total_questions, 0) ?? 0;
  const weekCorrect = weekSessions?.reduce((s, r) => s + r.correct_count, 0) ?? 0;
  const weekAccuracy = weekQuestions > 0 ? Math.round((weekCorrect / weekQuestions) * 100) : null;
  const weekBestAccuracy = weekSessions && weekSessions.length > 0
    ? Math.max(...weekSessions.map(s => Math.round((s.correct_count / s.total_questions) * 100)))
    : null;
  const weekSessionCount = weekSessions?.length ?? 0;
  const hasWeekData = weekSessionCount > 0;

  // 科目別正解率
  const subjectMap: Record<string, { correct: number; total: number }> = {};
  for (const s of allSessions ?? []) {
    const subj = (s.subject as string | null) ?? 'その他';
    if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
    subjectMap[subj].correct += s.correct_count as number;
    subjectMap[subj].total += s.total_questions as number;
  }
  const subjectStats = Object.entries(subjectMap)
    .map(([subject, { correct, total }]) => ({
      subject,
      accuracy: Math.round((correct / total) * 100),
      total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);
  const profileSummary = [
    profile?.university,
    profile?.department,
    profile?.grade ? `${profile.grade}年生` : null,
  ].filter(Boolean).join(' ・ ');

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
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${plan === 'standard' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}
            >
              {plan === 'standard' ? '⭐ スタンダード' : '🔓 無料プラン'}
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
              </div>
              <span className="flex-shrink-0 text-xs text-gray-400 group-hover:text-green-600 flex items-center gap-1 transition-colors self-start sm:self-auto">
                プロフィール編集 <span aria-hidden="true">→</span>
              </span>
            </div>
          </Link>
        </div>

        {/* 学部未設定バナー */}
        {!profile?.department && (
          <div className="mb-6 sm:mb-8 flex items-start sm:items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
            <span className="text-lg flex-shrink-0">📝</span>
            <p className="text-sm text-yellow-800 flex-1">
              学部・学科を設定すると、AIが最適な科目の問題を生成します
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
        <div className="bg-white rounded-2xl border p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">📊 苦手分野分析</h2>
            {plan === 'standard' && subjectStats.length > 0 && (
              <span className="text-xs text-gray-400">{subjectStats.length}科目</span>
            )}
          </div>
          {plan !== 'standard' ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-3">スタンダードプランの機能です</p>
              <Link href="/pricing"
                className="inline-block text-xs bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                アップグレードする →
              </Link>
            </div>
          ) : subjectStats.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-sm">演習を行うと分析が表示されます</p>
              <Link href="/quiz" className="text-xs text-green-600 hover:underline mt-2 inline-block">演習を始める</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {subjectStats.map(({ subject, accuracy: acc, total }) => {
                const isWeak   = acc <= 60;
                const isReview = acc > 60 && acc <= 80;
                return (
                  <div key={subject} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-900 truncate mr-2">{subject}</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isWeak   ? 'bg-red-100 text-red-600' :
                            isReview ? 'bg-yellow-100 text-yellow-600' :
                                       'bg-green-100 text-green-600'
                          }`}>
                            {isWeak ? '苦手' : isReview ? '要復習' : '得意'}
                          </span>
                          <span className="text-sm font-semibold text-gray-700 w-10 text-right">{acc}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          isWeak   ? 'bg-red-400' :
                          isReview ? 'bg-yellow-400' :
                                     'bg-green-500'
                        }`} style={{ width: `${acc}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{total}問回答済み</p>
                    </div>
                    <Link
                      href={`/review?subject=${encodeURIComponent(subject)}`}
                      className="flex-shrink-0 text-xs text-green-600 border border-green-200 px-2.5 py-2 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap">
                      この科目を復習する
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 試験予定 / 最近の演習 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
          <ExamSection userId={user.id} initialExams={exams ?? []} />
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <h2 className="font-semibold text-gray-900 mb-4">最近の演習</h2>
            {sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map(session => {
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.subject ?? '演習'}</p>
                        <p className="text-xs text-gray-400">{session.total_questions}問</p>
                      </div>
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

        <p className="text-center text-xs text-gray-400 mt-8">
          お問い合わせはこちらまでSMSをお送りください：
          <a href="sms:090-5889-8610" className="underline hover:text-gray-600">090-5889-8610</a>
        </p>
      </div>
    </div>
    <AddToHomeScreen />
    </>
  );
}
