import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ExamSection from './ExamSection';
import LogoutButton from './LogoutButton';
import HelpModal from '@/components/HelpModal';
import { dashboardHelp } from '@/lib/helpContent';
import GuideBanner from './GuideBanner';

const FEATURE_CARDS = [
  { href: '/quiz',      icon: '⚡', title: '演習を始める',  desc: '科目・難易度を選んで演習' },
  { href: '/review',   icon: '🔁', title: '復習モード',    desc: '間違えた問題を再チャレンジ' },
  { href: '/cbt',      icon: '🎯', title: 'CBT模試',       desc: '本番形式で実力を測る' },
  { href: '/generate', icon: '✨', title: 'AI問題生成',    desc: '教材からAIが問題を自動作成' },
  { href: '/questions',icon: '📚', title: 'マイ問題集',    desc: '自分の問題をフォルダ管理' },
  { href: '/materials',icon: '📤', title: '教材管理',      desc: 'PDFや画像をアップロード' },
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
  const isAdmin = user.email === 'harumaru0723@yahoo.co.jp';
  const { data: exams } = await supabase.from('exams').select('*').eq('user_id', user.id).order('exam_date');
  const { data: sessions } = await supabase.from('quiz_sessions').select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(5);
  const { data: materials } = await supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  const totalQuestions = sessions?.reduce((s, r) => s + r.total_questions, 0) ?? 0;
  const totalCorrect = sessions?.reduce((s, r) => s + r.correct_count, 0) ?? 0;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bestAccuracy = sessions && sessions.length > 0 ? Math.max(...sessions.map(s => Math.round((s.correct_count / s.total_questions) * 100))) : null;
  const profileSummary = [
    profile?.university,
    profile?.department,
    profile?.grade ? `${profile.grade}年生` : null,
  ].filter(Boolean).join(' ・ ');

  return (
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
            <p className="text-xs sm:text-sm text-gray-400 mb-1">総学習問題数</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{totalQuestions}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '問題を解いて記録を作ろう' : '問題解いてます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">総合正解率</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{totalQuestions > 0 ? `${accuracy}%` : '--%'}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '演習を始めると表示されます' : '頑張ってます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">演習回数</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{sessions?.length ?? 0}回</p>
            <p className="text-xs text-gray-400 mt-1">毎日続けよう🔥</p>
          </div>
          <div className="bg-white rounded-2xl border p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-gray-400 mb-1">最高正解率</p>
            <p className="text-2xl sm:text-3xl font-semibold text-gray-900">{bestAccuracy !== null ? `${bestAccuracy}%` : '--%'}</p>
            <p className="text-xs text-gray-400 mt-1">自己ベストを更新しよう🏆</p>
          </div>
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
  );
}
