'use client';

import { useState } from 'react';

export type QuizQuestion = {
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

export type QuizUnitTally = Map<string, { correct: number; total: number }>;

type QuizRunnerProps = {
  title: string;
  questions: QuizQuestion[];
  onComplete: (correctByUnit: QuizUnitTally, totalCorrect: number) => void;
};

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

// 単元別確認テスト・科目まとめ演習・週次診断テストで共通の「出題→回答→解説→進捗」UI。
// 問題取得・結果画面・送信先はページごとに異なるため、それらは呼び出し側が持ち、
// このコンポーネントは1問ずつ解き進める部分だけを担当する。
export default function QuizRunner({ title, questions, onComplete }: QuizRunnerProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctByUnit, setCorrectByUnit] = useState<QuizUnitTally>(new Map());
  const [totalCorrect, setTotalCorrect] = useState(0);

  const q = questions[current];

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
  }

  function handleNext() {
    const isCorrect = selected === q.answer;
    const nextTotalCorrect = totalCorrect + (isCorrect ? 1 : 0);
    const nextTally = new Map(correctByUnit);
    const prev = nextTally.get(q.unitId) ?? { correct: 0, total: 0 };
    nextTally.set(q.unitId, { correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 });

    setTotalCorrect(nextTotalCorrect);
    setCorrectByUnit(nextTally);

    if (current + 1 >= questions.length) {
      onComplete(nextTally, nextTotalCorrect);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <div className="mb-6 mt-2 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{q.subjectName}・{q.unitName}</p>
          <h1 className="text-base font-semibold text-slate-800">{title}</h1>
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
            const optionText = q[`option_${key.toLowerCase()}` as keyof QuizQuestion] as string;
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
  );
}
