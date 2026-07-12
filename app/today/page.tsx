'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ExplainButton from '@/components/ExplainButton';
import type { TodayQuestion } from '@/app/api/today-generate/route';

type Phase = 'loading' | 'quiz' | 'result' | 'already-done' | 'error';

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;
const DONE_KEY = 'today-quiz-done';

function getJSTDateStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

export default function TodayPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [questions, setQuestions] = useState<TodayQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const loadQuestions = useCallback(async () => {
    const today = getJSTDateStr();
    const stored = localStorage.getItem(DONE_KEY);
    if (stored === today) {
      setPhase('already-done');
      return;
    }

    try {
      const res = await fetch('/api/today-generate', { method: 'POST' });
      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '問題の取得に失敗しました');
      setQuestions(data.questions);
      setPhase('quiz');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '問題の取得に失敗しました');
      setPhase('error');
    }
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  }

  function handleNext() {
    const isCorrect = selected === questions[current].answer;
    const newResults = [...results, isCorrect];
    setResults(newResults);

    if (current + 1 >= questions.length) {
      localStorage.setItem(DONE_KEY, getJSTDateStr());
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-4xl mb-4">📅</div>
            <p className="text-slate-500 text-sm">今日の問題を準備しています...</p>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-slate-700 text-sm mb-4">{errorMsg}</p>
            <button
              onClick={() => { setPhase('loading'); loadQuestions(); }}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              もう一度試す
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'already-done') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-4 sm:p-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-8">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">今日の問題はすでに解答済みです</h1>
            <p className="text-sm text-slate-500 mb-6">また明日チャレンジしてね！</p>
            <Link
              href="/dashboard"
              className="inline-block text-sm bg-emerald-600 text-white px-6 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              ダッシュボードへ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = results.filter(Boolean).length;
    const total = questions.length;
    const accuracy = Math.round((correct / total) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-lg mx-auto p-4 sm:p-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center mt-8">
            <div className="text-5xl mb-3">🎉</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">今日のノルマ達成！</h1>
            <p className="text-sm text-slate-400 mb-6">お疲れさまでした</p>
            <div className="flex justify-center gap-8 mb-8">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{correct}<span className="text-base font-medium text-slate-500">/{total}</span></p>
                <p className="text-xs text-slate-400 mt-1">正解数</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-emerald-600">{accuracy}<span className="text-base font-medium text-slate-500">%</span></p>
                <p className="text-xs text-slate-400 mt-1">正解率</p>
              </div>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link
                href="/quiz"
                className="text-sm border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
              >
                演習を続ける
              </Link>
              <Link
                href="/dashboard"
                className="text-sm bg-emerald-600 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                ダッシュボードへ
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // quiz phase
  const q = questions[current];
  const difficultyLabel: Record<string, string> = { easy: '易', medium: '中', hard: '難' };
  const difficultyColor: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-amber-100 text-amber-700',
    hard: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <h1 className="text-base font-semibold text-slate-800">今日の問題</h1>
          </div>
          <span className="text-sm text-slate-400">{current + 1} / {questions.length}</span>
        </div>

        {/* プログレスバー */}
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${((current + (answered ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* 問題カード */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-4">
          <div className="flex items-center gap-2 mb-3">
            {q.subject && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{q.subject}</span>
            )}
            {q.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColor[q.difficulty] ?? 'bg-slate-100 text-slate-600'}`}>
                {difficultyLabel[q.difficulty] ?? q.difficulty}
              </span>
            )}
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-5">{q.question}</p>

          <div className="space-y-2.5">
            {OPTION_KEYS.map(key => {
              const optionText = q[`option_${key.toLowerCase()}` as keyof TodayQuestion] as string;
              const isCorrect = key === q.answer;
              const isSelected = key === selected;

              let bgClass = 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer';
              if (answered) {
                if (isCorrect) bgClass = 'bg-emerald-50 border-emerald-400 cursor-default';
                else if (isSelected) bgClass = 'bg-rose-50 border-rose-400 cursor-default';
                else bgClass = 'bg-slate-50 border-slate-200 cursor-default opacity-60';
              }

              return (
                <button
                  key={key}
                  onClick={() => handleSelect(key)}
                  disabled={answered}
                  className={`w-full text-left border rounded-xl px-4 py-3 transition-all ${bgClass}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      answered && isCorrect ? 'bg-emerald-500 text-white' :
                      answered && isSelected ? 'bg-rose-400 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {key}
                    </span>
                    <span className="text-sm text-slate-800 leading-relaxed">{optionText}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 解説 */}
          {answered && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-semibold text-emerald-700 mb-1">解説</p>
              <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
              <ExplainButton
                question={q.question}
                answer={q.answer}
                explanation={q.explanation}
                subject={q.subject}
                accentColor="green"
              />
            </div>
          )}
        </div>

        {/* 次へボタン */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors text-sm"
          >
            {current + 1 >= questions.length ? '結果を見る →' : '次の問題へ →'}
          </button>
        )}
      </div>
    </div>
  );
}
