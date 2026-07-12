'use client';

import { useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Exam = { id: string; name: string; exam_date: string; };

export default function ExamSection({ userId, initialExams }: { userId: string; initialExams: Exam[] }) {
  const supabase = createClient();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  function daysUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  async function addExam() {
    if (!name || !date) return;
    setSaving(true);
    const { data } = await supabase
      .from('exams')
      .insert({ user_id: userId, name, exam_date: date })
      .select()
      .single();
    if (data) {
      setExams([...exams, data]);
      setName('');
      setDate('');
      setAdding(false);
    }
    setSaving(false);
  }

  async function deleteExam(id: string) {
    await supabase.from('exams').delete().eq('id', id);
    setExams(exams.filter(e => e.id !== id));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-slate-500" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-slate-900">試験カウントダウン</h2>
      </div>

      {exams.length > 0 ? (
        <div className="mb-3 space-y-2.5">
          {exams.map(exam => {
            const days = daysUntil(exam.exam_date);
            const urgent = days <= 30;
            return (
              <div key={exam.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{exam.name}</p>
                  <p className="text-xs text-slate-400">{exam.exam_date}</p>
                </div>
                <div className="ml-3 flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-xl font-bold leading-none ${urgent ? 'text-rose-500' : 'text-emerald-600'}`}>{days}</p>
                    <p className="text-xs text-slate-400">日後</p>
                  </div>
                  <button onClick={() => deleteExam(exam.id)} className="text-lg text-slate-300 hover:text-rose-400" aria-label="削除">×</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-3 py-4 text-center text-sm text-slate-400">試験日が登録されていません</p>
      )}

      {adding ? (
        <div className="space-y-2">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="試験名（例：看護師国家試験）"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setName(''); setDate(''); }}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">
              キャンセル
            </button>
            <button onClick={addExam} disabled={saving || !name || !date}
              className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
              {saving ? '追加中...' : '追加する'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600">
          <Plus className="h-4 w-4" strokeWidth={2} />
          試験日を追加
        </button>
      )}
    </div>
  );
}
