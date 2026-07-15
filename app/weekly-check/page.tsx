'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';

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

type Phase = 'intro' | 'loading' | 'quiz' | 'result' | 'error';
const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export default function WeeklyCheckPage() {
  const supabase = createClient();
  const [examType, setExamType] = useState<string>('');
  const [phase, setPhase] = useState<Phase>('intro');
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [unitResults, setUnitResults] = useState<Map<string, { correct: number; total: number }>>(new Map());
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

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  }

  async function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.answer;
    const newCorrect = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(newCorrect);

    const next = new Map(unitResults);
    const prev = next.get(q.unitId) ?? { correct: 0, total: 0 };
    next.set(q.unitId, { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 });
    setUnitResults(next);

    if (current + 1 >= questions.length) {
      try {
        await Promise.all([
          fetch('/api/diagnostic-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: Array.from(next.entries()).map(([unitId, r]) => ({ unitId, correct: r.correct, total: r.total })) }),
          }),
          fetch('/api/weekly-diagnostic-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correctCount: newCorrect, questionsCount: questions.length }),
          }),
        ]);
      } catch {
        // 保存失敗でも結果は表示
      }
      setPhase('result');
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
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
    const accuracy = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-xl px-4 py-10 text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8">
            <div className="mb-3 text-5xl">🎯</div>
            <h1 className="mb-1 text-xl font-bold text-slate-900">今週の診断テスト完了</h1>
            <p className="mb-6 text-sm text-slate-400">{questions.length}問中 {correctCount}問正解</p>
            <p className="text-4xl font-bold text-emerald-600">{accuracy}%</p>
            <p className="mt-4 text-sm text-slate-600">結果を各単元の正答率に反映しました。また来週チャレンジしましょう。</p>
            <Link href="/dashboard" className="mt-8 block w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">{q.subjectName}・{q.unitName}</p>
            <h1 className="text-base font-semibold text-slate-800">今週の診断テスト</h1>
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
              const optionText = q[`option_${key.toLowerCase()}` as keyof DiagnosticQuestion] as string;
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
                    }`}>{key}</span>
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
