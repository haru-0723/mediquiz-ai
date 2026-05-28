'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Material = { id: string; title: string; subject: string | null; };
type Question = { question: string; options: string[]; answer: string; explanation: string; difficulty: string; };

export default function GeneratePage() {
  const supabase = createClient();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');

  useEffect(() => {
    supabase.from('materials').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setMaterials(data);
    });
  }, []);

  async function handleGenerate() {
    if (!selectedId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId: selectedId, count }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions(data.questions);
      setCurrent(0);
      setResults([]);
      setSelected(null);
      setAnswered(false);
      setPhase('quiz');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '問題生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  }

  function handleAnswer(opt: string) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
  }

  function handleNext() {
    const q = questions[current];
    const isCorrect = selected?.charAt(0) === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase('result');
    }
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
            <button onClick={() => { setPhase('select'); setQuestions([]); }}
              className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium">
              もう一度生成
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[current];
    const accuracy = results.length > 0 ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;
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
              <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">AI生成問題</span>
              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}</span>
            </div>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q.question}</p>
            <div className="space-y-3">
              {q.options.map(opt => {
                const letter = opt.charAt(0);
                const isCorrect = letter === q.answer;
                const isSelected = selected?.charAt(0) === letter;
                let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                if (!answered) cls += 'border-gray-200 hover:border-gray-300';
                else if (isCorrect) cls += 'border-green-500 bg-green-50';
                else if (isSelected) cls += 'border-red-400 bg-red-50';
                else cls += 'border-gray-100 opacity-60';
                return (
                  <div key={opt} className={cls} onClick={() => handleAnswer(opt)}>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${answered && isCorrect ? 'bg-green-600 border-green-600 text-white' : answered && isSelected ? 'bg-red-400 border-red-400 text-white' : 'border-gray-300 text-gray-500'}`}>
                      {letter}
                    </div>
                    <span className="text-sm text-gray-700">{opt.slice(3)}</span>
                  </div>
                );
              })}
            </div>
            {answered && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-green-500">
                <p className="text-xs font-medium text-green-600 mb-2">💡 解説</p>
                <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
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
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">AI問題生成</h1>
        <p className="text-gray-500 text-sm mb-8">教材を選んでAIが問題を自動生成します。</p>
        <div className="bg-white rounded-2xl border p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">教材を選択</label>
            {materials.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                教材がありません。<Link href="/upload" className="text-green-600 hover:underline">アップロード</Link>してください。
              </div>
            ) : (
              <div className="space-y-2">
                {materials.map(m => (
                  <button key={m.id} onClick={() => setSelectedId(m.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${selectedId === m.id ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-sm font-medium text-gray-900">{m.title}</p>
                    {m.subject && <p className="text-xs text-gray-400 mt-0.5">{m.subject}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">問題数：{count}問</label>
            <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-green-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>3問</span><span>10問</span></div>
          </div>
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
          <button onClick={handleGenerate} disabled={!selectedId || generating}
            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
            {generating ? '🤖 AIが問題を生成中...' : '✨ 問題を生成する'}
          </button>
        </div>
      </div>
    </div>
  );
}
 
