'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PACKS, PACK_ORDER, ADDONS, ADDON_ORDER } from '@/lib/plans';

const FREE_FEATURES = [
  { emoji: '✨', text: 'AI問題生成：通算5教材まで' },
  { emoji: '📝', text: '問題保存：30問まで' },
  { emoji: '🎯', text: 'CBT模試：月2回まで' },
  { emoji: '📝', text: '国試モード：月2回まで' },
  { emoji: '📤', text: '教材アップロード：3件まで' },
  { emoji: '⚡', text: '問題演習' },
  { emoji: '📚', text: 'マイ問題集（フォルダ管理）' },
  { emoji: '📅', text: '試験日カウントダウン' },
];

const PAID_FEATURES = [
  { emoji: '📝', text: '問題保存：無制限' },
  { emoji: '🎯', text: 'CBT模試：月15回' },
  { emoji: '📝', text: '国試モード：月15回' },
  { emoji: '📤', text: '教材アップロード：無制限' },
  { emoji: '🔁', text: '復習モード' },
  { emoji: '🗂️', text: 'PDF・Excelエクスポート' },
  { emoji: '📊', text: '苦手分野分析' },
  { emoji: '📈', text: '演習履歴・正解率' },
  { emoji: '🔍', text: 'AI解説の深掘り機能' },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handlePurchase(item: string) {
    setLoading(item);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
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
          <p className="text-gray-500 text-sm sm:text-base">必要な期間だけ買える買い切り制。自動更新はありません。</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-start">
          {/* 無料プラン */}
          <div className="bg-white rounded-2xl border p-6 flex flex-col">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">無料プラン</h2>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥0</div>
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

          {/* 有料プラン（買い切り） */}
          <div className="bg-white rounded-2xl border-2 border-green-500 p-6 relative flex flex-col">
            <span className="absolute -top-3 left-5 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-medium">おすすめ</span>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">有料プラン（買い切り）</h2>
              <p className="text-sm text-gray-400">本格的に対策したい方に。期間を選んで購入</p>
            </div>

            {/* パック選択 */}
            <div className="space-y-2.5 mb-6">
              {PACK_ORDER.map(key => {
                const p = PACKS[key];
                const recommended = key === '1m';
                return (
                  <button key={key} onClick={() => handlePurchase(key)} disabled={loading !== null}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 ${recommended ? 'border-green-500 bg-green-50 hover:bg-green-100' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                        {recommended && <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded-full">人気</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">AI生成 教材{p.credits}件ぶん・{p.perDay}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-gray-900">¥{p.amount.toLocaleString()}</div>
                      <div className="text-[11px] text-green-600 font-medium">{loading === key ? '処理中...' : '購入する →'}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <ul className="space-y-2.5 flex-1">
              {PAID_FEATURES.map(f => (
                <li key={f.text} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="text-base w-5 flex-shrink-0">{f.emoji}</span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 追加教材クレジット */}
        <div className="mt-6 bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">教材クレジットの買い足し</h2>
          <p className="text-sm text-gray-400 mb-5">有料プラン利用中に、AI生成の教材数が足りなくなったら追加できます（期間は延びません）。</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ADDON_ORDER.map(key => {
              const a = ADDONS[key];
              return (
                <button key={key} onClick={() => handlePurchase(key)} disabled={loading !== null}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-60">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">教材{a.credits}件</p>
                    <p className="text-xs text-gray-400 mt-0.5">追加ぶん</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold text-gray-900">¥{a.amount.toLocaleString()}</div>
                    <div className="text-[11px] text-green-600 font-medium">{loading === key ? '処理中...' : '追加する →'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          クレジットカード・PayPay・Apple Payで安全に決済。買い切り制のため自動更新（自動課金）はありません。
        </p>
        <p className="text-center text-xs text-gray-400 mt-2">
          ご購入前に <Link href="/tokushoho" className="underline hover:text-gray-600">特定商取引法に基づく表記</Link> をご確認ください。
        </p>
      </div>
    </div>
  );
}
