'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    const { url, error } = await res.json();
    if (error) {
      alert(error);
      setLoading(false);
      return;
    }
    window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500">ダッシュボードへ</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">料金プラン</h1>
          <p className="text-gray-500">まずは無料で試してみてください</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 無料プラン */}
          <div className="bg-white rounded-2xl border p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">無料プラン</h2>
            <div className="text-3xl font-bold text-gray-900 mb-1">¥0 <span className="text-base font-normal text-gray-400">/ 月</span></div>
            <p className="text-sm text-gray-500 mb-6">まずは試したい方に</p>
            <ul className="space-y-3 mb-8">
              {[
                'AI問題生成：月3回まで',
                '問題保存：50問まで',
                '教材アップロード：3件まで',
                '問題演習',
                '試験日カウントダウン',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup" className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors">
              無料で始める
            </Link>
          </div>

          {/* スタンダードプラン */}
          <div className="bg-white rounded-2xl border-2 border-green-500 p-8 relative">
            <span className="absolute -top-3 left-6 bg-green-500 text-white text-xs px-3 py-1 rounded-full">人気</span>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">スタンダード</h2>
            <div className="text-3xl font-bold text-gray-900 mb-1">¥680 <span className="text-base font-normal text-gray-400">/ 月</span></div>
            <p className="text-sm text-gray-500 mb-6">本格的に対策したい方に</p>
            <ul className="space-y-3 mb-8">
              {[
                'AI問題生成：無制限',
                '問題保存：無制限',
                '教材アップロード：無制限',
                '問題演習',
                '復習モード',
                '試験日カウントダウン',
                '演習履歴・正解率',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={handleUpgrade} disabled={loading}
              className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-700 disabled:opacity-60">
              {loading ? '処理中...' : 'アップグレードする'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          クレジットカードで安全に決済。いつでもキャンセル可能です。
        </p>
      </div>
    </div>
  );
}
