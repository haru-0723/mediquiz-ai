'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, ChevronDown } from 'lucide-react';

type Stat = { subject: string; accuracy: number; total: number };
type UnitStat = { unitName: string; accuracy: number; answered: number };

export default function WeakAnalysisCard({
  title,
  stats,
  emptyMessage,
  emptyLink,
  unitsBySubject,
}: {
  title: string;
  stats: Stat[];
  emptyMessage: string;
  emptyLink: string;
  unitsBySubject?: Record<string, UnitStat[]>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-slate-500" strokeWidth={2} />
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {stats.length > 0 && (
          <span className="ml-auto text-xs text-slate-400">{stats.length}科目</span>
        )}
      </div>
      {stats.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-400">{emptyMessage}</p>
          <Link href={emptyLink} className="mt-2 inline-block text-xs font-medium text-emerald-600 hover:underline">
            始める →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map(({ subject, accuracy: acc, total }) => {
            const isWeak = acc <= 60;
            const isReview = acc > 60 && acc <= 80;
            const units = unitsBySubject?.[subject];
            const isExpanded = expanded === subject;
            return (
              <div key={subject} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => units && units.length > 0 && setExpanded(isExpanded ? null : subject)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="mr-2 flex items-center gap-1 truncate text-sm font-medium text-slate-900">
                        {subject}
                        {units && units.length > 0 && (
                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} strokeWidth={2} />
                        )}
                      </span>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isWeak ? 'bg-rose-100 text-rose-600' :
                          isReview ? 'bg-amber-100 text-amber-600' :
                            'bg-emerald-100 text-emerald-600'
                        }`}>
                          {isWeak ? '苦手' : isReview ? '要復習' : '得意'}
                        </span>
                        <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-700">{acc}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${
                        isWeak ? 'bg-rose-400' :
                        isReview ? 'bg-amber-400' :
                          'bg-emerald-500'
                      }`} style={{ width: `${acc}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{total}問回答済み</p>
                  </button>
                  <Link
                    href={`/review?subject=${encodeURIComponent(subject)}`}
                    className="flex-shrink-0 whitespace-nowrap rounded-lg border border-emerald-200 px-2.5 py-2 text-xs text-emerald-600 transition-colors hover:bg-emerald-50">
                    復習する
                  </Link>
                </div>

                {isExpanded && units && units.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                    {units.map(u => {
                      const unitWeak = u.accuracy <= 60;
                      const unitReview = u.accuracy > 60 && u.accuracy <= 80;
                      return (
                        <div key={u.unitName} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-slate-600">{u.unitName}</span>
                          <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${
                              unitWeak ? 'bg-rose-400' : unitReview ? 'bg-amber-400' : 'bg-emerald-500'
                            }`} style={{ width: `${u.accuracy}%` }} />
                          </div>
                          <span className="w-9 shrink-0 text-right text-xs font-medium text-slate-500">{u.accuracy}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
