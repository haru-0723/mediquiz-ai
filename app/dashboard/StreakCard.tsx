'use client';

type Props = {
  current: number;
  longest: number;
  todayDone: boolean;
  weekAccuracy: number | null;
  totalQuestions: number;
};

type Badge = {
  icon: string;
  label: string;
  earned: boolean;
  next?: string;
};

function getBadges(current: number, longest: number, totalQuestions: number, weekAccuracy: number | null): Badge[] {
  return [
    { icon: '🔥', label: '7日連続', earned: longest >= 7, next: current < 7 ? `あと${7 - current}日` : undefined },
    { icon: '🏆', label: '100問達成', earned: totalQuestions >= 100, next: totalQuestions < 100 ? `あと${100 - totalQuestions}問` : undefined },
    { icon: '⭐', label: '正答率70%超', earned: (weekAccuracy ?? 0) >= 70 },
    { icon: '🔥', label: '30日連続', earned: longest >= 30, next: current < 30 ? `あと${30 - current}日` : undefined },
    { icon: '🏆', label: '500問達成', earned: totalQuestions >= 500, next: totalQuestions < 500 ? `あと${500 - totalQuestions}問` : undefined },
    { icon: '⭐', label: '正答率80%超', earned: (weekAccuracy ?? 0) >= 80 },
  ];
}

export default function StreakCard({ current, longest, todayDone, weekAccuracy, totalQuestions }: Props) {
  const badges = getBadges(current, longest, totalQuestions, weekAccuracy);

  const today = new Date();
  const dow = today.getDay();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + i);
    return { label: days[d.getDay()], isToday: i === (dow === 0 ? 6 : dow - 1) };
  });

  const doneDays = Math.min(current, weekDays.filter((_, i) => i <= (dow === 0 ? 6 : dow - 1)).length);
  const weekDone = weekDays.map((d, i) => {
    const idx = dow === 0 ? 6 : dow - 1;
    if (i > idx) return 'future';
    if (d.isToday) return todayDone ? 'today-done' : 'today';
    if (i >= idx - (doneDays - (todayDone ? 1 : 0))) return 'done';
    return 'miss';
  });

  return (
    <div className="bg-white rounded-2xl border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl">
            🔥
          </div>
          <div>
            <p className="font-semibold text-lg text-gray-900">{current}日連続学習中</p>
            <p className="text-xs text-gray-400">{todayDone ? '今日も達成！' : '今日まだ問題を解いていません'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">最長記録</p>
          <p className="text-base font-semibold text-gray-900">{longest}日</p>
        </div>
      </div>

      {/* 今週の達成状況 */}
      <div className="flex gap-1.5 justify-between mb-1">
        {weekDays.map((d, i) => {
          const status = weekDone[i];
          let cls = 'w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium ';
          if (status === 'today-done') cls += 'bg-green-500 text-white';
          else if (status === 'today') cls += 'bg-blue-600 text-white';
          else if (status === 'done') cls += 'bg-green-100 text-green-700';
          else if (status === 'future') cls += 'bg-gray-50 text-gray-300 border border-gray-100';
          else cls += 'bg-gray-100 text-gray-400';
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`text-xs ${d.isToday ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{d.label}</span>
              <div className={cls}>
                {status === 'done' || status === 'today-done' ? '✓' : d.isToday ? '今' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* 実績バッジ */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-xs text-gray-400 mb-2">実績バッジ</p>
        <div className="flex flex-wrap gap-2">
          {badges.map((b, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg ${
                b.earned
                  ? 'bg-green-50 text-green-700'
                  : b.next
                  ? 'bg-orange-50 text-orange-600'
                  : 'bg-gray-50 text-gray-400'
              }`}
            >
              {b.icon} {b.earned ? b.label : b.next ? `${b.label} ${b.next}` : `🔒 ${b.label}`}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
