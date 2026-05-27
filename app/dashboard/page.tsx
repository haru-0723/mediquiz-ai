import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ExamSection from './ExamSection';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const name = user.user_metadata?.name ?? user.email ?? '';

  const { data: exams } = await supabase
    .from('exams')
    .select('*')
    .eq('user_id', user.id)
    .order('exam_date');

  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(5);

  const totalQuestions = sessions?.reduce((s, r) => s + r.total_questions, 0) ?? 0;
  const totalCorrect = sessions?.reduce((s, r) => s + r.correct_count, 0) ?? 0;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{name}</span>
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-700">ログアウト</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">こんにちは、{name.split(' ')[0]}さん 👋</h1>
          <p className="text-gray-500 mt-1 text-sm">今日も一緒に頑張りましょう。</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">総学習問題数</p>
            <p className="text-3xl font-semibold text-gray-900">{totalQuestions}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '問題を解いて記録を作ろう' : '問題解いてます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">総合正解率</p>
            <p className="text-3xl font-semibold text-gray-900">{totalQuestions > 0 ? `${accuracy}%` : '--%'}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '演習を始めると表示されます' : '頑張ってます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">演習回数</p>
            <p className="text-3xl font-semibold text-gray-900">{sessions?.length ?? 0}回</p>
            <p className="text-xs text-gray-400 mt-1">毎日続けよう🔥</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">最高正解率</p>
            <p className="text-3xl font-semibold text-gray-900">
              {sessions && sessions.length > 0
                ? `${Math.max(...sessions.map(s => Math.round((s.correct_count / s.total_questions) * 100)))}%`
                : '--%'}
            </p>
            <p className="text-xs text-gray-400 mt-1">自己ベストを更新しよう🏆</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ExamSection userId={user.id} initialExams={exams ?? []} />

          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">最近の演習</h2>
            {sessions && sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map(session => {
                  const acc = Math.round((session.correct_count / session.total_questions) * 100);
                  return (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.subject ?? '演習'}</p>
                        <p className="text-xs text-gray-400">{session.total_questions}問</p>
                      </div>
                      <span className={`text-sm font-semibold ${acc >= 60 ? 'text-green-600' : 'text-red-500'}`}>
                        {acc}%
                      </span>
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

        <div className="mt-8 text-center">
          <Link href="/quiz" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors">
            ⚡ 演習を始める
          </Link>
        </div>
      </div>
    </div>
  );
}
