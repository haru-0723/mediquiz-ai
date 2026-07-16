'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import QuizRunner, { type QuizQuestion, type QuizUnitTally } from '@/components/QuizRunner';

type Phase = 'loading' | 'quiz' | 'result' | 'error';

export default function UnitCheckPage() {
  const router = useRouter();
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [resultTally, setResultTally] = useState<QuizUnitTally>(new Map());
  const [resultTotalCorrect, setResultTotalCorrect] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const loadQuestions = useCallback(async (ids: string[]) => {
    try {
      const res = await fetch('/api/unit-check-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitIds: ids }),
      });
      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '問題の取得に失敗しました');
      setQuestions(data.questions);
      setPhase('quiz');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '問題の取得に失敗しました');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const multi = params.get('units');
    const single = params.get('unit');
    const ids = multi ? multi.split(',').filter(Boolean) : single ? [single] : [];
    setUnitIds(ids);
    if (ids.length === 0) { setErrorMsg('単元が指定されていません'); setPhase('error'); return; }
    loadQuestions(ids);
  }, [loadQuestions]);

  async function handleComplete(correctByUnit: QuizUnitTally, totalCorrect: number) {
    setResultTally(correctByUnit);
    setResultTotalCorrect(totalCorrect);
    try {
      await fetch('/api/diagnostic-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results: Array.from(correctByUnit.entries()).map(([unitId, r]) => ({ unitId, correct: r.correct, total: r.total })),
        }),
      });
    } catch {
      // 保存に失敗しても結果画面は表示する
    }
    setPhase('result');
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">🧠</div>
            <p className="text-sm text-slate-500">
              {unitIds.length > 1 ? `${unitIds.length}単元の理解度チェックを準備しています...` : '理解度チェックの問題を準備しています...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="p-6 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <p className="mb-4 text-sm text-slate-700">{errorMsg}</p>
            <Link href="/dashboard" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const total = questions.length;
    // 単元ごとの結果ラベル
    const unitNameById = new Map(questions.map(q => [q.unitId, { unitName: q.unitName, subjectName: q.subjectName }]));
    const perUnit = Array.from(resultTally.entries()).map(([unitId, r]) => ({
      unitId,
      ...(unitNameById.get(unitId) ?? { unitName: '', subjectName: '' }),
      ...r,
    }));

    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-lg p-4 sm:p-8">
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mb-3 text-5xl">✅</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">理解度チェック完了</h1>
            <p className="mb-6 text-sm text-slate-400">{perUnit.length}単元 ・ {total}問</p>
            <p className="text-3xl font-bold text-emerald-600">{resultTotalCorrect}<span className="text-base font-medium text-slate-500">/{total}問正解</span></p>

            <div className="mt-6 space-y-2 text-left">
              {perUnit.map(u => {
                const acc = Math.round((u.correct / u.total) * 100);
                return (
                  <div key={u.unitId} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">{u.subjectName}</p>
                      <p className="truncate text-sm font-medium text-slate-900">{u.unitName}</p>
                    </div>
                    <span className={`text-sm font-bold ${acc >= 80 ? 'text-emerald-600' : acc >= 60 ? 'text-amber-600' : 'text-rose-500'}`}>
                      {u.correct}/{u.total}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-400">過去の記録と合算して、各単元の正答率を更新しました。</p>

            <button
              onClick={() => { router.push('/dashboard'); router.refresh(); }}
              className="mt-6 block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              ダッシュボードへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <QuizRunner title="理解度チェック" questions={questions} onComplete={handleComplete} />
    </div>
  );
}
