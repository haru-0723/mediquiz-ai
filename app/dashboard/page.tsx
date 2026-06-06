import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ExamSection from './ExamSection';
import LogoutButton from './LogoutButton';

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
    profile?.grade ? ${profile.grade}年生 : null,
  ].filter(Boolean).join(' ・ ');
  return (
    <div className="min-h-screen bg-gray-50">
   profile?.grade ? `${profile.grade}年生` : null,
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </div>
     <div className="flex items-center gap-2 flex-wrap justify-end">
       <Link href="/pricing" className={text-xs px-2 py-1 rounded-full font-medium ${plan === 'standard' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}}>
  {plan === 'standard' ? '⭐ スタンダード' : '🔓 無料プラン'}
</Link>
  <Link href="/questions" className="text-xs text-green-600 hover:underline hidden sm:inline">問題一覧</Link>
<Link href="/review" className="text-xs bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600">復習</Link>
<Link href="/cbt" className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg hover:bg-blue-700">CBT模試</Link>
  <Link href="/generate" className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700">AI生成</Link>
  <Link href="/questions/new" className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-lg hover:bg-green-100">+ 問題</Link>
  <Link href="/materials" className="text-xs text-green-600 hover:underline hidden sm:inline">教材一覧</Link>
<Link href="/upload" className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-200">+ 教材</Link>
{isAdmin && (
  <Link href="/admin" className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">管理者</Link>
)}
 <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600">設定</Link>
<LogoutButton />
</div>
      </nav>
      <div className="max-w-4xl mx-auto p-8">
        <Link
          href="/settings"
          className="group block mb-8 bg-white rounded-2xl border p-6 hover:border-green-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900 truncate group-hover:text-green-700 transition-colors">
                こんにちは、{name.split(' ')[0]}さん 👋
              </h1>
              <p className="text-gray-500 mt-1 text-sm truncate">
                {profileSummary || '今日も一緒に頑張りましょう。プロフィールを設定しましょう →'}
              </p>
            </div>
            <span className="flex-shrink-0 text-xs text-gray-400 group-hover:text-green-600 flex items-center gap-1 transition-colors">
              プロフィール編集 <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">総学習問題数</p>
            <p className="text-3xl font-semibold text-gray-900">{totalQuestions}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '問題を解いて記録を作ろう' : '問題解いてます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">総合正解率</p>
            <p className="text-3xl font-semibold text-gray-900">{totalQuestions > 0 ? ${accuracy}% : '--%'}</p>
            <p className="text-xs text-gray-400 mt-1">{totalQuestions === 0 ? '演習を始めると表示されます' : '頑張ってます！'}</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">演習回数</p>
            <p className="text-3xl font-semibold text-gray-900">{sessions?.length ?? 0}回</p>
            <p className="text-xs text-gray-400 mt-1">毎日続けよう🔥</p>
          </div>
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-sm text-gray-400 mb-1">最高正解率</p>
            <p className="text-3xl font-semibold text-gray-900">{bestAccuracy !== null ? ${bestAccuracy}% : '--%'}</p>
            <p className="text-xs text-gray-400 mt-1">自己ベストを更新しよう🏆</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-8">
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
        <div className="bg-white rounded-2xl border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
  <h2 className="font-semibold text-gray-900">教材一覧</h2>
  <div className="flex items-center gap-3">
    <Link href="/materials" className="text-xs text-gray-400 hover:underline">管理・削除</Link>
    <Link href="/upload" className="text-xs text-green-600 hover:underline">+ 追加</Link>
  </div>
</div>
          {materials && materials.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {materials.map(material => (
                <div key={material.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                    {material.file_type?.includes('pdf') ? '📄' : '🖼️'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{material.title}</p>
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
        <div className="text-center">
          <Link href="/quiz" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors">
            ⚡ 演習を始める
          </Link>
        </div>
      </div>
    </div>
  );
}
