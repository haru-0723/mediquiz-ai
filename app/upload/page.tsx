'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function UploadPage() {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      const path = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('materials')
        .getPublicUrl(path);

      await supabase.from('materials').insert({
        user_id: user.id,
        title: title || file.name,
        file_url: publicUrl,
        file_type: file.type,
        subject: subject || null,
      });

      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">アップロード完了！</h2>
          <p className="text-gray-500 text-sm mb-6">教材が保存されました。</p>
          <div className="flex gap-3">
            <button onClick={() => { setFile(null); setDone(false); setTitle(''); setSubject(''); }}
              className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600">
              続けてアップロード
            </button>
            <Link href="/dashboard" className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium text-center">
              ダッシュボードへ
            </Link>
          </div>
        </div>
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

      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">教材をアップロード</h1>
        <p className="text-gray-500 text-sm mb-8">PDFや画像をアップロードしてください。</p>

        <div className="bg-white rounded-2xl border p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ファイルを選択</label>
            <input type="file" accept=".pdf,image/*" onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-50 file:text-green-700 file:font-medium hover:file:bg-green-100" />
            {file && <p className="text-xs text-gray-400 mt-2">{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">教材タイトル</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例：解剖生理学 第3章 循環器系" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">科目（任意）</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例：解剖生理学" />
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <button onClick={handleUpload} disabled={!file || uploading}
            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
            {uploading ? 'アップロード中...' : 'アップロードする'}
          </button>
        </div>
      </div>
    </div>
  );
}
