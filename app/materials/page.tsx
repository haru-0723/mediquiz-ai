'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';

type Material = {
  id: string;
  title: string;
  subject: string | null;
  file_type: string | null;
  file_url: string;
  created_at: string;
};

// 非公開バケットのfile_urlから保存パスを取り出す
function getStoragePath(fileUrl: string): string | null {
  const marker = '/storage/v1/object/public/materials/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

export default function MaterialsPage() {
  const supabase = createClient();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState('');

  async function handleShow(material: Material) {
    setPreviewLoading(material.id);
    setPreviewError('');
    try {
      const path = getStoragePath(material.file_url);
      if (!path) throw new Error('ファイルパスを特定できませんでした');
      const { data, error } = await supabase.storage.from('materials').createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) throw error ?? new Error('URLの取得に失敗しました');
      const isPdf = material.file_type?.includes('pdf');
      if (isPdf) {
        // PDFは新しいタブで開く
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        setPreviewMaterial(material);
        setPreviewUrl(data.signedUrl);
      }
    } catch (e) {
      console.error(e);
      setPreviewError(e instanceof Error ? e.message : '教材の表示に失敗しました');
    } finally {
      setPreviewLoading(null);
    }
  }

  function closePreview() {
    setPreviewMaterial(null);
    setPreviewUrl(null);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setMaterials(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(material: Material) {
    if (!confirm(`「${material.title}」を削除しますか？`)) return;
    setDeleting(material.id);
    try {
      // Storageからファイルを削除
      const urlParts = material.file_url.split('/storage/v1/object/public/materials/');
      const filePath = urlParts[1];
      if (filePath) {
        await supabase.storage.from('materials').remove([filePath]);
      }
      // DBから削除
      await supabase.from('materials').delete().eq('id', material.id);
      setMaterials(materials.filter(m => m.id !== material.id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
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
      <Navbar />

      <div className="max-w-3xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">教材一覧</h1>
            <p className="text-gray-500 text-sm mt-1">全{materials.length}件</p>
          </div>
          <Link href="/upload" className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
            + 教材を追加
          </Link>
        </div>

        {materials.length > 0 ? (
          <div className="space-y-3">
            {materials.map(material => (
              <div key={material.id} className="bg-white rounded-2xl border p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                  {material.file_type?.includes('pdf') ? '📄' : '🖼️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{material.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {material.subject && <span className="text-xs text-gray-400">{material.subject}</span>}
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {new Date(material.created_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleShow(material)} disabled={previewLoading === material.id}
                    className="text-xs text-blue-400 hover:text-blue-600 border border-blue-200 hover:border-blue-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-60">
                    {previewLoading === material.id ? '読込中...' : '表示'}
                  </button>
                  <button onClick={() => handleDelete(material)} disabled={deleting === material.id}
                    className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1 rounded-lg transition-colors disabled:opacity-60">
                    {deleting === material.id ? '削除中...' : '削除'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-gray-400 mb-4">教材がまだありません</p>
            <Link href="/upload" className="bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-green-700">
              最初の教材をアップロード
            </Link>
          </div>
        )}

        {previewError && (
          <p className="text-sm text-red-500 mt-4 text-center">{previewError}</p>
        )}
      </div>

      {previewMaterial && previewUrl && (
        <div
          onClick={closePreview}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <p className="text-sm font-medium text-gray-900 truncate">{previewMaterial.title}</p>
              <button onClick={closePreview} className="text-gray-400 hover:text-gray-700 text-2xl leading-none px-1">
                ×
              </button>
            </div>
            <div className="overflow-auto p-4 bg-gray-50 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={previewMaterial.title} className="max-w-full h-auto rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
