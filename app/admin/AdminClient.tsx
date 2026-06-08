'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Question = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string | null;
  subject: string | null;
  difficulty: string;
};

type Report = {
  id: string;
  question_id: string;
  user_id: string;
  reason: string;
  created_at: string;
  questions: Question | null;
};

export default function AdminClient({ reports: initialReports }: { reports: Report[] }) {
  const supabase = createClient();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleDeleteQuestion(questionId: string, reportId: string) {
    if (!confirm('この問題を削除しますか？関連するレポートも削除されます。')) return;
    setDeleting(questionId);
    await supabase.from('questions').delete().eq('id', questionId);
    setReports(reports.filter(r => r.question_id !== questionId));
    setDeleting(null);
  }

  function startEdit(q: Question) {
    setEditForm({ ...q });
    setEditingId(q.id);
  }

  async function handleSaveEdit(questionId: string) {
    setSavingEdit(true);
    await supabase.from('questions').update({
      question: editForm.question,
      option_a: editForm.option_a,
      option_b: editForm.option_b,
      option_c: editForm.option_c,
      option_d: editForm.option_d,
      answer: editForm.answer,
      explanation: editForm.explanation,
    }).eq('id', questionId);
    setReports(reports.map(r =>
      r.question_id === questionId
        ? { ...r, questions: { ...r.questions!, ...editForm } as Question }
        : r
    ));
    setEditingId(null);
    setSavingEdit(false);
  }

  async function handleDismissReport(reportId: string) {
    if (!confirm('このレポートを却下しますか？（問題は削除しません）')) return;
    setDismissing(reportId);
    await supabase.from('question_reports').delete().eq('id', reportId);
    setReports(reports.filter(r => r.id !== reportId));
    setDismissing(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">管</span>
          </div>
          <span className="font-semibold">管理者ページ</span>
        </div>
        <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ戻る</Link>
      </nav>

      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">報告された問題</h1>
            <p className="text-gray-500 text-sm mt-1">全{reports.length}件の報告</p>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 text-sm">報告された問題はありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-2xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full font-medium">
                      報告理由：{report.reason}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(report.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {report.questions && (
                      <button
                        onClick={() => startEdit(report.questions!)}
                        className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors">
                        編集
                      </button>
                    )}
                    <button
                      onClick={() => handleDismissReport(report.id)}
                      disabled={dismissing === report.id}
                      className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                      {dismissing === report.id ? '処理中...' : '却下する'}
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(report.question_id, report.id)}
                      disabled={deleting === report.question_id}
                      className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                      {deleting === report.question_id ? '削除中...' : '問題を削除'}
                    </button>
                  </div>
                </div>

                {editingId === report.question_id && report.questions ? (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <textarea
                      value={editForm.question ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, question: e.target.value }))}
                      rows={3}
                      placeholder="問題文"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((key, i) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-4">{['A','B','C','D'][i]}</span>
                        <input type="text" value={editForm[key] ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">正解</span>
                      <select value={editForm.answer ?? 'A'}
                        onChange={e => setEditForm(f => ({ ...f, answer: e.target.value }))}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option>A</option><option>B</option><option>C</option><option>D</option>
                      </select>
                    </div>
                    <textarea
                      value={editForm.explanation ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, explanation: e.target.value }))}
                      rows={3}
                      placeholder="解説"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg">
                        キャンセル
                      </button>
                      <button onClick={() => handleSaveEdit(report.question_id)} disabled={savingEdit}
                        className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-60">
                        {savingEdit ? '保存中...' : '保存する'}
                      </button>
                    </div>
                  </div>
                ) : report.questions ? (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex gap-2 mb-3">
                      {report.questions.subject && (
                        <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                          {report.questions.subject}
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                        {report.questions.difficulty === 'easy' ? '基礎' : report.questions.difficulty === 'hard' ? '応用' : '標準'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-3">{report.questions.question}</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { label: 'A', text: report.questions.option_a },
                        { label: 'B', text: report.questions.option_b },
                        { label: 'C', text: report.questions.option_c },
                        { label: 'D', text: report.questions.option_d },
                      ].map(({ label, text }) => (
                        <div key={label} className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${report.questions?.answer === label ? 'bg-green-50 text-green-700 font-medium' : 'bg-white text-gray-600'}`}>
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${report.questions?.answer === label ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {label}
                          </span>
                          {text}
                        </div>
                      ))}
                    </div>
                    {report.questions.explanation && (
                      <p className="text-xs text-gray-500 p-3 bg-white rounded-lg">
                        <span className="font-medium text-green-600">💡 解説：</span>
                        {report.questions.explanation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-400">この問題はすでに削除されています</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
