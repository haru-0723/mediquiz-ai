'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Exam = { id: string; name: string; exam_date: string; };

export default function ExamSection({ userId, initialExams }: { userId: string; initialExams: Exam[] }) {
  const supabase = createClient();
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

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
    }
    setSaving(false);
  }

  async function deleteExam(id: string) {
    await supabase.from('exams').delete().eq('id', id);
    setExams(exams.filter(e => e.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border p-6">
      <h2 className="font-semibold text-gray-900 mb-4">試験カウントダウン</h2>

      {exams.length > 0 ? (
        <div className="space-y-3 mb-4">
          {exams.map(exam => {
            const days = daysUntil(exam.exam_date);
            return (
              <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{exam.name}</p>
                  <p className="text-xs text-gray-400">{exam.exam_date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-xl font-semibold ${days <= 30 ? 'text-red-500' : 'text-green-600'}`}>{days}</p>
                    <p className="text-xs text-gray-400">日後</p>
                  </div>
                  <button onClick={() => deleteExam(exam.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4 mb-4">試験日が登録されていません</p>
      )}

      <div className="space-y-2">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="試験名（例：看護師国家試験）"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button onClick={addExam} disabled={saving || !name || !date}
          className="w-full bg-green-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
          {saving ? '追加中...' : '+ 試験日を追加'}
        </button>
      </div>
    </div>
  );
}
