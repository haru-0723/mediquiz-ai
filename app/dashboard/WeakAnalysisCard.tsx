import Link from 'next/link';

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
    <div className="bg-white rounded-2xl border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {stats.length > 0 && (
          <span className="text-xs text-gray-400">{stats.length}科目</span>
        )}
      </div>
      {stats.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-sm">{emptyMessage}</p>
          <Link href={emptyLink} className="text-xs text-green-600 hover:underline mt-2 inline-block">始める</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stats.map(({ subject, accuracy: acc, total }) => {
            const isWeak   = acc <= 60;
            const isReview = acc > 60 && acc <= 80;
            return (
              <div key={subject} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-900 truncate mr-2">{subject}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isWeak   ? 'bg-red-100 text-red-600' :
                        isReview ? 'bg-yellow-100 text-yellow-600' :
                                   'bg-green-100 text-green-600'
                      }`}>
                        {isWeak ? '苦手' : isReview ? '要復習' : '得意'}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{acc}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      isWeak   ? 'bg-red-400' :
                      isReview ? 'bg-yellow-400' :
                                 'bg-green-500'
                    }`} style={{ width: `${acc}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{total}問回答済み</p>
                </div>
                <Link
                  href={`/review?subject=${encodeURIComponent(subject)}`}
                  className="flex-shrink-0 text-xs text-green-600 border border-green-200 px-2.5 py-2 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap">
                  この科目を復習する
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
