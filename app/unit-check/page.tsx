'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

type CheckQuestion = {
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

type Phase = 'loading' | 'quiz' | 'result' | 'error';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export default function UnitCheckPage() {
  const router = useRouter();
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<CheckQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctByUnit, setCorrectByUnit] = useState<Map<string, { correct: number; total: number }>>(new Map());
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

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  }

  async function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.answer;
    const next = new Map(correctByUnit);
    const prev = next.get(q.unitId) ?? { correct: 0, total: 0 };
    next.set(q.unitId, { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 });
    setCorrectByUnit(next);

    if (current + 1 >= questions.length) {
      try {
        await fetch('/api/diagnostic-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            results: Array.from(next.entries()).map(([unitId, r]) => ({ unitId, correct: r.correct, total: r.total })),
          }),
        });
      } catch {
        // 保存に失敗しても結果画面は表示する
      }
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
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
    const totalCorrect = Array.from(correctByUnit.values()).reduce((s, r) => s + r.correct, 0);
    const total = questions.length;
    // 単元ごとの結果ラベル
    const unitNameById = new Map(questions.map(q => [q.unitId, { unitName: q.unitName, subjectName: q.subjectName }]));
    const perUnit = Array.from(correctByUnit.entries()).map(([unitId, r]) => ({
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
            <p className="text-3xl font-bold text-emerald-600">{totalCorrect}<span className="text-base font-medium text-slate-500">/{total}問正解</span></p>

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

  const q = questions[current];
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <div className="mb-6 mt-2 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{q.subjectName}・{q.unitName}</p>
            <h1 className="text-base font-semibold text-slate-800">理解度チェック</h1>
          </div>
          <span className="text-sm text-slate-400">{current + 1} / {questions.length}</span>
        </div>

        <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((current + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <p className="mb-5 text-base font-medium leading-relaxed text-slate-900 sm:text-lg">{q.question}</p>

          <div className="space-y-2.5">
            {OPTION_KEYS.map(key => {
              const optionText = q[`option_${key.toLowerCase()}` as keyof CheckQuestion] as string;
              const isCorrect = key === q.answer;
              const isSelected = key === selected;

              let bgClass = 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer';
              if (answered) {
                if (isCorrect) bgClass = 'bg-emerald-50 border-emerald-400 cursor-default';
                else if (isSelected) bgClass = 'bg-rose-50 border-rose-400 cursor-default';
                else bgClass = 'bg-slate-50 border-slate-200 cursor-default opacity-60';
              }

              return (
                <button key={key} onClick={() => handleSelect(key)} disabled={answered}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${bgClass}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      answered && isCorrect ? 'bg-emerald-500 text-white' :
                      answered && isSelected ? 'bg-rose-400 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-800">{optionText}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {answered && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="mb-1 text-xs font-semibold text-emerald-700">解説</p>
              <p className="text-sm leading-relaxed text-slate-700">{q.explanation}</p>
            </div>
          )}
        </div>

        {answered && (
          <button onClick={handleNext}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            {current + 1 >= questions.length ? '結果を見る →' : '次の問題へ →'}
          </button>
        )}
      </div>
    </div>
  );
}
