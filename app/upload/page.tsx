'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';

type Folder = { id: string; name: string; };
type UnitOption = { unitId: string; unitName: string; subjectId: string; subjectName: string };

export default function UploadPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<File[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at');
      if (data) setFolders(data);

      const { data: examSetting } = await supabase
        .from('user_exam_settings')
        .select('exam_type, grade')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (!examSetting) return;
      const scopeGrade = examSetting.exam_type === 'regular_test' ? (examSetting.grade ?? 0) : 0;

      const { data: scopes } = await supabase
        .from('unit_scopes')
        .select('unit_id, units(id, name, subject_id, subjects(id, name))')
        .eq('exam_type', examSetting.exam_type)
        .eq('grade', scopeGrade);

      const options: UnitOption[] = (scopes ?? [])
        .filter(s => s.units)
        .map(s => {
          const unit = Array.isArray(s.units) ? s.units[0] : s.units;
          const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
          return {
            unitId: unit.id as string,
            unitName: unit.name as string,
            subjectId: (subject?.id as string) ?? '',
            subjectName: (subject?.name as string) ?? '',
          };
        });
      setUnits(options);
    }
    load();
  }, []);

  const subjectOptions = Array.from(new Map(units.map(u => [u.subjectId, u.subjectName])).entries());
  const unitOptions = units.filter(u => u.subjectId === selectedSubjectId);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...newFiles]);
    setTitles(prev => [...prev, ...newFiles.map(f => f.name.replace(/\.[^/.]+$/, ''))]);
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
    setTitles(titles.filter((_, i) => i !== index));
  }

  function updateTitle(index: number, value: string) {
    setTitles(titles.map((t, i) => i === index ? value : t));
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('folders').insert({
      user_id: user.id,
      name: newFolderName,
    }).select().single();
    if (data) {
      setFolders([...folders, data]);
      setSelectedFolder(data.id);
      setNewFolderName('');
      setShowNewFolder(false);
    }
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      const selectedUnit = units.find(u => u.unitId === selectedUnitId);

      const timestamp = Date.now();
      await Promise.all(
        files.map(async (file, i) => {
          const path = `${user.id}/${timestamp}_${i}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from('materials').upload(path, file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('materials').getPublicUrl(path);
          const { error: insertError } = await supabase.from('materials').insert({
            user_id: user.id,
            title: (titles[i] || '').trim() || file.name.replace(/\.[^/.]+$/, ''),
            file_url: publicUrl,
            file_type: file.type,
            subject: selectedUnit?.subjectName || null,
            unit_id: selectedUnit?.unitId || null,
            folder_id: selectedFolder || null,
          });
          if (insertError) {
            if (insertError.message.includes('FREE_MATERIAL_LIMIT')) {
              throw new Error('無料プランの教材アップロード上限（3件）に達しました。有料プランにアップグレードしてください。');
            }
            throw insertError;
          }
        })
      );
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">アップロード完了！</h2>
          <p className="text-slate-500 text-sm mb-6">{files.length}件の教材が保存されました。</p>
          <div className="flex gap-3">
            <button onClick={() => { setFiles([]); setTitles([]); setDone(false); setSelectedSubjectId(''); setSelectedUnitId(''); }}
              className="flex-1 border border-slate-200 rounded-xl py-3 text-sm text-slate-600">
              続けてアップロード
            </button>
            <Link href="/generate" className="flex-1 bg-emerald-600 text-white rounded-xl py-3 text-sm font-medium text-center">
              問題生成へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">教材をアップロード</h1>
        <p className="text-slate-500 text-sm mb-8">複数の画像・PDFをまとめてアップロードできます。</p>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">

          {/* ファイル選択 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ファイルを選択（複数可）</label>
            <input type="file" accept=".pdf,image/*" multiple onChange={handleFileChange}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium hover:file:bg-emerald-100" />
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg flex-shrink-0">{file.type.includes('pdf') ? '📄' : '🖼️'}</span>
                      <span className="text-xs text-slate-400 flex-1 truncate">{file.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                      <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-rose-400 text-lg flex-shrink-0">×</button>
                    </div>
                    <input
                      type="text"
                      value={titles[i] ?? ''}
                      onChange={e => updateTitle(i, e.target.value)}
                      placeholder="教材名"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                ))}
                <p className="text-xs text-emerald-600 font-medium">合計 {files.length}件選択中</p>
              </div>
            )}
          </div>

          {/* フォルダ選択 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">フォルダ（任意）</label>
            <div className="flex gap-2">
              <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">フォルダなし</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <button onClick={() => setShowNewFolder(!showNewFolder)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm hover:bg-slate-200">
                + 新規
              </button>
            </div>
            {showNewFolder && (
              <div className="flex gap-2 mt-2">
                <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名を入力"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <button onClick={createFolder} disabled={!newFolderName.trim()}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium disabled:opacity-60">
                  作成
                </button>
              </div>
            )}
          </div>

          {/* 科目・単元 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">科目・単元（任意）</label>
            <p className="mb-2 text-xs text-slate-400">選択すると、この教材から生成した問題の正答率が単元の学習記録に反映されます。</p>
            <div className="grid grid-cols-2 gap-2">
              <select value={selectedSubjectId} onChange={e => { setSelectedSubjectId(e.target.value); setSelectedUnitId(''); }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">科目を選択</option>
                {subjectOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select value={selectedUnitId} onChange={e => setSelectedUnitId(e.target.value)} disabled={!selectedSubjectId}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400">
                <option value="">単元を選択</option>
                {unitOptions.map(u => (
                  <option key={u.unitId} value={u.unitId}>{u.unitName}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="bg-rose-50 text-rose-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <button onClick={handleUpload} disabled={files.length === 0 || uploading}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            {uploading ? `アップロード中...` : `📤 ${files.length > 0 ? `${files.length}件を` : ''}アップロードする`}
          </button>
        </div>
      </div>
    </div>
  );
}
