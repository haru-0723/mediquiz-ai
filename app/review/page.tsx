'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Question = {
  id: string;
  subject: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string | null;
  difficulty: string;
};

export default function ReviewPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from('questions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setQuestions(data);
      setLoading(false);
    });
  }, []);

  function handleStart(qs: Question[]) {
    const shuffled = qs.sort(() => Math.random() - 0.5);
    setWrongQuestions(shuffled);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setWrongIds(new Set());
    setPhase('quiz');
  }

  function handleAnswer(letter: string) {
    if (answered) return;
    setSelected(letter);
    setAnswered(true);
    const q = wrongQuestions[current];
    if (letter !== q.answer) {
      setWrongIds(prev => new Set([...prev, q.id]));
    }
  }

  function handleNext() {
    const q = wrongQuestions[current];
    const isCorrect = selected === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);
    if (current + 1 < wrongQuestions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase('result');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / results.length) * 100);
    const stillWrong = wrongQuestions.filter(q => wrongIds.has(q.id));
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">復習完了！</h2>
          <p className="text-5xl font-bold text-green-600 mb-2">{accuracy}%</p>
          <p className="text-gray-500 mb-6">{results.length}問中 {correct}問正解</p>
          {stillWrong.length > 0 && (
            <div className="bg-red-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-600 mb-3">まだ{stillWrong.length}問間違えています</p>
              <button onClick={() => handleStart(stillWrong)}
                className="w-full bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600">
                間違えた問題をもう一度
              </button>
            </div>
          )}
          {stillWrong.length === 0 && (
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-600 font-medium">🎉 全問正解！完璧です！</p>
            </div>
          )}
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => setPhase('select')}
              className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium">
              最初から
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = wrongQuestions[current];
    const accuracy = results.length > 0 ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;
    const options = [
      { label: 'A', text: q.option_a },
      { label: 'B', text: q.option_b },
      { label: 'C', text: q.option_c },
      { label: 'D', text: q.option_d },
    ];
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">復</span>
            </div>
            <span className="font-semibold">復習モード</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
        </nav>
        <div className="max-w-2xl mx-auto p-8">
          <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
            <span>{current + 1} / {wrongQuestions.length}問</span>
            <span>正解率 {accuracy}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${(current / wrongQuestions.length) * 100}%` }} />
          </div>
          <div className="bg-white rounded-2xl border p-6 mb-4">
            <div className="flex gap-2 mb-4">
              {q.subject && <span className="bg-orange-50 text-orange-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                {q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}
              </span>
            </div>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q.question}</p>
            <div className="space-y-3">
              {options.map(({ label, text }) => {
                const isCorrect = label === q.answer;
                const isSelected = selected === label;
                let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                if (!answered) cls += 'border-gray-200 hover:border-gray-300';
                else if (isCorrect) cls += 'border-green-500 bg-green-50';
                else if (isSelected) cls += 'border-red-400 bg-red-50';
                else cls += 'border-gray-100 opacity-60';
                return (
                  <div key={label} className={cls} onClick={() => handleAnswer(label)}>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${answered && isCorrect ? 'bg-green-600 border-green-600 text-white' : answered && isSelected ? 'bg-red-400 border-red-400 text-white' : 'border-gray-300 text-gray-500'}`}>
                      {label}
                    </div>
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                );
              })}
            </div>
            {answered && q.explanation && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-orange-500">
                <p className="text-xs font-medium text-orange-600 mb-2">💡 解説</p>
                <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            {answered && (
              <button onClick={handleNext} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600">
                {current + 1 < wrongQuestions.length ? '次の問題 →' : '結果を見る'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">復</span>
          </div>
          <span className="font-semibold">復習モード</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
      </nav>
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">復習モード</h1>
        <p className="text-gray-500 text-sm mb-8">問題を選んで復習しましょう。間違えた問題は繰り返し出題されます。</p>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-2">全問復習</h2>
            <p className="text-sm text-gray-500 mb-4">保存されている全{questions.length}問を復習します。</p>
            {questions.length > 0 ? (
              <button onClick={() => handleStart([...questions])}
                className="w-full bg-orange-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-orange-600">
                全問復習を始める（{questions.length}問）
              </button>
            ) : (
              <div className="text-center py-4 text-gray-400">
                <p className="text-sm">問題がありません</p>
                <Link href="/questions/new" className="text-xs text-green-600 hover:underline mt-2 inline-block">問題を追加する</Link>
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="bg-white rounded-2xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-2">科目別復習</h2>
              <p className="text-sm text-gray-500 mb-4">科目を選んで復習します。</p>
              <div className="space-y-2">
                {Array.from(new Set(questions.map(q => q.subject ?? 'その他'))).map(subject => {
                  const subjectQuestions = questions.filter(q => (q.subject ?? 'その他') === subject);
                  return (
                    <button key={subject} onClick={() => handleStart([...subjectQuestions])}
                      className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors">
                      <span className="text-sm font-medium text-gray-900">{subject}</span>
                      <span className="text-xs text-gray-400">{subjectQuestions.length}問 →</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
