'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import type { TodayUnit, TodayReason } from '@/lib/recommendation/getTodayUnits';

const TONE_STYLE: Record<TodayReason['tone'], string> = {
  weak: 'bg-rose-50 text-rose-600',
  stale: 'bg-amber-50 text-amber-700',
  important: 'bg-purple-50 text-purple-700',
  data: 'bg-slate-100 text-slate-500',
};

export default function TodayUnitsSection({ units }: { units: TodayUnit[] }) {
  const router = useRouter();
  const [items, setItems] = useState(units);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function dismiss(unitId: string) {
    setBusyId(unitId);
    setItems(prev => prev.filter(u => u.unitId !== unitId));
    try {
      await fetch('/api/today-dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">今日やること</h2>
        {items.length > 0 && (
          <Link href="/study-log" className="text-xs font-medium text-emerald-600 hover:underline">
            自分で選んで報告する →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center sm:p-6">
          <p className="text-sm font-medium text-emerald-900">今日のおすすめはすべて確認しました 🎉</p>
          <Link href="/study-log" className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline">
            それでも勉強する単元を選ぶ →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((u, i) => (
            <div key={u.unitId} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-400">{u.subjectName}</p>
                  <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{u.unitName}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.reasons.map(r => (
                      <span key={r.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_STYLE[r.tone]}`}>
                        {r.label}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => dismiss(u.unitId)}
                  disabled={busyId === u.unitId}
                  aria-label="今日は無視する"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <Link
                href={`/unit-check?unit=${u.unitId}&unitName=${encodeURIComponent(u.unitName)}&subjectName=${encodeURIComponent(u.subjectName)}`}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <Sparkles className="h-4 w-4" strokeWidth={2} />
                この単元をやる
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
