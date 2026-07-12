import Link from 'next/link';
import { Target } from 'lucide-react';

type Stat = { subject: string; accuracy: number; total: number };

export default function WeakAnalysisCard({
  title,
  stats,
  emptyMessage,
  emptyLink,
}: {
  title: string;
  stats: Stat[];
  emptyMessage: string;
  emptyLink: string;
}) {
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
            return (
              <div key={subject} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="mr-2 truncate text-sm font-medium text-slate-900">{subject}</span>
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
                </div>
                <Link
                  href={`/review?subject=${encodeURIComponent(subject)}`}
                  className="flex-shrink-0 whitespace-nowrap rounded-lg border border-emerald-200 px-2.5 py-2 text-xs text-emerald-600 transition-colors hover:bg-emerald-50">
                  復習する
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
