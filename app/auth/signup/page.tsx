'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const FEATURES = [
  {
    icon: '✨',
    title: 'AIが問題を自動生成',
    desc: '授業スライドをアップロードするだけで4択問題が完成',
  },
  {
    icon: '🎯',
    title: 'CBT・国試モード',
    desc: '本番さながらの模試で実力を測れる',
  },
  {
    icon: '📊',
    title: '苦手分野を自動分析',
    desc: '正解率から苦手科目を特定して効率的に復習',
  },
  {
    icon: '💾',
    title: '問題をフォルダ管理',
    desc: '科目ごとに整理してPDFで印刷も可能',
  },
];

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
      options: { data: { name } },
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
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">確認メールを送信しました</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            {email} に確認メールを送りました。<br />
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* 左パネル（PC のみ表示） */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-green-600 via-green-500 to-emerald-400 flex-col justify-between p-12 text-white">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-16">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-semibold text-lg">MediQuiz AI</span>
          </Link>

          <p className="text-white/70 text-sm font-medium tracking-widest mb-3">FOR MEDICAL STUDENTS</p>
          <h2 className="text-4xl font-bold leading-tight mb-4">
            国試合格への<br />最短ルート
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-12">
            看護・医学・薬学系の大学生向け。<br />
            AIが教材から問題を自動生成し、あなたの合格を全力サポート。
          </p>

          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map(f => (
              <div key={f.title} className="flex items-start gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/40 text-xs mt-8">© 2026 MediQuiz AI</p>
      </div>

      {/* 右パネル：登録フォーム */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* スマホ用ロゴ */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">M</span>
              </div>
              <span className="font-semibold">MediQuiz AI</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">アカウント作成</h1>
            <p className="text-sm text-gray-500 mt-1">無料で今すぐ始められます</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={handleSignup} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">お名前</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="田中 さくら"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="example@university.ac.jp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">パスワード</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="6文字以上"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 active:bg-green-800 disabled:opacity-60 transition-colors mt-2"
              >
                {loading ? '処理中...' : '無料で始める →'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/auth/login" className="text-green-600 hover:underline font-medium">
              ログイン
            </Link>
          </p>

          <p className="text-center text-xs text-gray-400 mt-4">
            登録することで
            <Link href="/terms" className="underline hover:text-gray-600 mx-1">利用規約</Link>
            および
            <Link href="/privacy" className="underline hover:text-gray-600 mx-1">プライバシーポリシー</Link>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  );
}
