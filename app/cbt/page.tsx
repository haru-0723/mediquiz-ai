'use client';

import { useState, useEffect, useCallback } from 'react';
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

type Answer = {
  questionId: string;
  selected: string | null;
  isCorrect: boolean;
};

export default function CBTPage() {
  const supabase = createClient();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(10);
  const [selectedSubject, setSelectedSubject] = useState('すべて');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    supabase.from('questions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setAllQuestions(data);
      setLoading(false);
    });
  }, []);

  const handleFinish = useCallback((currentAnswers: Answer[], currentQuestions: Question[]) => {
    // 未回答の問題を不正解として記録
    const remaining = currentQuestions.slice(currentAnswers.length);
    const finalAnswers = [
      ...currentAnswers,
      ...remaining.map(q => ({ questionId: q.id, selected: null, isCorrect: false }))
    ];
    setAnswers(finalAnswers);
    setPhase('result');
  }, []);

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (timeLeft <= 0) {
      handleFinish(answers, questions);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft, answers, questions, handleFinish]);

  function handleStart() {
    const filtered = selectedSubject === 'すべて'
      ? allQuestions
      : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject);
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    setQuestions(selected);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setTimeLeft(timeLimit * 60);
    setShowResult(false);
    setPhase('quiz');
  }

  function handleAnswer(letter: string) {
    setSelected(letter);
  }

  function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.answer;
    const newAnswers = [...answers, { questionId: q.id, selected, isCorrect }];
    setAnswers(newAnswers);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      handleFinish(newAnswers, questions);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const subjects = ['すべて', ...Array.from(new Set(allQuestions.map(q => q.subject ?? 'その他')))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = answers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correct / answers.length) * 100);
    const subjectStats = allQuestions.reduce((acc, q) => {
      const subject = q.subject ?? 'その他';
      const answer = answers.find(a => a.questionId === q.id);
      if (!answer) return acc;
      if (!acc[subject]) acc[subject] = { correct: 0, total: 0 };
      acc[subject].total++;
      if (answer.isCorrect) acc[subject].correct++;
      return acc;
    }, {} as Record<string, { correct: number; total: number }>);

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CBT</span>
            </div>
            <span className="font-semibold">CBT模試モード</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ</Link>
        </nav>

        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-2xl border p-8 text-center mb-6">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">模試結果</h2>
            <p className="text-5xl font-bold text-blue-600 mb-2">{accuracy}%</p>
            <p className="text-gray-500 mb-2">{answers.length}問中 {correct}問正解</p>
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mt-2 ${accuracy >= 80 ? 'bg-green-100 text-green-700' : accuracy >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
              {accuracy >= 80 ? '🎉 優秀！合格圏内です' : accuracy >= 60 ? '📚 もう少し頑張りましょう' : '💪 基礎から復習しましょう'}
            </div>
          </div>

          {Object.keys(subjectStats).length > 0 && (
            <div className="bg-white rounded-2xl border p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">🔍 苦手分野分析</h3>
              <div className="space-y-3">
                {Object.entries(subjectStats)
                  .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
                  .map(([subject, stat]) => {
                    const pct = Math.round((stat.correct / stat.total) * 100);
                    return (
                      <div key={subject}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{subject}</span>
                          <span className={`font-medium ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">📝 問題別結果</h3>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const answer = answers[i];
                return (
                  <div key={q.id} className={`p-4 rounded-xl border ${answer?.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-lg flex-shrink-0 ${answer?.isCorrect ? '✅' : '❌'}`}>
                        {answer?.isCorrect ? '✅' : '❌'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">Q{i + 1}. {q.question}</p>
                        <p className="text-xs text-gray-500">正解：{q.answer}　あなた：{answer?.selected ?? '未回答'}</p>
                        {!answer?.isCorrect && q.explanation && (
                          <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded-lg">💡 {q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => setPhase('select')}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700">
              もう一度挑戦
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[current];
    const options = [
      { label: 'A', text: q.option_a },
      { label: 'B', text: q.option_b },
      { label: 'C', text: q.option_c },
      { label: 'D', text: q.option_d },
    ];
    const isUrgent = timeLeft <= 60;

    return (
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">CBT</span>
            </div>
            <span className="font-semibold">CBT模試モード</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
            <button onClick={() => handleFinish(answers, questions)}
              className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1 rounded-lg">
              終了
            </button>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto p-8">
          <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
            <span>{current + 1} / {questions.length}問</span>
            <span>{Math.round((answers.filter(a => a.isCorrect).length / Math.max(answers.length, 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>

          <div className="bg-white rounded-2xl border p-6 mb-4">
            <div className="flex gap-2 mb-4">
              {q.subject && <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                {q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}
              </span>
            </div>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q.question}</p>
            <div className="space-y-3">
              {options.map(({ label, text }) => {
                const isSelected = selected === label;
                const isCorrect = label === q.answer;
                let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                if (!showResult) {
                  cls += isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300';
                } else {
                  if (isCorrect) cls += 'border-green-500 bg-green-50';
                  else if (isSelected) cls += 'border-red-400 bg-red-50';
                  else cls += 'border-gray-100 opacity-60';
                }
                return (
                  <div key={label} className={cls} onClick={() => !showResult && handleAnswer(label)}>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0
                      ${showResult && isCorrect ? 'bg-green-600 border-green-600 text-white' :
                        showResult && isSelected ? 'bg-red-400 border-red-400 text-white' :
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' :
                        'border-gray-300 text-gray-500'}`}>
                      {label}
                    </div>
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                );
              })}
            </div>
            {showResult && q.explanation && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                <p className="text-xs font-medium text-blue-600 mb-2">💡 解説</p>
                <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">{answers.length}問回答済み</span>
            <div className="flex gap-3">
              {!showResult && selected && (
                <button onClick={() => setShowResult(true)}
                  className="border border-blue-300 text-blue-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50">
                  解説を見る
                </button>
              )}
              {selected && (
                <button onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                  {current + 1 < questions.length ? '次の問題 →' : '結果を見る'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">CBT</span>
          </div>
          <span className="font-semibold">CBT模試モード</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
      </nav>

      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">CBT模試モード</h1>
        <p className="text-gray-500 text-sm mb-8">本番さながらの模試形式で実力を試しましょう。</p>

        <div className="bg-white rounded-2xl border p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">出題範囲</label>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${selectedSubject === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">問題数</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 40, 100].map(n => {
                const available = selectedSubject === 'すべて'
                  ? allQuestions.length
                  : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject).length;
                return (
                  <button key={n} onClick={() => setQuestionCount(n)} disabled={n > available}
                    className={`py-2.5 rounded-xl text-sm border transition-colors ${questionCount === n ? 'bg-blue-600 text-white border-blue-600' : n > available ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {n}問
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              現在の問題数：{selectedSubject === 'すべて' ? allQuestions.length : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject).length}問
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">制限時間：{timeLimit}分</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 60].map(t => (
                <button key={t} onClick={() => setTimeLimit(t)}
                  className={`py-2.5 rounded-xl text-sm border transition-colors ${timeLimit === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t}分
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleStart}
            disabled={allQuestions.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {allQuestions.length === 0 ? '問題がありません' : '🎯 模試を開始する'}
          </button>
        </div>

        {allQuestions.length < 10 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-700">⚠️ 問題数が少ないです。より充実した模試のために問題を追加しましょう。</p>
            <Link href="/questions/new" className="text-xs text-yellow-600 hover:underline mt-1 inline-block">+ 問題を追加する</Link>
          </div>
        )}
      </div>
    </div>
  );
}
