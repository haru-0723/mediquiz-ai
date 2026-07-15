'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, X, ArrowRight, Info } from 'lucide-react';
import type { TodayUnit, TodayReason } from '@/lib/recommendation/getTodayUnits';
import { SKIP_REASONS } from '@/lib/recommendation/skipReasons';

const TONE_STYLE: Record<TodayReason['tone'], string> = {
  weak: 'bg-rose-50 text-rose-600',
  stale: 'bg-amber-50 text-amber-700',
  important: 'bg-purple-50 text-purple-700',
  data: 'bg-slate-100 text-slate-500',
};

function unitCheckHref(u: TodayUnit) {
  return `/unit-check?unit=${u.unitId}&unitName=${encodeURIComponent(u.unitName)}&subjectName=${encodeURIComponent(u.subjectName)}`;
}

export default function TodayUnitsSection({ units }: { units: TodayUnit[] }) {
  const router = useRouter();
  const [items, setItems] = useState(units);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickingReasonFor, setPickingReasonFor] = useState<string | null>(null);

  async function dismiss(unitId: string, reason: string) {
    setBusyId(unitId);
    setPickingReasonFor(null);
    setItems(prev => prev.filter(u => u.unitId !== unitId));
    try {
      await fetch('/api/today-dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, reason }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const [top, ...rest] = items;

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
          {/* 最優先の1件：大きく詳しく表示 */}
          <div className="rounded-2xl border-2 border-emerald-400 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{top.subjectName}</p>
                <p className="truncate text-base font-bold text-slate-900 sm:text-lg">{top.unitName}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {top.reasons.map(r => (
                    <span key={r.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_STYLE[r.tone]}`}>
                      {r.label}
                    </span>
                  ))}
                </div>
                <div className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                  <p>{top.detail}</p>
                </div>
              </div>
              <button
                onClick={() => setPickingReasonFor(pickingReasonFor === top.unitId ? null : top.unitId)}
                disabled={busyId === top.unitId}
                aria-label="今日は飛ばす"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {pickingReasonFor === top.unitId && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-medium text-slate-600">飛ばす理由を選んでください</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKIP_REASONS.map(r => (
                    <button
                      key={r.value}
                      onClick={() => dismiss(top.unitId, r.value)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Link href={unitCheckHref(top)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              この単元をやる
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>

          {/* 2位以下：コンパクトな一覧 */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              {rest.map((u, i) => (
                <div key={u.unitId} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                    {i + 2}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700">
                      <span className="text-slate-400">{u.subjectName}・</span>{u.unitName}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TONE_STYLE[u.reasons[0].tone]}`}>
                    {u.reasons[0].label}
                  </span>
                  <Link href={unitCheckHref(u)}
                    className="shrink-0 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-50">
                    やる
                  </Link>
                  <button
                    onClick={() => dismiss(u.unitId, 'not_now')}
                    disabled={busyId === u.unitId}
                    aria-label="今日は飛ばす"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
