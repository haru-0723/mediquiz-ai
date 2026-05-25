'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">確認メールを送信しました</h2>
          <p className="text-sm text-gray-500">{email} に確認メールを送りました。メール内のリンクをクリックしてアカウントを有効化してください。</p>
        </div>
      </div>
    );
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
          <h1 className="text-2xl font-semibold">新規登録</h1>
          <p className="text-sm text-gray-500 mt-1">無料アカウントを作成</p>
        </div>

        <div className="bg-white rounded-2xl border p-8">
          <form onSubmit={handleSignup} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">お名前</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="田中 さくら" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="example@university.ac.jp" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="6文字以上" />
            </div>
            
            <button type="submit" disabled={loading}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {loading ? '処理中...' : 'アカウントを作成'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          すでにアカウントをお持ちの方は <Link href="/auth/login" className="text-green-600 hover:underline font-medium">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
