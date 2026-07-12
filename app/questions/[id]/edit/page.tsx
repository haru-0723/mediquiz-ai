'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/Logo';

export default function EditQuestionPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [answer, setAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('ログインが必要です'); setLoading(false); return; }
      const { data, error: fetchError } = await supabase
        .from('questions').select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single();
      if (fetchError || !data) { setError('問題が見つかりません'); setLoading(false); return; }
      setSubject(data.subject ?? '');
      setQuestion(data.question);
      setOptionA(data.option_a);
      setOptionB(data.option_b);
      setOptionC(data.option_c);
      setOptionD(data.option_d);
      setAnswer(data.answer);
      setExplanation(data.explanation ?? '');
      setDifficulty(data.difficulty);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSave() {
    if (!question || !optionA || !optionB || !optionC || !optionD) {
      setError('問題文と選択肢A〜Dは必須です');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');
      const { error: saveError } = await supabase.from('questions').update({
        subject: subject || null,
        question,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        answer,
        explanation: explanation || null,
        difficulty,
      }).eq('id', params.id).eq('user_id', user.id);
      if (saveError) throw saveError;
      router.push('/questions');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-xl items-center justify-between px-8">
          <Logo href="/dashboard" />
          <Link href="/questions" className="text-sm text-slate-500">問題一覧へ戻る</Link>
        </nav>
      </header>

      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">問題を編集</h1>
        <p className="text-slate-500 text-sm mb-8">問題の内容を編集できます。</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">科目（任意）</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="例：循環器系" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">問題文 *</label>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="問題文を入力してください" />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">選択肢 *</label>
            {[
              { label: 'A', value: optionA, set: setOptionA },
              { label: 'B', value: optionB, set: setOptionB },
              { label: 'C', value: optionC, set: setOptionC },
              { label: 'D', value: optionD, set: setOptionD },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-sm font-medium text-slate-600 flex-shrink-0">
                  {label}
                </div>
                <input type="text" value={value} onChange={e => set(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder={`選択肢${label}`} />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">正解 *</label>
            <div className="grid grid-cols-4 gap-2">
              {['A', 'B', 'C', 'D'].map(l => (
                <button key={l} onClick={() => setAnswer(l)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${answer === l ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">難易度</label>
            <div className="grid grid-cols-3 gap-2">
              {[{ value: 'easy', label: '基礎' }, { value: 'medium', label: '標準' }, { value: 'hard', label: '応用' }].map(d => (
                <button key={d.value} onClick={() => setDifficulty(d.value)}
                  className={`py-2.5 rounded-xl text-sm border transition-colors ${difficulty === d.value ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">解説（任意）</label>
            <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="解説を入力してください" />
          </div>

          {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="flex gap-3">
            <Link href="/questions" className="flex-1 border border-slate-200 rounded-xl py-3 text-sm text-slate-600 text-center hover:border-slate-300">
              キャンセル
            </Link>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
