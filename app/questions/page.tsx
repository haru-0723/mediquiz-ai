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

export default function QuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('questions').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setQuestions(data);
      setLoading(false);
    });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('この問題を削除しますか？')) return;
    setDeleting(id);
    await supabase.from('questions').delete().eq('id', id);
    setQuestions(questions.filter(q => q.id !== id));
    setDeleting(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
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

      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">問題一覧</h1>
            <p className="text-gray-500 text-sm mt-1">全{questions.length}問</p>
          </div>
          <Link href="/questions/new" className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
            + 問題を追加
          </Link>
        </div>

        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-2xl border p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    {q.subject && <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
                    <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                      {q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">Q{i + 1}</span>
                    <Link href={`/questions/${q.id}/edit`}
  className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors">
  編集
</Link>
<button onClick={() => handleDelete(q.id)} disabled={deleting === q.id}
  className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-60">
  {deleting === q.id ? '削除中...' : '削除'}
</button>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-3">{q.question}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'A', text: q.option_a },
                    { label: 'B', text: q.option_b },
                    { label: 'C', text: q.option_c },
                    { label: 'D', text: q.option_d },
                  ].map(({ label, text }) => (
                    <div key={label} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${q.answer === label ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${q.answer === label ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        {label}
                      </span>
                      {text}
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-xs text-gray-500"><span className="font-medium text-green-600">💡 解説：</span>{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 mb-4">まだ問題がありません</p>
            <Link href="/questions/new" className="bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-green-700">
              最初の問題を追加する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
