'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import QuizRunner, { type QuizQuestion, type QuizUnitTally } from '@/components/QuizRunner';

type Phase = 'loading' | 'quiz' | 'result' | 'error';
const PRACTICE_QUESTION_COUNT = 10;

export default function SubjectPracticePage() {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [resultCorrect, setResultCorrect] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const loadQuestions = useCallback(async (sId: string, exType: string) => {
    try {
      const res = await fetch('/api/diagnostic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType: exType, subjectId: sId, count: PRACTICE_QUESTION_COUNT }),
      });
      if (res.status === 401) { window.location.href = '/auth/login'; return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '問題の準備に失敗しました');
      setQuestions(data.questions);
      setPhase('quiz');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '問題の準備に失敗しました');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = params.get('subjectId') ?? '';
    const exType = params.get('examType') ?? '';
    setSubjectId(sId);
    setSubjectName(params.get('subjectName') ?? '');
    if (!sId || !exType) { setErrorMsg('科目が指定されていません'); setPhase('error'); return; }
    loadQuestions(sId, exType);
  }, [loadQuestions]);

  async function handleComplete(correctByUnit: QuizUnitTally, totalCorrect: number) {
    setResultCorrect(totalCorrect);
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
            <div className="mb-4 text-4xl">📘</div>
            <p className="text-sm text-slate-500">問題を準備しています...</p>
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
    const accuracy = Math.round((resultCorrect / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-lg p-4 sm:p-8">
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="mb-3 text-5xl">✅</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">演習完了</h1>
            <p className="mb-6 text-sm text-slate-400">{subjectName}</p>
            <p className="text-3xl font-bold text-emerald-600">{resultCorrect}<span className="text-base font-medium text-slate-500">/{questions.length}問正解（{accuracy}%）</span></p>

            <div className="mt-8 space-y-2">
              <button
                onClick={() => { router.push(`/subject/${subjectId}`); router.refresh(); }}
                className="block w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
                単元別の結果を見る
              </button>
              <button
                onClick={() => { router.push('/dashboard'); router.refresh(); }}
                className="block w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-600 hover:bg-slate-50">
                ダッシュボードへ戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <QuizRunner title={`${subjectName} 演習`} questions={questions} onComplete={handleComplete} />
    </div>
  );
}
