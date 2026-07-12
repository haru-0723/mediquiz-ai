'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { SAMPLE_QUESTIONS } from '@/lib/sampleQuestions';

const DIFF_LABEL: Record<string, string> = { easy: '基礎', medium: '標準', hard: '応用' };

export default function TrialPage() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const q = SAMPLE_QUESTIONS[current];
  const options = [
    { label: 'A', text: q.option_a },
    { label: 'B', text: q.option_b },
    { label: 'C', text: q.option_c },
    { label: 'D', text: q.option_d },
  ];

  function handleAnswer(letter: string) {
    if (answered) return;
    setSelected(letter);
    setAnswered(true);
    if (letter === q.answer) setCorrectCount(c => c + 1);
  }

  function handleNext() {
    if (current + 1 < SAMPLE_QUESTIONS.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    const accuracy = Math.round((correctCount / SAMPLE_QUESTIONS.length) * 100);
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-md mx-auto p-8 pt-16 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">お試し問題、お疲れさまでした！</h1>
          <p className="text-5xl font-bold text-emerald-600 mb-2">{accuracy}%</p>
          <p className="text-slate-500 mb-8">{SAMPLE_QUESTIONS.length}問中 {correctCount}問正解</p>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4 text-left">
            <p className="text-sm font-semibold text-slate-900 mb-2">✨ 次は自分の教材で問題を作ってみましょう</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              授業スライドや教科書の写真をアップロードするだけで、AIがあなた専用の問題を自動で作成します。
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/upload"
              className="block w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-emerald-700 transition-colors">
              📤 自分の教材をアップロードする
            </Link>
            <Link href="/dashboard"
              className="block w-full border border-slate-200 rounded-xl py-3 text-sm text-slate-600 hover:border-slate-300 transition-colors">
              ダッシュボードへ戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-4 sm:p-8">
        <div className="mb-4">
          <p className="text-xs text-emerald-600 font-medium mb-1">🎯 お試し問題（教材アップロード不要）</p>
          <div className="flex justify-between items-center text-sm text-slate-500">
            <span>{current + 1} / {SAMPLE_QUESTIONS.length}問</span>
          </div>
        </div>
        <div className="h-2 bg-slate-200 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${(current / SAMPLE_QUESTIONS.length) * 100}%` }} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex gap-2 mb-4">
            <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>
            <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full">{DIFF_LABEL[q.difficulty]}</span>
          </div>
          <p className="text-base font-medium text-slate-900 leading-relaxed mb-6">{q.question}</p>
          <div className="space-y-3">
            {options.map(({ label, text }) => {
              const isCorrect = label === q.answer;
              const isSelected = selected === label;
              let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
              if (!answered) cls += 'border-slate-200 hover:border-slate-300';
              else if (isCorrect) cls += 'border-emerald-500 bg-emerald-50';
              else if (isSelected) cls += 'border-rose-400 bg-rose-50';
              else cls += 'border-slate-100 opacity-60';
              return (
                <div key={label} className={cls} onClick={() => handleAnswer(label)}>
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${answered && isCorrect ? 'bg-emerald-600 border-emerald-600 text-white' : answered && isSelected ? 'bg-rose-400 border-rose-400 text-white' : 'border-slate-300 text-slate-500'}`}>
                    {label}
                  </div>
                  <span className="text-sm text-slate-700">{text}</span>
                </div>
              );
            })}
          </div>
          {answered && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border-l-4 border-emerald-500">
              <p className="text-xs font-medium text-emerald-600 mb-2">💡 解説</p>
              <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end">
          {answered && (
            <button onClick={handleNext} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700">
              {current + 1 < SAMPLE_QUESTIONS.length ? '次の問題 →' : '結果を見る'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
