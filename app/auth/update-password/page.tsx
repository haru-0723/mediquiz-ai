'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-6">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mx-auto">
              <span className="text-white text-sm font-bold">M</span>
            </div>
          </Link>
          <h1 className="text-2xl font-semibold">新しいパスワードを設定</h1>
          <p className="text-sm text-gray-500 mt-1">新しいパスワードを入力してください</p>
        </div>

        <div className="bg-white rounded-2xl border p-8">
          <form onSubmit={handleUpdate} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">新しいパスワード</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="6文字以上" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード確認</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="もう一度入力" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {loading ? '更新中...' : 'パスワードを更新する'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
