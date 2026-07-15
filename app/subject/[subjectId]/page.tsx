import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { ChevronLeft, Sparkles } from 'lucide-react';

export default async function SubjectDetailPage({ params }: { params: { subjectId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: activeExam } = await supabase
    .from('user_exam_settings')
    .select('exam_type, grade')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();
  if (!activeExam) redirect('/onboarding');

  const { data: subject } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('id', params.subjectId)
    .maybeSingle();
  if (!subject) notFound();

  const scopeGrade = activeExam.exam_type === 'regular_test' ? (activeExam.grade ?? 0) : 0;

  const { data: unitsInSubject } = await supabase
    .from('units')
    .select('id, name, display_order')
    .eq('subject_id', subject.id)
    .order('display_order');

  const unitIds = (unitsInSubject ?? []).map(u => u.id);

  const [{ data: scopeRows }, { data: progressRows }] = await Promise.all([
    unitIds.length > 0
      ? supabase.from('unit_scopes').select('unit_id').eq('exam_type', activeExam.exam_type).eq('grade', scopeGrade).in('unit_id', unitIds)
      : Promise.resolve({ data: [] as { unit_id: string }[] }),
    unitIds.length > 0
      ? supabase.from('user_unit_progress').select('unit_id, answered_count, correct_count').eq('user_id', user.id).in('unit_id', unitIds)
      : Promise.resolve({ data: [] as { unit_id: string; answered_count: number; correct_count: number }[] }),
  ]);

  const scopedUnitIds = new Set((scopeRows ?? []).map(s => s.unit_id));
  const progressByUnit = new Map((progressRows ?? []).map(p => [p.unit_id, p]));

  const units = (unitsInSubject ?? [])
    .filter(u => scopedUnitIds.has(u.id))
    .map(u => {
      const p = progressByUnit.get(u.id);
      return {
        id: u.id,
        name: u.name,
        accuracy: p && p.answered_count > 0 ? Math.round((p.correct_count / p.answered_count) * 100) : null,
        answeredCount: p?.answered_count ?? 0,
      };
    });

  const totalCorrect = (progressRows ?? []).reduce((s, p) => s + p.correct_count, 0);
  const totalAnswered = (progressRows ?? []).reduce((s, p) => s + p.answered_count, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-emerald-600">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          ダッシュボードへ戻る
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold text-slate-900">{subject.name}</h1>
            {overallAccuracy !== null && (
              <span className="text-2xl font-bold tabular-nums text-slate-900">{overallAccuracy}%</span>
            )}
          </div>

          {units.length > 0 && (
            <Link
              href={`/subject-practice?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}&examType=${activeExam.exam_type}`}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              この科目をまとめて演習する
            </Link>
          )}
        </div>

        <h2 className="mb-3 mt-6 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">単元別 正答率</h2>

        {units.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">現在の試験設定に対応する単元データがまだありません。</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {units.map(u => {
              const hasData = u.accuracy !== null;
              const isWeak = hasData && (u.accuracy as number) <= 60;
              const isReview = hasData && (u.accuracy as number) > 60 && (u.accuracy as number) <= 80;
              return (
                <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">{u.name}</span>
                        {hasData ? (
                          <span className={`shrink-0 text-sm font-semibold tabular-nums ${
                            isWeak ? 'text-rose-500' : isReview ? 'text-amber-600' : 'text-emerald-600'
                          }`}>{u.accuracy}%</span>
                        ) : (
                          <span className="shrink-0 text-xs text-slate-400">データなし</span>
                        )}
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${
                          isWeak ? 'bg-rose-400' : isReview ? 'bg-amber-400' : hasData ? 'bg-emerald-500' : 'bg-slate-200'
                        }`} style={{ width: `${hasData ? u.accuracy : 0}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{u.answeredCount}問回答済み</p>
                    </div>
                    <Link
                      href={`/unit-check?unit=${u.id}&unitName=${encodeURIComponent(u.name)}&subjectName=${encodeURIComponent(subject.name)}`}
                      className="shrink-0 whitespace-nowrap rounded-lg border border-emerald-200 px-3 py-2 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
                    >
                      演習する
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
