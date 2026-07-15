'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/Logo';

type ExamType = 'regular_test' | 'cbt' | 'kokushi';
type Phase = 'profile' | 'exam' | 'saving' | 'diagnosticIntro' | 'diagnosticQuiz' | 'diagnosticResult';

const DEPARTMENT_OPTIONS = [
  { value: 'pharmacy', label: '薬学部', available: true },
  { value: 'medical', label: '医学部', available: false },
  { value: 'nursing', label: '看護学部', available: false },
  { value: 'other', label: 'その他', available: false },
];

const EXAM_OPTIONS: { value: ExamType; label: string; desc: string }[] = [
  { value: 'regular_test', label: '定期テスト', desc: '大学の科目試験対策' },
  { value: 'cbt', label: 'CBT', desc: '薬学共用試験' },
  { value: 'kokushi', label: '薬剤師国家試験', desc: '国家試験本番に向けて' },
];

type Subject = { id: string; name: string };

type DiagnosticQuestion = {
  id: string;
  unitId: string;
  unitName: string;
  subjectName: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string;
  difficulty: string;
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>('profile');
  const [department, setDepartment] = useState<string | null>(null);
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');

  const [examType, setExamType] = useState<ExamType | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 実力チェック（診断テスト）
  const [diagQuestions, setDiagQuestions] = useState<DiagnosticQuestion[]>([]);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagCurrent, setDiagCurrent] = useState(0);
  const [diagSelected, setDiagSelected] = useState<string | null>(null);
  const [diagAnswered, setDiagAnswered] = useState(false);
  const [diagCorrectCount, setDiagCorrectCount] = useState(0);
  const [diagUnitResults, setDiagUnitResults] = useState<Map<string, { correct: number; total: number }>>(new Map());

  useEffect(() => {
    if (examType !== 'regular_test' || subjects.length > 0) return;
    supabase.from('subjects').select('id, name').order('display_order').then(({ data }) => {
      if (data) setSubjects(data);
    });
  }, [examType, subjects.length, supabase]);

  const canSubmitProfile = !!department && !!grade;

  const canSubmitExam =
    !!examType &&
    !!examDate &&
    (examType !== 'regular_test' || !!subjectId);

  async function handleSaveExamSettings() {
    if (!canSubmitExam || !examType || !department) return;
    setPhase('saving');
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      await supabase.from('profiles').update({
        university: university || null,
        department: DEPARTMENT_OPTIONS.find(d => d.value === department)?.label ?? null,
        target_exam: department,
        grade: parseInt(grade, 10),
      }).eq('id', user.id);

      // アクティブな試験は常に1件のみにする（既存のものは無効化してから新規登録）
      await supabase.from('user_exam_settings')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { error: insertError } = await supabase.from('user_exam_settings').insert({
        user_id: user.id,
        exam_type: examType,
        grade: examType === 'regular_test' ? parseInt(grade, 10) : null,
        subject_id: examType === 'regular_test' ? subjectId : null,
        // 学部設定時に選んだ学年（grade）を、定期テストの範囲指定にもそのまま流用する
        exam_date: examDate,
        is_active: true,
      });
      if (insertError) throw insertError;

      if (examType === 'cbt' || examType === 'kokushi') {
        setPhase('diagnosticIntro');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
      setPhase('exam');
    } finally {
      setSaving(false);
    }
  }

  const startDiagnostic = useCallback(async () => {
    if (!examType) return;
    setDiagLoading(true);
    setError('');
    try {
      const res = await fetch('/api/diagnostic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '問題の準備に失敗しました');
      setDiagQuestions(data.questions);
      setPhase('diagnosticQuiz');
    } catch (e) {
      setError(e instanceof Error ? e.message : '問題の準備に失敗しました');
    } finally {
      setDiagLoading(false);
    }
  }, [examType]);

  function handleDiagSelect(option: string) {
    if (diagAnswered) return;
    setDiagSelected(option);
    setDiagAnswered(true);
  }

  async function handleDiagNext() {
    const q = diagQuestions[diagCurrent];
    const isCorrect = diagSelected === q.answer;
    const newCorrectCount = diagCorrectCount + (isCorrect ? 1 : 0);
    setDiagCorrectCount(newCorrectCount);

    const nextResults = new Map(diagUnitResults);
    const prev = nextResults.get(q.unitId) ?? { correct: 0, total: 0 };
    nextResults.set(q.unitId, { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 });
    setDiagUnitResults(nextResults);

    if (diagCurrent + 1 >= diagQuestions.length) {
      try {
        await fetch('/api/diagnostic-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: Array.from(nextResults.entries()).map(([unitId, r]) => ({ unitId, correct: r.correct, total: r.total })),
          }),
        });
      } catch {
        // 保存に失敗しても結果画面は表示する
      }
      setPhase('diagnosticResult');
    } else {
      setDiagCurrent(c => c + 1);
      setDiagSelected(null);
      setDiagAnswered(false);
    }
  }

  function finishOnboarding() {
    router.push('/dashboard');
    router.refresh();
  }

  // ---------- 診断テスト画面 ----------
  if (phase === 'diagnosticQuiz' && diagQuestions.length > 0) {
    const q = diagQuestions[diagCurrent];
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
            <Logo href="/dashboard" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{q.subjectName}・{q.unitName}</p>
              <h1 className="text-base font-semibold text-slate-800">実力チェック</h1>
            </div>
            <span className="text-sm text-slate-400">{diagCurrent + 1} / {diagQuestions.length}</span>
          </div>

          <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${((diagCurrent + (diagAnswered ? 1 : 0)) / diagQuestions.length) * 100}%` }} />
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="mb-5 text-base font-medium leading-relaxed text-slate-900 sm:text-lg">{q.question}</p>
            <div className="space-y-2.5">
              {OPTION_KEYS.map(key => {
                const optionText = q[`option_${key.toLowerCase()}` as keyof DiagnosticQuestion] as string;
                const isCorrect = key === q.answer;
                const isSelected = key === diagSelected;
                let bgClass = 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer';
                if (diagAnswered) {
                  if (isCorrect) bgClass = 'bg-emerald-50 border-emerald-400 cursor-default';
                  else if (isSelected) bgClass = 'bg-rose-50 border-rose-400 cursor-default';
                  else bgClass = 'bg-slate-50 border-slate-200 cursor-default opacity-60';
                }
                return (
                  <button key={key} onClick={() => handleDiagSelect(key)} disabled={diagAnswered}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${bgClass}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        diagAnswered && isCorrect ? 'bg-emerald-500 text-white' :
                        diagAnswered && isSelected ? 'bg-rose-400 text-white' :
                        'bg-slate-200 text-slate-600'
                      }`}>{key}</span>
                      <span className="text-sm leading-relaxed text-slate-800">{optionText}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {diagAnswered && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="mb-1 text-xs font-semibold text-emerald-700">解説</p>
                <p className="text-sm leading-relaxed text-slate-700">{q.explanation}</p>
              </div>
            )}
          </div>

          {diagAnswered && (
            <button onClick={handleDiagNext}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
              {diagCurrent + 1 >= diagQuestions.length ? '結果を見る →' : '次の問題へ →'}
            </button>
          )}
        </main>
      </div>
    );
  }

  if (phase === 'diagnosticResult') {
    const accuracy = Math.round((diagCorrectCount / diagQuestions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-xl items-center px-4">
            <Logo href="/dashboard" />
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mb-3 text-5xl">🎯</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">実力チェック完了</h1>
            <p className="mb-6 text-sm text-slate-400">{diagQuestions.length}問中 {diagCorrectCount}問正解</p>
            <p className="text-3xl font-bold text-emerald-600">{accuracy}%</p>
            <p className="mt-4 text-sm text-slate-600">
              単元ごとの正答率をもとに、明日から「今日やること」を提案します
            </p>
            <button onClick={finishOnboarding}
              className="mt-8 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              ダッシュボードへ
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (phase === 'diagnosticIntro') {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-xl items-center px-4">
            <Logo href="/dashboard" />
          </div>
        </header>
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mb-3 text-5xl">📝</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">実力チェック（50問）</h1>
            <p className="mb-6 text-sm text-slate-500">
              様々な科目・単元から50問出題します。今のあなたの実力を測って、明日からの「今日やること」の精度を上げます。
            </p>
            {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}
            <button onClick={startDiagnostic} disabled={diagLoading}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
              {diagLoading ? '問題を準備しています...' : '実力チェックをはじめる'}
            </button>
            <button onClick={finishOnboarding} disabled={diagLoading}
              className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-60">
              あとでやる（ダッシュボードへ）
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ---------- 学部・試験設定 ----------
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-xl items-center px-4">
          <Logo href="/dashboard" />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
        {phase === 'profile' && (
          <>
            <h1 className="text-xl font-bold text-slate-900">プロフィールを設定してください</h1>
            <p className="mt-1 text-sm text-slate-500">学部・学年に合わせて出題内容を最適化します。</p>

            <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">大学名（任意）</label>
                <input type="text" value={university} onChange={e => setUniversity(e.target.value)}
                  placeholder="例：○○大学"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">学年</label>
                <select value={grade} onChange={e => setGrade(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">選択してください</option>
                  {[1, 2, 3, 4, 5, 6].map(g => (
                    <option key={g} value={g}>{g}年生</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mb-3 mt-6 text-sm font-medium text-slate-700">学部</p>
            <div className="space-y-3">
              {DEPARTMENT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => opt.available && setDepartment(opt.value)}
                  disabled={!opt.available}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                    !opt.available ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60' :
                    department === opt.value ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                  {!opt.available && <span className="text-xs text-slate-400">近日対応</span>}
                  {opt.available && (
                    <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                      department === opt.value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                    }`} />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => canSubmitProfile && setPhase('exam')}
              disabled={!canSubmitProfile}
              className="mt-8 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              次へ
            </button>
          </>
        )}

        {(phase === 'exam' || phase === 'saving') && (
          <>
            <button onClick={() => setPhase('profile')} className="mb-4 text-sm text-emerald-600 hover:underline">← プロフィールを見直す</button>
            <h1 className="text-xl font-bold text-slate-900">目標の試験を設定しましょう</h1>
            <p className="mt-1 text-sm text-slate-500">
              設定した試験に合わせて、毎日の学習内容をAIが提案します。
            </p>

            <div className="mt-8 space-y-3">
              {EXAM_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setExamType(opt.value)}
                  className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                    examType === opt.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
                  </div>
                  <div className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                    examType === opt.value ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                  }`} />
                </button>
              ))}
            </div>

            {examType === 'regular_test' && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">科目</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">選択してください</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {examType && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">試験日</label>
                <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-rose-600">{error}</p>
            )}

            <button
              onClick={handleSaveExamSettings}
              disabled={!canSubmitExam || saving}
              className="mt-8 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : (examType === 'cbt' || examType === 'kokushi') ? '次へ（実力チェック） →' : 'はじめる'}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
