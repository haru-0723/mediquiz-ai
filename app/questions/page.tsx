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
  user_id: string;
};

const DIFF_LABEL: Record<string, string> = { easy: '基礎', medium: '標準', hard: '応用' };

export default function QuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<string>('free');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);
  const [showPlanError, setShowPlanError] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        if (profile) setPlan(profile.plan ?? 'free');
      }
      const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (data) setQuestions(data);
      setLoading(false);
    }
    load();
  }, []);

  const uniqueSubjects = Array.from(new Set(questions.map(q => q.subject).filter((s): s is string => !!s)));
  const filteredQuestions = subjectFilter === 'all' ? questions : questions.filter(q => q.subject === subjectFilter);

  async function handleDelete(id: string) {
    if (!confirm('この問題を削除しますか？')) return;
    setDeleting(id);
    await supabase.from('questions').delete().eq('id', id);
    setQuestions(questions.filter(q => q.id !== id));
    setDeleting(null);
  }

  async function handleReport(questionId: string) {
    if (!reportReason.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('question_reports').insert({
      question_id: questionId,
      user_id: user.id,
      reason: reportReason,
    });
    const next = new Set<string>(reported);
    next.add(questionId);
    setReported(next);
    setReporting(null);
    setReportReason('');
    alert('レポートを送信しました。ご協力ありがとうございます。');
  }

  async function handleExportPDF() {
    if (plan === 'free') {
      setShowPlanError(true);
      return;
    }
    if (filteredQuestions.length === 0) {
      alert('エクスポートする問題がありません');
      return;
    }

    setExporting(true);
    setShowPlanError(false);

    try {
      const container = document.createElement('div');
      container.style.cssText = [
        'position:absolute',
        'left:-9999px',
        'top:0',
        'width:794px',
        'background:white',
        'padding:56px 56px 40px',
        'font-family:sans-serif',
        'color:#111',
        'font-size:14px',
        'line-height:1.6',
      ].join(';');

      const titleEl = document.createElement('h1');
      titleEl.textContent = 'MediQuiz AI — 問題集';
      titleEl.style.cssText = 'font-size:22px;font-weight:700;margin:0 0 6px;color:#111;';
      container.appendChild(titleEl);

      const metaEl = document.createElement('p');
      const filterLabel = subjectFilter !== 'all' ? ` ／ 科目：${subjectFilter}` : '';
      metaEl.textContent = `全${filteredQuestions.length}問${filterLabel}`;
      metaEl.style.cssText = 'font-size:13px;color:#888;margin:0 0 36px;';
      container.appendChild(metaEl);

      filteredQuestions.forEach((q, i) => {
        const card = document.createElement('div');
        card.style.cssText = 'margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid #e5e7eb;';

        const badges = document.createElement('div');
        badges.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap;';

        const qNum = document.createElement('span');
        qNum.textContent = `Q${i + 1}`;
        qNum.style.cssText = 'font-size:11px;color:#aaa;font-weight:600;';
        badges.appendChild(qNum);

        if (q.subject) {
          const sb = document.createElement('span');
          sb.textContent = q.subject;
          sb.style.cssText = 'font-size:11px;background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:999px;';
          badges.appendChild(sb);
        }

        const db = document.createElement('span');
        db.textContent = DIFF_LABEL[q.difficulty] ?? q.difficulty;
        db.style.cssText = 'font-size:11px;background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:999px;';
        badges.appendChild(db);
        card.appendChild(badges);

        const qText = document.createElement('p');
        qText.textContent = q.question;
        qText.style.cssText = 'font-size:14px;font-weight:600;color:#111;margin:0 0 12px;line-height:1.7;';
        card.appendChild(qText);

        const optKeys: Array<keyof Question> = ['option_a', 'option_b', 'option_c', 'option_d'];
        const optLabels = ['A', 'B', 'C', 'D'];
        optKeys.forEach((key, idx) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:8px;margin-bottom:5px;align-items:flex-start;';
          const lbl = document.createElement('span');
          lbl.textContent = optLabels[idx] + '.';
          lbl.style.cssText = 'font-size:13px;color:#666;min-width:22px;flex-shrink:0;padding-top:1px;';
          const txt = document.createElement('span');
          txt.textContent = q[key] as string;
          txt.style.cssText = 'font-size:13px;color:#333;line-height:1.6;';
          row.appendChild(lbl);
          row.appendChild(txt);
          card.appendChild(row);
        });

        const ansBox = document.createElement('div');
        ansBox.style.cssText = 'margin-top:14px;padding:10px 14px;background:#f9fafb;border-radius:8px;border-left:3px solid #16a34a;';
        const ansLine = document.createElement('p');
        ansLine.textContent = `正解：${q.answer}`;
        ansLine.style.cssText = 'font-size:12px;font-weight:700;color:#16a34a;margin:0 0 4px;';
        ansBox.appendChild(ansLine);
        if (q.explanation) {
          const expLine = document.createElement('p');
          expLine.textContent = q.explanation;
          expLine.style.cssText = 'font-size:12px;color:#555;margin:0;line-height:1.6;';
          ansBox.appendChild(expLine);
        }
        card.appendChild(ansBox);
        container.appendChild(card);
      });

      document.body.appendChild(container);

      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      document.body.removeChild(container);

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const pageH = 297;
      const canvasW = canvas.width;
      const pageHpx = Math.round((pageH / pageW) * canvasW);

      let offsetY = 0;
      let pageIndex = 0;
      while (offsetY < canvas.height) {
        if (pageIndex > 0) pdf.addPage();
        const chunk = document.createElement('canvas');
        chunk.width = canvasW;
        chunk.height = pageHpx;
        const ctx = chunk.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasW, pageHpx);
          ctx.drawImage(canvas, 0, -offsetY);
        }
        pdf.addImage(chunk.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH);
        offsetY += pageHpx;
        pageIndex++;
      }

      const fileName = subjectFilter !== 'all'
        ? `MediQuiz_${subjectFilter}.pdf`
        : 'MediQuiz_問題集.pdf';
      pdf.save(fileName);
    } catch (e) {
      console.error(e);
      alert('PDFの生成に失敗しました。もう一度お試しください。');
    } finally {
      setExporting(false);
    }
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">問題一覧</h1>
            <p className="text-gray-500 text-sm mt-1">
              {filteredQuestions.length === questions.length
                ? `全${questions.length}問`
                : `${filteredQuestions.length}問（全${questions.length}問中）`}
            </p>
          </div>
          <Link href="/questions/new" className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
            + 問題を追加
          </Link>
        </div>

        {questions.length > 0 && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            {uniqueSubjects.length > 0 && (
              <select
                value={subjectFilter}
                onChange={e => { setSubjectFilter(e.target.value); setShowPlanError(false); }}
                className="text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="all">すべての科目</option>
                {uniqueSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <div className="flex flex-col items-start gap-1">
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    生成中...
                  </>
                ) : '📄 PDFで出力する'}
              </button>
              {showPlanError && (
                <p className="text-xs text-orange-600">
                  スタンダードプランの機能です。
                  <Link href="/pricing" className="underline ml-1">アップグレードする →</Link>
                </p>
              )}
            </div>
          </div>
        )}

        {filteredQuestions.length > 0 ? (
          <div className="space-y-4">
            {filteredQuestions.map((q, i) => (
              <div key={q.id} className="bg-white rounded-2xl border p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex gap-2">
                    {q.subject && <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
                    <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                      {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Q{i + 1}</span>
                    {currentUserId === q.user_id && (
                      <>
                        <Link href={`/questions/${q.id}/edit`}
                          className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors">
                          編集
                        </Link>
                        <button onClick={() => handleDelete(q.id)} disabled={deleting === q.id}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-60">
                          {deleting === q.id ? '削除中...' : '削除'}
                        </button>
                      </>
                    )}
                    {currentUserId !== q.user_id && (
                      <button onClick={() => reported.has(q.id) ? null : setReporting(q.id)}
                        className={`text-xs px-3 py-1 rounded-lg border transition-colors ${reported.has(q.id) ? 'text-gray-300 border-gray-100 cursor-not-allowed' : 'text-orange-400 hover:text-orange-600 border-orange-200 hover:border-orange-400'}`}>
                        {reported.has(q.id) ? '報告済み' : '報告'}
                      </button>
                    )}
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

                {reporting === q.id && (
                  <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <p className="text-sm font-medium text-orange-700 mb-2">問題を報告する</p>
                    <div className="space-y-2 mb-3">
                      {['問題文・選択肢が不正確', '解説が間違っている', '不適切なコンテンツ', 'その他'].map(reason => (
                        <button key={reason} onClick={() => setReportReason(reason)}
                          className={`block w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${reportReason === reason ? 'bg-orange-200 border-orange-400 text-orange-800' : 'bg-white border-orange-200 text-gray-600 hover:border-orange-300'}`}>
                          {reason}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setReporting(null); setReportReason(''); }}
                        className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-500">
                        キャンセル
                      </button>
                      <button onClick={() => handleReport(q.id)} disabled={!reportReason}
                        className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-60">
                        報告する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 mb-4">
              {questions.length > 0 ? 'この科目の問題はありません' : 'まだ問題がありません'}
            </p>
            {questions.length === 0 && (
              <Link href="/questions/new" className="bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-green-700">
                最初の問題を追加する
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
