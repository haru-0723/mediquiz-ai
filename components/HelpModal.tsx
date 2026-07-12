'use client';

import { useState } from 'react';
import { HelpCircle, X, BookOpen } from 'lucide-react';

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
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600"
        title="使い方を見る"
      >
        <HelpCircle className="h-5 w-5" strokeWidth={2} />
      </button>

      {/* モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <BookOpen className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                </div>
                <h2 className="text-base font-semibold text-slate-900">{pageTitle}の使い方</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* ステップ一覧 */}
            <div className="space-y-4">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-base">
                    {step.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-600">STEP {i + 1}</span>
                      <span className="text-sm font-medium text-slate-900">{step.title}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              わかった！始める
            </button>
          </div>
        </div>
      )}
    </>
  );
}
