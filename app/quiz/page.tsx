'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';

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
  folder_id: string | null;
};

type Folder = { id: string; name: string; };

export default function QuizPage() {
  const supabase = createClient();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('quiz');
  const [selectedSubject, setSelectedSubject] = useState('すべて');
  const [selectedFolder, setSelectedFolder] = useState('すべて');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: qData } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (qData) setAllQuestions(qData);
      const { data: fData } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at');
      if (fData) setFolders(fData);
      setLoading(false);
    }
    load();
    setPhase('select');
  }, []);

  const filteredByFolder = selectedFolder === 'すべて'
    ? allQuestions
    : selectedFolder === 'なし'
    ? allQuestions.filter(q => !q.folder_id)
    : allQuestions.filter(q => q.folder_id === selectedFolder);

  const filteredQuestions = selectedSubject === 'すべて'
    ? filteredByFolder
    : filteredByFolder.filter(q => (q.subject ?? 'その他') === selectedSubject);

  const subjects = ['すべて', ...Array.from(new Set(filteredByFolder.map(q => q.subject ?? 'その他')))];

  function handleStart() {
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    setQuizQuestions(shuffled);
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
    const q = quizQuestions[current];
    const isCorrect = selected === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);

    if (current + 1 < quizQuestions.length) {
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

  function handleRetry() {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setPhase('select');
  }

  function handleReviewWrong() {
    const wrong = quizQuestions.filter((_, i) => !results[i]?.correct);
    setQuizQuestions(wrong.sort(() => Math.random() - 0.5));
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setPhase('quiz');
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
    const wrongCount = results.length - correct;
    const isPerfect = wrongCount === 0;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">{isPerfect ? '🎉' : '🏆'}</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {isPerfect ? '全問正解！' : '演習完了！'}
          </h2>
          <p className="text-5xl font-bold text-green-600 mb-2">{accuracy}%</p>
          <p className="text-gray-500 mb-6">{results.length}問中 {correct}問正解</p>
          {!isPerfect && (
            <button onClick={handleReviewWrong}
              className="w-full bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 mb-3">
              🔁 間違えた問題を復習する（{wrongCount}問）
            </button>
          )}
          <div className="flex gap-3">
            <button onClick={() => window.location.href = '/dashboard'}
              className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">
              ダッシュボードへ
            </button>
            <button onClick={handleRetry}
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
        <Navbar />
        <div className="max-w-xl mx-auto p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">演習を始める</h1>
          <p className="text-gray-500 text-sm mb-8">フォルダや科目を選んで演習しましょう。</p>
          <div className="bg-white rounded-2xl border p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">フォルダで絞り込み</label>
              <div className="flex flex-wrap gap-2">
                {['すべて', 'なし', ...folders.map(f => f.id)].map((id, i) => {
                  const label = i === 0 ? 'すべて' : i === 1 ? 'フォルダなし' : folders[i - 2]?.name;
                  return (
                    <button key={id} onClick={() => { setSelectedFolder(id); setSelectedSubject('すべて'); }}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${selectedFolder === id ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      📁 {label}
                    </button>
                  );
                })}
              </div>
            </div>
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
                問題数：<span className="font-semibold text-gray-900">{filteredQuestions.length}問</span>
              </p>
            </div>
            {allQuestions.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-sm">まだ問題がありません</p>
                <Link href="/questions/new" className="text-xs text-green-600 hover:underline mt-2 inline-block">問題を追加する</Link>
              </div>
            ) : (
              <button onClick={handleStart} disabled={filteredQuestions.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                ⚡ 演習を始める
              </button>
            )}
          </div>
          <div className="mt-4 text-center">
            <Link href="/questions/new" className="text-sm text-green-600 hover:underline">+ 問題を追加する</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = quizQuestions[current];
  const accuracy = results.length > 0 ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;
  const options = [
    { label: 'A', text: q.option_a },
    { label: 'B', text: q.option_b },
    { label: 'C', text: q.option_c },
    { label: 'D', text: q.option_d },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
          <span>{current + 1} / {quizQuestions.length}問</span>
          <span>正解率 {accuracy}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${(current / quizQuestions.length) * 100}%` }} />
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
              {current + 1 < quizQuestions.length ? '次の問題 →' : '結果を見る'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
