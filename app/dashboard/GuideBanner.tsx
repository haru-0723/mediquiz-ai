'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STEPS = [
  {
    emoji: '📤',
    title: '教材を追加',
    desc: '授業スライドや教科書の画像・PDFをアップロードできます',
  },
  {
    emoji: '✨',
    title: 'AIで問題を自動生成',
    desc: 'アップロードした教材からAIが4択問題を自動で作成します',
  },
  {
    emoji: '💾',
    title: '問題をフォルダに保存',
    desc: '生成した問題は科目やテーマごとにフォルダに分けて保存できます',
  },
];

export default function GuideBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenGuide')) {
      setVisible(true);
    }
  }, []);

  function handleClose() {
    localStorage.setItem('hasSeenGuide', '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 mb-6 sm:mb-8">
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-emerald-400 hover:text-emerald-600 text-lg leading-none"
        aria-label="閉じる"
      >
        ×
      </button>
      <p className="text-sm font-semibold text-emerald-700 mb-1">🎉 MediQuiz AI へようこそ！</p>
      <p className="text-xs text-emerald-600 mb-4">教材がなくてもすぐ試せます。まずは1問解いてみましょう。</p>
      <Link href="/trial"
        onClick={handleClose}
        className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 transition-colors mb-4">
        🎯 まず1問やってみる（教材アップロード不要）
      </Link>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-emerald-100">
            <div className="text-2xl mb-2">{step.emoji}</div>
            <p className="text-sm font-semibold text-slate-900 mb-1">{step.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
