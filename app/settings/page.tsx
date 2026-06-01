'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const supabase = createClient();
  const [plan, setPlan] = useState('free');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      setName(user.user_metadata?.name ?? '');
      const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
      if (profile) setPlan(profile.plan);
      setLoading(false);
    }
    load();
  }, []);

  async function handlePortal() {
    setPortalLoading(true);
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const { url, error } = await res.json();
    if (error) {
      alert(error);
      setPortalLoading(false);
      return;
    }
    window.location.href = url;
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

      <div className="max-w-xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">設定</h1>

        {/* アカウント情報 */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">アカウント情報</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">お名前</p>
              <p className="text-sm text-gray-900">{name || '未設定'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">メールアドレス</p>
              <p className="text-sm text-gray-900">{email}</p>
            </div>
          </div>
        </div>

        {/* プラン */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">プラン</h2>
          <div className={`p-4 rounded-xl mb-4 ${plan === 'standard' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
            <p className="text-sm font-semibold text-gray-900">
              {plan === 'standard' ? '⭐ スタンダードプラン' : '無料プラン'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {plan === 'standard' ? '¥680/月 · 全機能使い放題' : '一部機能に制限あり'}
            </p>
          </div>

          {plan === 'standard' ? (
            <div className="space-y-3">
              <button onClick={handlePortal} disabled={portalLoading}
                className="w-full border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:border-gray-300 transition-colors disabled:opacity-60">
                {portalLoading ? '処理中...' : '🔧 サブスクリプションを管理する'}
              </button>
              <p className="text-xs text-gray-400 text-center">解約・プラン変更はこちらから</p>
            </div>
          ) : (
            <Link href="/pricing"
              className="block w-full text-center bg-green-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-700 transition-colors">
              スタンダードプランにアップグレード
            </Link>
          )}
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">パスワード変更</h2>
          <Link href="/auth/reset"
            className="block w-full text-center border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:border-gray-300 transition-colors">
            パスワードをリセットする
          </Link>
        </div>

        {/* 危険な操作 */}
        <div className="bg-white rounded-2xl border border-red-100 p-6">
          <h2 className="font-semibold text-red-600 mb-4">アカウント削除</h2>
          <p className="text-sm text-gray-500 mb-4">アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。</p>
          <button className="w-full border border-red-200 text-red-400 rounded-xl py-3 text-sm hover:border-red-400 hover:text-red-600 transition-colors">
            アカウントを削除する
          </button>
        </div>
      </div>
    </div>
  );
}
