'use client';

import { useState } from 'react';

type HelpStep = {
  icon: string;
  title: string;
  description: string;
};

type HelpModalProps = {
  steps: HelpStep[];
  pageTitle: string;
};

export default function HelpModal({ steps, pageTitle }: HelpModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ？ボタン */}
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-green-100 text-gray-500 hover:text-green-700 flex items-center justify-center text-sm font-bold transition-colors border border-gray-200 hover:border-green-300"
        title="使い方を見る"
      >
        ?
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-700 text-sm">📖</span>
                </div>
                <h2 className="font-semibold text-gray-900 text-base">{pageTitle}の使い方</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 flex items-center justify-center text-sm transition-colors"
              >
                ×
              </button>
            </div>

            {/* ステップ一覧 */}
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center text-base">
                    {step.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-green-600">STEP {i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{step.title}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
            >
              わかった！始める
            </button>
          </div>
        </div>
      )}
    </>
  );
}
