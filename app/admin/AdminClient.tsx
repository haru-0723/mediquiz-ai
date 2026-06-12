'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import type { UsageStats } from './page';

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

export default function AdminClient({ reports: initialReports, usageStats }: { reports: Report[]; usageStats: UsageStats }) {
  const supabase = createClient();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // refresh() はサーバーデータ再取得後に自動で再レンダリングされるため、短い遅延でフラグをリセット
    setTimeout(() => setRefreshing(false), 1000);
  }
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm('この問題を削除しますか？関連するレポートも削除されます。')) return;
    setDeleting(questionId);
    await supabase.from('question_reports').delete().eq('question_id', questionId);
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

  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto p-8">

        {/* 使用状況ダッシュボード */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">📊 使用状況ダッシュボード</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-60 transition-colors">
              {refreshing ? '更新中...' : '🔄 更新'}
            </button>
          </div>

          {/* 累計 / 今月 カード */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'AI問題生成', icon: '✨', total: usageStats.generateTotal, month: usageStats.generateMonth },
              { label: 'CBTモード',  icon: '🎯', total: usageStats.cbtTotal,      month: usageStats.cbtMonth },
              { label: '国試モード', icon: '📝', total: usageStats.kokushiTotal,  month: usageStats.kokushiMonth },
            ].map(({ label, icon, total, month }) => (
              <div key={label} className="bg-white rounded-2xl border p-5">
                <p className="text-xs text-gray-400 mb-1">{icon} {label}</p>
                <p className="text-3xl font-semibold text-gray-900 mb-1">{total.toLocaleString()}</p>
                <p className="text-xs text-gray-400">累計</p>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-lg font-semibold text-green-600">{month.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{monthLabel}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ユーザーランキング */}
          <div className="bg-white rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">🏆 AI利用回数ランキング（上位10名）</h3>
              <span className="text-xs text-gray-400">全{usageStats.totalUsers}名</span>
            </div>
            {usageStats.topUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">データがありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-400">
                      <th className="text-left pb-2 font-medium">順位</th>
                      <th className="text-left pb-2 font-medium">ユーザー</th>
                      <th className="text-left pb-2 font-medium">プラン</th>
                      <th className="text-right pb-2 font-medium">AI生成</th>
                      <th className="text-right pb-2 font-medium">CBT</th>
                      <th className="text-right pb-2 font-medium">国試</th>
                      <th className="text-right pb-2 font-medium">合計</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {usageStats.topUsers.map((u, i) => (
                      <tr key={u.userId} className="py-2">
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-700' :
                            i === 1 ? 'bg-gray-100 text-gray-600' :
                            i === 2 ? 'bg-orange-100 text-orange-600' :
                            'bg-gray-50 text-gray-400'
                          }`}>{i + 1}</span>
                        </td>
                        <td className="py-2.5 pr-3 max-w-[160px]">
                          {u.department || u.university ? (
                            <div>
                              <p className="text-xs font-medium text-gray-700 truncate">{u.department ?? '学部未設定'}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {[u.university, u.grade ? `${u.grade}年` : null].filter(Boolean).join(' · ') || '大学未設定'}
                              </p>
                            </div>
                          ) : (
                            <span className="font-mono text-xs text-gray-400">{u.userId.slice(0, 8)}…</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            u.plan === 'standard' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {u.plan === 'standard' ? '有料' : '無料'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-700">{u.generate}</td>
                        <td className="py-2.5 text-right text-gray-700">{u.cbt}</td>
                        <td className="py-2.5 text-right text-gray-700">{u.kokushi}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">{u.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

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
                      onClick={() => handleDeleteQuestion(report.question_id)}
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
                          onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value } as Partial<Question>))}
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
