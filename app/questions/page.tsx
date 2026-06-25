'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';

type Folder = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
};

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
  folder_id?: string | null;
};

type FolderFilter = 'all' | 'none' | string;

const DIFF_LABEL: Record<string, string> = { easy: '基礎', medium: '標準', hard: '応用' };

export default function QuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>('free');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Folder state
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>('all');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Question ops
  const [deleting, setDeleting] = useState<string | null>(null);
  const [movingQuestionId, setMovingQuestionId] = useState<string | null>(null);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set<string>());
  const [bulkTargetFolderId, setBulkTargetFolderId] = useState<string>('none');
  const [bulkMoving, setBulkMoving] = useState(false);

  // Export (PDF / Excel)
  const [exporting, setExporting] = useState(false);
  const [showPlanError, setShowPlanError] = useState(false);
  const [pdfMode, setPdfMode] = useState(false);
  const [pdfSelectedIds, setPdfSelectedIds] = useState<Set<string>>(new Set<string>());
  const [exportType, setExportType] = useState<'pdf' | 'excel'>('pdf');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    setSelectedIds(new Set<string>());
    setPdfMode(false);
    setPdfSelectedIds(new Set<string>());
  }, [selectedFolder]);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const [profileRes, foldersRes, questionsRes] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', user.id).single(),
      supabase.from('folders').select('*').eq('user_id', user.id).order('created_at'),
      supabase.from('questions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    if (profileRes.data) setPlan(profileRes.data.plan ?? 'free');
    if (foldersRes.data) setFolders(foldersRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data);
    setLoading(false);
  }

  const filteredQuestions = selectedFolder === 'all'
    ? questions
    : selectedFolder === 'none'
      ? questions.filter(q => !q.folder_id)
      : questions.filter(q => q.folder_id === selectedFolder);

  const folderCounts: Record<string, number> = {};
  let noFolderCount = 0;
  for (const q of questions) {
    if (q.folder_id) folderCounts[q.folder_id] = (folderCounts[q.folder_id] ?? 0) + 1;
    else noFolderCount++;
  }

  const currentFolderName =
    selectedFolder === 'all' ? '全問題' :
    selectedFolder === 'none' ? 'フォルダなし' :
    (folders.find(f => f.id === selectedFolder)?.name ?? '問題集');

  async function handleCreateFolder() {
    if (!newFolderName.trim() || !currentUserId) return;
    setCreatingFolder(true);
    const { data } = await supabase.from('folders').insert({ user_id: currentUserId, name: newFolderName.trim() }).select().single();
    if (data) setFolders(prev => [...prev, data as Folder]);
    setNewFolderName('');
    setShowNewFolder(false);
    setCreatingFolder(false);
  }

  async function handleDeleteFolder(folderId: string) {
    if (!confirm('このフォルダを削除しますか？\n（中の問題は「フォルダなし」に移動します）')) return;
    setDeletingFolderId(folderId);
    await supabase.from('folders').delete().eq('id', folderId);
    setFolders(prev => prev.filter(f => f.id !== folderId));
    setQuestions(prev => prev.map(q => q.folder_id === folderId ? { ...q, folder_id: null } : q));
    if (selectedFolder === folderId) setSelectedFolder('all');
    setDeletingFolderId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('この問題を削除しますか？')) return;
    setDeleting(id);
    await supabase.from('questions').delete().eq('id', id);
    setQuestions(prev => prev.filter(q => q.id !== id));
    const next = new Set<string>(selectedIds);
    next.delete(id);
    setSelectedIds(next);
    setDeleting(null);
  }

  async function handleMoveQuestion(questionId: string, targetFolderId: string) {
    const fid = targetFolderId === 'none' ? null : targetFolderId;
    await supabase.from('questions').update({ folder_id: fid }).eq('id', questionId);
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, folder_id: fid } : q));
    setMovingQuestionId(null);
  }

  async function handleBulkMove() {
    if (selectedIds.size === 0) return;
    setBulkMoving(true);
    const fid = bulkTargetFolderId === 'none' ? null : bulkTargetFolderId;
    const ids = Array.from(selectedIds);
    await supabase.from('questions').update({ folder_id: fid }).in('id', ids);
    setQuestions(prev => prev.map(q => selectedIds.has(q.id) ? { ...q, folder_id: fid } : q));
    setSelectedIds(new Set<string>());
    setBulkMoving(false);
  }

  function toggleSelect(id: string) {
    const next = new Set<string>(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setSelectedIds(next);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedIds(new Set<string>());
    } else {
      const next = new Set<string>();
      filteredQuestions.forEach(q => next.add(q.id));
      setSelectedIds(next);
    }
  }

  function handleExportPDF() {
    if (plan === 'free') { setShowPlanError(true); return; }
    if (filteredQuestions.length === 0) { alert('エクスポートする問題がありません'); return; }
    setShowPlanError(false);
    const all = new Set<string>();
    filteredQuestions.forEach(q => all.add(q.id));
    setPdfSelectedIds(all);
    setExportType('pdf');
    setPdfMode(true);
  }

  function handleExportExcel() {
    if (plan === 'free') { setShowPlanError(true); return; }
    if (filteredQuestions.length === 0) { alert('エクスポートする問題がありません'); return; }
    setShowPlanError(false);
    const all = new Set<string>();
    filteredQuestions.forEach(q => all.add(q.id));
    setPdfSelectedIds(all);
    setExportType('excel');
    setPdfMode(true);
  }

  function togglePdfSelect(id: string) {
    const next = new Set<string>(pdfSelectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    setPdfSelectedIds(next);
  }

  async function generateSelectedPDF() {
    const toExport = filteredQuestions.filter(q => pdfSelectedIds.has(q.id));
    if (toExport.length === 0) { alert('PDF化する問題を選択してください'); return; }

    setExporting(true);
    try {
      const h2c = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const PAGE_W = 210;
      const PAGE_H = 297;
      const MARGIN = 15;
      const CONTENT_W_MM = PAGE_W - MARGIN * 2; // 180mm
      const CONTENT_W_PX = 680; // ≈180mm at 96dpi
      const GAP_MM = 5;
      const optKeys: Array<keyof Question> = ['option_a', 'option_b', 'option_c', 'option_d'];

      let curY = MARGIN;

      // タイトルブロックを描画
      const titleDiv = document.createElement('div');
      titleDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_W_PX}px;background:white;font-family:sans-serif;padding:0;`;
      const h1 = document.createElement('h1');
      h1.style.cssText = 'font-size:19px;font-weight:700;margin:0 0 3px;color:#111;';
      h1.textContent = `MediQuiz AI — ${currentFolderName}`;
      const meta = document.createElement('p');
      meta.style.cssText = 'font-size:12px;color:#999;margin:0 0 14px;';
      meta.textContent = `${toExport.length}問`;
      const divider = document.createElement('hr');
      divider.style.cssText = 'border:none;border-top:2px solid #e5e7eb;margin:0;';
      titleDiv.appendChild(h1); titleDiv.appendChild(meta); titleDiv.appendChild(divider);
      document.body.appendChild(titleDiv);
      const titleCanvas = await h2c.default(titleDiv, { scale: 2, backgroundColor: '#ffffff', logging: false });
      document.body.removeChild(titleDiv);
      const titleHmm = CONTENT_W_MM * (titleCanvas.height / titleCanvas.width);
      pdf.addImage(titleCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, curY, CONTENT_W_MM, titleHmm);
      curY += titleHmm + 6;

      // 1問ずつ描画（ページ区切り制御）
      for (let idx = 0; idx < toExport.length; idx++) {
        const q = toExport[idx];

        const qDiv = document.createElement('div');
        qDiv.style.cssText = `position:absolute;left:-9999px;top:0;width:${CONTENT_W_PX}px;background:white;padding:12px 14px;border:1px solid #d1d5db;border-radius:8px;font-family:sans-serif;`;

        // バッジ行
        const badges = document.createElement('div');
        badges.style.cssText = 'display:flex;gap:5px;align-items:center;margin-bottom:8px;flex-wrap:wrap;';
        const qNumSpan = document.createElement('span');
        qNumSpan.textContent = `Q${idx + 1}`;
        qNumSpan.style.cssText = 'font-size:11px;color:#bbb;font-weight:600;';
        badges.appendChild(qNumSpan);
        if (q.subject) {
          const sb = document.createElement('span');
          sb.textContent = q.subject;
          sb.style.cssText = 'font-size:11px;background:#f0fdf4;color:#16a34a;padding:1px 7px;border-radius:999px;';
          badges.appendChild(sb);
        }
        const db = document.createElement('span');
        db.textContent = DIFF_LABEL[q.difficulty] ?? q.difficulty;
        db.style.cssText = 'font-size:11px;background:#f3f4f6;color:#6b7280;padding:1px 7px;border-radius:999px;';
        badges.appendChild(db);
        qDiv.appendChild(badges);

        // 問題文
        const qText = document.createElement('p');
        qText.textContent = q.question;
        qText.style.cssText = 'font-size:13px;font-weight:600;color:#111;margin:0 0 9px;line-height:1.65;';
        qDiv.appendChild(qText);

        // 選択肢A〜D（正解マークなし）
        ['A', 'B', 'C', 'D'].forEach((lbl, i) => {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;gap:7px;margin-bottom:4px;align-items:flex-start;';
          const l = document.createElement('span');
          l.textContent = lbl + '.';
          l.style.cssText = 'font-size:12px;color:#666;min-width:18px;flex-shrink:0;padding-top:1px;';
          const t = document.createElement('span');
          t.textContent = q[optKeys[i]] as string;
          t.style.cssText = 'font-size:12px;color:#333;line-height:1.55;';
          row.appendChild(l); row.appendChild(t);
          qDiv.appendChild(row);
        });

        // 正解 + 解説
        const ansBox = document.createElement('div');
        ansBox.style.cssText = 'margin-top:9px;padding:7px 11px;background:#f9fafb;border-radius:6px;border-left:3px solid #16a34a;';
        const ansLine = document.createElement('p');
        ansLine.textContent = `正解：${q.answer}`;
        ansLine.style.cssText = 'font-size:11px;font-weight:700;color:#16a34a;margin:0 0 2px;';
        ansBox.appendChild(ansLine);
        if (q.explanation) {
          const expLine = document.createElement('p');
          expLine.textContent = q.explanation;
          expLine.style.cssText = 'font-size:11px;color:#555;margin:0;line-height:1.55;';
          ansBox.appendChild(expLine);
        }
        qDiv.appendChild(ansBox);

        document.body.appendChild(qDiv);
        const qCanvas = await h2c.default(qDiv, { scale: 2, backgroundColor: '#ffffff', logging: false });
        document.body.removeChild(qDiv);

        const qHmm = CONTENT_W_MM * (qCanvas.height / qCanvas.width);

        // このページに収まらなければ改ページ
        if (curY + qHmm > PAGE_H - MARGIN) {
          pdf.addPage();
          curY = MARGIN;
        }

        pdf.addImage(qCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', MARGIN, curY, CONTENT_W_MM, qHmm);
        curY += qHmm + GAP_MM;
      }

      pdf.save(`MediQuiz_${currentFolderName}.pdf`);
      setPdfSelectedIds(new Set<string>());
    } catch (e) {
      console.error(e);
      alert('PDFの生成に失敗しました。もう一度お試しください。');
    } finally {
      setExporting(false);
    }
  }

  async function generateSelectedExcel() {
    const toExport = filteredQuestions.filter(q => pdfSelectedIds.has(q.id));
    if (toExport.length === 0) { alert('Excel出力する問題を選択してください'); return; }

    setExporting(true);
    try {
      const XLSX = await import('xlsx-js-style');

      const isMaruBatsu = toExport.every(q => q.answer === '○' || q.answer === '×');

      const rows = toExport.map((q, i) => {
        const base: Record<string, string | number> = {
          '番号': i + 1,
          '問題文': q.question,
          '選択肢A': isMaruBatsu ? `○ ${q.option_a}` : q.option_a,
          '選択肢B': isMaruBatsu ? `× ${q.option_b}` : q.option_b,
        };
        if (!isMaruBatsu) {
          base['選択肢C'] = q.option_c;
          base['選択肢D'] = q.option_d;
        }
        base['正解'] = isMaruBatsu
          ? (q.answer === '○' ? `○ ${q.option_a}` : `× ${q.option_b}`)
          : q.answer;
        base['解説'] = q.explanation ?? '';
        base['科目'] = q.subject ?? '';
        base['難易度'] = DIFF_LABEL[q.difficulty] ?? q.difficulty;
        return base;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = isMaruBatsu
        ? [{ wch: 6 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 6 }, { wch: 50 }, { wch: 12 }, { wch: 8 }]
        : [{ wch: 6 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 6 }, { wch: 50 }, { wch: 12 }, { wch: 8 }];

      // 全セルに折り返し・上揃えを設定
      const range = XLSX.utils.decode_range(ws['!ref']!);
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[addr]) continue;
          ws[addr].s = { alignment: { wrapText: true, vertical: 'top' } };
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentFolderName.slice(0, 31));
      XLSX.writeFile(wb, `MediQuiz_${currentFolderName}.xlsx`, { cellStyles: true });
      setPdfSelectedIds(new Set<string>());
    } catch (e) {
      console.error(e);
      alert('Excelの生成に失敗しました。もう一度お試しください。');
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

  const folderMoveOptions = [
    { value: 'none', label: 'フォルダなし' },
    ...folders.map(f => ({ value: f.id, label: f.name })),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">マイ問題集</h1>
            <p className="text-gray-500 text-sm mt-0.5">全{questions.length}問</p>
          </div>
          <Link href="/questions/new" className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
            + 問題を追加
          </Link>
        </div>

        {/* スマホ：横スクロールフォルダタブ */}
        <div className="sm:hidden -mx-4 px-4 overflow-x-auto flex gap-2 pb-3 mb-4">
          {[
            { id: 'all' as FolderFilter, label: 'すべて', count: questions.length },
            { id: 'none' as FolderFilter, label: 'フォルダなし', count: noFolderCount },
            ...folders.map(f => ({ id: f.id as FolderFilter, label: f.name, count: folderCounts[f.id] ?? 0 })),
          ].map(item => (
            <button key={item.id} onClick={() => setSelectedFolder(item.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${selectedFolder === item.id ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {item.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${selectedFolder === item.id ? 'bg-green-500' : 'bg-gray-100 text-gray-400'}`}>
                {item.count}
              </span>
            </button>
          ))}
          <button onClick={() => setShowNewFolder(true)}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-sm text-green-600 border border-dashed border-green-300 hover:bg-green-50">
            + フォルダ
          </button>
        </div>

        {/* スマホ：新規フォルダ作成 */}
        {showNewFolder && (
          <div className="sm:hidden bg-white border rounded-xl p-3 mb-4">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              placeholder="フォルダ名を入力"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
                className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg disabled:opacity-60">
                {creatingFolder ? '作成中...' : '作成'}
              </button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                className="flex-1 border text-sm py-2 rounded-lg text-gray-500">
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-5 items-start">
          {/* PC：左サイドバー */}
          <div className="hidden sm:flex flex-col w-52 shrink-0 gap-3">
            <div className="bg-white rounded-2xl border p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 mb-2">フォルダ</p>

              {/* すべて・フォルダなし */}
              {[
                { id: 'all' as FolderFilter, label: 'すべての問題', count: questions.length },
                { id: 'none' as FolderFilter, label: 'フォルダなし', count: noFolderCount },
              ].map(item => (
                <button key={item.id} onClick={() => setSelectedFolder(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${selectedFolder === item.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span>{item.label}</span>
                  <span className="text-xs text-gray-400">{item.count}</span>
                </button>
              ))}

              {folders.length > 0 && <hr className="my-2 border-gray-100" />}

              {/* ユーザーフォルダ */}
              {folders.map(f => (
                <div key={f.id} className="group flex items-center gap-1 mb-0.5">
                  <button onClick={() => setSelectedFolder(f.id)}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${selectedFolder === f.id ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span className="truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-1">{folderCounts[f.id] ?? 0}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(f.id)}
                    disabled={deletingFolderId === f.id}
                    className="p-1.5 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 flex-shrink-0"
                    title="フォルダを削除"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* フォルダ作成 */}
              {showNewFolder ? (
                <div className="mt-2">
                  <input
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="フォルダ名"
                    className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
                      className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded-lg disabled:opacity-60">
                      作成
                    </button>
                    <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
                      className="flex-1 border text-xs py-1.5 rounded-lg text-gray-500">
                      ×
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNewFolder(true)}
                  className="w-full mt-2 text-xs text-green-600 border border-dashed border-green-200 rounded-xl py-2 hover:bg-green-50 transition-colors">
                  + フォルダを作成
                </button>
              )}
            </div>
          </div>

          {/* メインコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* フォルダタイトル + PDF + 一括選択バー */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h2 className="text-base font-semibold text-gray-800 truncate">{currentFolderName}</h2>
                <span className="text-sm text-gray-400 flex-shrink-0">{filteredQuestions.length}問</span>
              </div>
              {!pdfMode && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {filteredQuestions.length > 0 && (
                    <button onClick={toggleSelectAll}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors">
                      {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? '選択解除' : '全選択'}
                    </button>
                  )}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <button onClick={handleExportPDF}
                        className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        📄 PDF
                      </button>
                      <button onClick={handleExportExcel}
                        className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        📊 Excel
                      </button>
                    </div>
                    {showPlanError && (
                      <p className="text-xs text-orange-600">
                        スタンダードプランの機能です。
                        <Link href="/pricing" className="underline ml-1">アップグレード →</Link>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* エクスポート選択モードバナー */}
            {pdfMode && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                <p className="text-sm font-medium text-orange-700 mb-2">
                  {exportType === 'pdf' ? '📄 PDFに含める問題を選んでください' : '📊 Excelに含める問題を選んでください'}
                  （{pdfSelectedIds.size}問選択中）
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => {
                    const all = new Set<string>();
                    filteredQuestions.forEach(q => all.add(q.id));
                    setPdfSelectedIds(all);
                  }} className="text-xs border border-orange-300 rounded-lg px-3 py-1.5 text-orange-600 hover:bg-orange-100 transition-colors">
                    全選択
                  </button>
                  <button onClick={() => setPdfSelectedIds(new Set<string>())}
                    className="text-xs border border-orange-300 rounded-lg px-3 py-1.5 text-orange-600 hover:bg-orange-100 transition-colors">
                    全解除
                  </button>
                  <button
                    onClick={exportType === 'pdf' ? generateSelectedPDF : generateSelectedExcel}
                    disabled={pdfSelectedIds.size === 0 || exporting}
                    className="text-xs bg-orange-500 text-white rounded-lg px-4 py-1.5 hover:bg-orange-600 disabled:opacity-60 font-medium transition-colors flex items-center gap-1.5">
                    {exporting ? (
                      <><svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>生成中...</>
                    ) : exportType === 'pdf'
                        ? `選択した${pdfSelectedIds.size}問をPDF出力`
                        : `選択した${pdfSelectedIds.size}問をExcel出力`}
                  </button>
                  <button onClick={() => { setPdfMode(false); setPdfSelectedIds(new Set<string>()); }}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 transition-colors">
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* 一括移動バー（PDF選択モード中は非表示） */}
            {!pdfMode && selectedIds.size > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm text-blue-700 font-medium flex-shrink-0">{selectedIds.size}問を選択中</span>
                <div className="flex items-center gap-2 flex-1">
                  <select value={bulkTargetFolderId} onChange={e => setBulkTargetFolderId(e.target.value)}
                    className="flex-1 text-sm border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    {folderMoveOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button onClick={handleBulkMove} disabled={bulkMoving}
                    className="flex-shrink-0 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                    {bulkMoving ? '移動中...' : '移動'}
                  </button>
                  <button onClick={() => setSelectedIds(new Set<string>())}
                    className="flex-shrink-0 text-sm text-gray-400 hover:text-gray-600 px-2 py-2">
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* 問題リスト */}
            {filteredQuestions.length > 0 ? (
              <div className="space-y-3">
                {filteredQuestions.map((q, i) => (
                  <div key={q.id} className={`bg-white rounded-2xl border p-4 sm:p-5 transition-colors ${
                    pdfMode
                      ? (pdfSelectedIds.has(q.id) ? 'border-orange-300 bg-orange-50/20' : '')
                      : (selectedIds.has(q.id) ? 'border-blue-300 bg-blue-50/30' : '')
                  }`}>
                    {/* カードヘッダー */}
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* チェックボックス（pdfModeでPDF選択用に切り替え） */}
                        <input
                          type="checkbox"
                          checked={pdfMode ? pdfSelectedIds.has(q.id) : selectedIds.has(q.id)}
                          onChange={() => pdfMode ? togglePdfSelect(q.id) : toggleSelect(q.id)}
                          className={`w-4 h-4 rounded cursor-pointer flex-shrink-0 ${pdfMode ? 'accent-orange-500' : 'accent-blue-600'}`}
                        />
                        <span className="text-xs text-gray-400">Q{i + 1}</span>
                        {q.subject && <span className="bg-green-50 text-green-700 text-xs px-2.5 py-0.5 rounded-full font-medium">{q.subject}</span>}
                        <span className="bg-gray-100 text-gray-500 text-xs px-2.5 py-0.5 rounded-full">
                          {DIFF_LABEL[q.difficulty] ?? q.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* 移動ボタン */}
                        {movingQuestionId === q.id ? (
                          <div className="flex items-center gap-1">
                            <select onChange={e => handleMoveQuestion(q.id, e.target.value)}
                              defaultValue=""
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white">
                              <option value="" disabled>移動先を選択</option>
                              {folderMoveOptions.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            <button onClick={() => setMovingQuestionId(null)} className="text-gray-400 hover:text-gray-600 px-1">×</button>
                          </div>
                        ) : (
                          <button onClick={() => setMovingQuestionId(q.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 px-2.5 py-1.5 rounded-lg transition-colors">
                            移動
                          </button>
                        )}
                        <Link href={`/questions/${q.id}/edit`}
                          className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition-colors">
                          編集
                        </Link>
                        <button onClick={() => handleDelete(q.id)} disabled={deleting === q.id}
                          className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60">
                          {deleting === q.id ? '...' : '削除'}
                        </button>
                      </div>
                    </div>

                    {/* 問題文 */}
                    <p className="text-sm font-medium text-gray-900 mb-3 leading-relaxed">{q.question}</p>

                    {/* 選択肢 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(['A', 'B', 'C', 'D'] as const).map(lbl => {
                        const key = `option_${lbl.toLowerCase()}` as keyof Question;
                        return (
                          <div key={lbl} className={`flex items-center gap-2 p-3 sm:p-2.5 rounded-lg text-xs ${q.answer === lbl ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50 text-gray-600'}`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${q.answer === lbl ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                              {lbl}
                            </span>
                            {q[key] as string}
                          </div>
                        );
                      })}
                    </div>

                    {/* 解説 */}
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium text-green-600">💡 解説：</span>{q.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border p-10 text-center">
                <p className="text-gray-400 mb-4">
                  {questions.length > 0 ? 'このフォルダに問題はありません' : 'まだ問題がありません'}
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
      </div>
    </div>
  );
}
