'use client';

import { useState } from 'react';
import Link from 'next/link';

const FREE_FEATURES = [
  { emoji: '✨', text: 'AI問題生成：1日2回まで' },
  { emoji: '📝', text: '問題保存：30問まで' },
  { emoji: '🎯', text: 'CBT模試：月2回まで' },
  { emoji: '📝', text: '国試モード：月2回まで' },
  { emoji: '📤', text: '教材アップロード：3件まで' },
  { emoji: '⚡', text: '問題演習' },
  { emoji: '📚', text: 'マイ問題集（フォルダ管理）' },
  { emoji: '📅', text: '試験日カウントダウン' },
];

const STANDARD_FEATURES = [
  { emoji: '✨', text: 'AI問題生成：1日15回' },
  { emoji: '📝', text: '問題保存：無制限' },
  { emoji: '🎯', text: 'CBT模試：月15回' },
  { emoji: '📝', text: '国試モード：月15回' },
  { emoji: '📤', text: '教材アップロード：無制限' },
  { emoji: '⚡', text: '問題演習' },
  { emoji: '🔁', text: '復習モード' },
  { emoji: '📚', text: 'マイ問題集（フォルダ管理）' },
  { emoji: '🗂️', text: 'PDF・Excelエクスポート' },
  { emoji: '📊', text: '苦手分野分析' },
  { emoji: '📅', text: '試験日カウントダウン' },
  { emoji: '📈', text: '演習履歴・正解率' },
  { emoji: '🔍', text: 'AI解説の深掘り機能' },
];

const PREMIUM_FEATURES = [
  { emoji: '✨', text: 'AI問題生成：無制限' },
  { emoji: '📝', text: '問題保存：無制限' },
  { emoji: '🎯', text: 'CBT模試：無制限' },
  { emoji: '📝', text: '国試モード：無制限' },
  { emoji: '📤', text: '教材アップロード：無制限' },
  { emoji: '⚡', text: '問題演習' },
  { emoji: '🔁', text: '復習モード' },
  { emoji: '📚', text: 'マイ問題集（フォルダ管理）' },
  { emoji: '🗂️', text: 'PDF・Excelエクスポート' },
  { emoji: '📊', text: '苦手分野分析' },
  { emoji: '📅', text: '試験日カウントダウン' },
  { emoji: '📈', text: '演習履歴・正解率' },
  { emoji: '🔍', text: 'AI解説の深掘り機能' },
  { emoji: '⚡', text: 'スタンダードの全機能' },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<'standard' | 'premium' | null>(null);

  async function handleUpgrade(plan: 'standard' | 'premium') {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.error) {
        alert('エラー：' + data.error);
        setLoading(null);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('URLが取得できませんでした');
        setLoading(null);
      }
    } catch (e) {
      alert('通信エラーが発生しました：' + e);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold text-sm sm:text-base">MediQuiz AI</span>
        </Link>
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">ダッシュボードへ</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3">料金プラン</h1>
          <p className="text-gray-500 text-sm sm:text-base">まずは無料で試してみてください</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          {/* 無料プラン */}
          <div className="bg-white rounded-2xl border p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">無料プラン</h2>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ¥0 <span className="text-base font-normal text-gray-400">/ 月</span>
              </div>
              <p className="text-sm text-gray-400">まずは試したい方に</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <span className="text-base w-5 flex-shrink-0">{f.emoji}</span>
                  {f.text}
                </li>
              ))}
            </ul>
            <Link href="/auth/signup"
              className="block text-center border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-colors">
              無料で始める
            </Link>
          </div>

          {/* スタンダードプラン */}
          <div className="bg-white rounded-2xl border-2 border-green-500 p-6 relative flex flex-col">
            <span className="absolute -top-3 left-5 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">おすすめ</span>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">スタンダード</h2>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ¥980 <span className="text-base font-normal text-gray-400">/ 月</span>
              </div>
              <p className="text-sm text-gray-400">本格的に対策したい方に</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {STANDARD_FEATURES.map(f => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="text-base w-5 flex-shrink-0">{f.emoji}</span>
                  {f.text}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('standard')} disabled={loading !== null}
              className="w-full bg-green-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
              {loading === 'standard' ? '処理中...' : 'アップグレードする →'}
            </button>
          </div>

          {/* プレミアムプラン */}
          <div className="bg-white rounded-2xl border p-6 relative flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">プレミアム</h2>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                ¥1,480 <span className="text-base font-normal text-gray-400">/ 月</span>
              </div>
              <p className="text-sm text-gray-400">国試直前の追い込みに</p>
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {PREMIUM_FEATURES.map(f => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="text-base w-5 flex-shrink-0">{f.emoji}</span>
                  {f.text}
                </li>
              ))}
            </ul>
            <button onClick={() => handleUpgrade('premium')} disabled={loading !== null}
              className="w-full border border-gray-800 text-gray-800 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors">
              {loading === 'premium' ? '処理中...' : 'プレミアムにする →'}
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
