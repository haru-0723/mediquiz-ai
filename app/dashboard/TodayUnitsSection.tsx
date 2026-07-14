import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import type { TodayUnit } from '@/lib/recommendation/getTodayUnits';

export default function TodayUnitsSection({ units }: { units: TodayUnit[] }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">今日やること</h2>
      {units.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center sm:p-6">
          <p className="text-sm text-slate-500">現在の試験設定に対応するデータがまだありません。</p>
          <Link href="/study-log" className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline">
            学習報告をする →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {units.map(u => (
            <div key={u.unitId} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                  <Sparkles className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">{u.subjectName}</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{u.unitName}</p>
                  {u.reasons.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {u.reasons.map(r => (
                        <span key={r} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{r}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <Link href="/study-log"
                className="mt-3 block w-full rounded-lg border border-emerald-200 py-2 text-center text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50">
                学習報告する →
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
