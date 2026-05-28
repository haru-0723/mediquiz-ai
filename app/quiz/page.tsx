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

export default function QuizPage() {
  const supabase = createClient();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');
  const [selectedSubject, setSelectedSubject] = useState('すべて');

  useEffect(() => {
    supabase.from('questions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAllQuestions(data);
      setLoading(false);
    });
  }, []);

  const subjects = ['すべて', ...Array.from(new Set(allQuestions.map(q => q.subject ?? 'その他')))];

  function handleStart() {
    const filtered = selectedSubject === 'すべて'
      ? allQuestions
      : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject);
    const shuffled = filtered.sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setPhase('quiz');
  }

  function handleAnswer(letter: string) {
    if (answered) return;
    setSelected(letter);
    setAnswered(true);
  }

  async function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      const correct = newResults.filter(r => r.correct).length;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('quiz_sessions').insert({
          user_id: user.id,
          subject: selectedSubject === 'すべて' ? '総合' : selectedSubject,
          total_questions: newResults.length,
          correct_count: correct,
        });
      }
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">演習完了！</h2>
          <p className="text-5xl font-bold text-green-600 mb-2">{accuracy}%</p>
          <p className="text-gray-500 mb-8">{results.length}問中 {correct}問正解</p>
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => setPhase('select')}
              className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium">
              もう一度
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'select') {
    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">M</span>
            </div>
            <span className="font-semibold">MediQuiz AI</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
        </nav>
        <div className="max-w-xl mx-auto p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">演習を始める</h1>
          <p className="text-gray-500 text-sm mb-8">科目を選んで演習しましょう。</p>
          <div className="bg-white rounded-2xl border p-8 space-y-5">
            {allQuestions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-4">まだ問題がありません</p>
                <Link href="/questions/new" className="bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-medium">
                  問題を追加する
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">科目を選択</label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                      <button key={s} onClick={() => setSelectedSubject(s)}
                        className={`px-4 py-2 rounded-xl text-sm border transition-colors ${selectedSubject === s ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    問題数：<span className="font-semibold text-gray-900">
                      {selectedSubject === 'すべて' ? allQuestions.length : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject).length}問
                    </span>
                  </p>
                </div>
                <button onClick={handleStart}
                  className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700">
                  ⚡ 演習を始める
                </button>
              </>
            )}
          </div>
          <div className="mt-4 text-center">
            <Link href="/questions/new" className="text-sm text-green-600 hover:underline">+ 問題を追加する</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[current];
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
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
      </nav>
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
          <span>{current + 1} / {questions.length}問</span>
          <span>正解率 {accuracy}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
        </div>
        <div className="bg-white rounded-2xl border p-6 mb-4">
          <div className="flex gap-2 mb-4">
            {q.subject && <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
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
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-green-500">
              <p className="text-xs font-medium text-green-600 mb-2">💡 解説</p>
              <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <Link href="/questions/new" className="text-sm text-gray-400 hover:text-gray-600">+ 問題を追加</Link>
          {answered && (
            <button onClick={handleNext} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
              {current + 1 < questions.length ? '次の問題 →' : '結果を見る'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
