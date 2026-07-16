'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import QuizRunner, { type QuizQuestion, type QuizUnitTally } from '@/components/QuizRunner';

type Phase = 'intro' | 'loading' | 'quiz' | 'result' | 'error';

export default function WeeklyCheckPage() {
  const router = useRouter();
  const supabase = createClient();
  const [examType, setExamType] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [resultCorrect, setResultCorrect] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/auth/login'; return; }
      const { data: exam } = await supabase
        .from('user_exam_settings')
        .select('exam_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (exam?.exam_type !== 'cbt' && exam?.exam_type !== 'kokushi') {
        setErrorMsg('週次診断テストは国試・CBTを目標にしている方向けの機能です。');
        setPhase('error');
        return;
      }
      setExamType(exam.exam_type);
    }
    load();
  }, [supabase]);

  const start = useCallback(async () => {
    if (!examType) return;
    setPhase('loading');
    try {
      const res = await fetch('/api/diagnostic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examType, count: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '問題の準備に失敗しました');
      setQuestions(data.questions);
      setPhase('quiz');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '問題の準備に失敗しました');
      setPhase('error');
    }
  }, [examType]);

  async function handleComplete(correctByUnit: QuizUnitTally, totalCorrect: number) {
    setResultCorrect(totalCorrect);
    try {
      await Promise.all([
        fetch('/api/diagnostic-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: Array.from(correctByUnit.entries()).map(([unitId, r]) => ({ unitId, correct: r.correct, total: r.total })) }),
        }),
        fetch('/api/weekly-diagnostic-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correctCount: totalCorrect, questionsCount: questions.length }),
        }),
      ]);
    } catch {
      // 保存失敗でも結果は表示
    }
    setPhase('result');
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mb-3 text-5xl">📊</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">今週の総合診断テスト（50問）</h1>
            <p className="mb-6 text-sm text-slate-500">
              全科目からまんべんなく50問出題します。1週間の成果を測って、正答率の推移を記録しましょう。
            </p>
            {errorMsg && <p className="mb-4 text-sm text-rose-600">{errorMsg}</p>}
            <button onClick={start} disabled={!examType}
              className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
              診断テストをはじめる
            </button>
            <Link href="/dashboard" className="mt-3 block text-xs text-slate-400 hover:underline">あとでやる</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">📊</div>
            <p className="text-sm text-slate-500">50問を準備しています...</p>
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
            <Link href="/dashboard" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700">ダッシュボードへ</Link>
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
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mb-3 text-5xl">🎯</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">今週の診断テスト完了</h1>
            <p className="mb-6 text-sm text-slate-400">{questions.length}問中 {resultCorrect}問正解</p>
            <p className="text-4xl font-bold text-emerald-600">{accuracy}%</p>
            <p className="mt-4 text-sm text-slate-600">結果を各単元の正答率に反映しました。また来週チャレンジしましょう。</p>
            <button
              onClick={() => { router.push('/dashboard'); router.refresh(); }}
              className="mt-8 block w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              ダッシュボードへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <QuizRunner title="今週の診断テスト" questions={questions} onComplete={handleComplete} />
    </div>
  );
}
