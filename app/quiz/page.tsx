'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const questions = [
  { id: 1, subject: '循環器系', difficulty: '標準', question: '心臓の左心室から収縮期に血液を全身へ送り出す血管はどれか。', options: ['A. 大静脈', 'B. 大動脈', 'C. 肺動脈', 'D. 肺静脈'], answer: 'B', explanation: '左心室は体循環の起点で、収縮時に大動脈弁を通じて大動脈へ血液を送り出します。' },
  { id: 2, subject: '循環器系', difficulty: '基礎', question: '心電図のP波が表すのはどれか。', options: ['A. 心房の興奮', 'B. 心室の興奮', 'C. 心房の再分極', 'D. 心室の再分極'], answer: 'A', explanation: 'P波は洞結節からの電気信号が心房に伝わり、心房が興奮する様子を表します。' },
  { id: 3, subject: '呼吸器系', difficulty: '基礎', question: 'ガス交換が行われる部位はどれか。', options: ['A. 気管', 'B. 気管支', 'C. 肺胞', 'D. 気管支細動脈'], answer: 'C', explanation: '肺胞の周囲を毛細血管が取り囲んでおり、酸素と二酸化炭素のガス交換が行われます。' },
  { id: 4, subject: '薬理学', difficulty: '基礎', question: 'アセトアミノフェンの主な作用はどれか。', options: ['A. 解熱・鎮痛', 'B. 抗菌', 'C. 降圧', 'D. 利尿'], answer: 'A', explanation: 'アセトアミノフェンは中枢性の解熱鎮痛薬で、副作用が少なく小児にも使用できます。' },
  { id: 5, subject: '血液凝固', difficulty: '標準', question: '血液凝固に関与するビタミンはどれか。', options: ['A. ビタミンA', 'B. ビタミンC', 'C. ビタミンD', 'D. ビタミンK'], answer: 'D', explanation: 'ビタミンKは肝臓での凝固因子の合成に必要です。ワルファリンはビタミンKの作用を阻害します。' },
];

type Question = typeof questions[0];

function ResultScreen({ results, onRetry }: { results: { correct: boolean }[], onRetry: () => void }) {
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
          <button onClick={onRetry} className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium">
            もう一度
          </button>
        </div>
      </div>
    </div>
  );
}

function QuizScreen({ q, current, total, accuracy, answered, selected, onAnswer, onNext }: {
  q: Question, current: number, total: number, accuracy: number,
  answered: boolean, selected: string | null,
  onAnswer: (opt: string) => void, onNext: () => void
}) {
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
          <span>{current + 1} / {total}問</span>
          <span>正解率 {accuracy}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${(current / total) * 100}%` }} />
        </div>
        <div className="bg-white rounded-2xl border p-6 mb-4">
          <div className="flex gap-2 mb-4">
            <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>
            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{q.difficulty}</span>
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
                <div key={opt} className={cls} onClick={() => onAnswer(opt)}>
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
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">🔖 あとで復習</span>
          {answered && (
            <button onClick={onNext} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
              {current + 1 < total ? '次の問題 →' : '結果を見る'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizPage() {
  const supabase = createClient();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'quiz' | 'result'>('quiz');

  const q = questions[current];
  const accuracy = results.length > 0 ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;

  function handleAnswer(opt: string) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
  }

  async function handleNext() {
    const isCorrect = selected?.charAt(0) === q.answer;
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
          subject: '総合',
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
    setPhase('quiz');
  }

  if (phase === 'result') {
    return <ResultScreen results={results} onRetry={handleRetry} />;
  }

  return (
    <QuizScreen
      q={q}
      current={current}
      total={questions.length}
      accuracy={accuracy}
      answered={answered}
      selected={selected}
      onAnswer={handleAnswer}
      onNext={handleNext}
    />
  );
}
