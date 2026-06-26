'use client';

type Props = {
  current: number;
  longest: number;
  todayDone: boolean;
  weekAccuracy: number | null;
  totalQuestions: number;
  weekDailyQuestions: number[];
};

function getStamp(q: number): string {
  if (q === 0) return '';
  if (q < 10) return '🌱';
  if (q < 30) return '🌿';
  if (q < 50) return '🌳';
  return '🌸';
}

function getBg(q: number): string {
  if (q === 0) return '';
  if (q < 50) return 'bg-green-50';
  return 'bg-pink-50';
}

export default function StreakCard({ current, longest, todayDone, weekDailyQuestions }: Props) {
  const today = new Date();
  const dow = today.getDay();
  const todayIdx = dow === 0 ? 6 : dow - 1;
  const days = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <div className="bg-white rounded-2xl border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center text-lg">
            🌱
          </div>
          <div>
            <p className="font-semibold text-base text-gray-900">{current}日連続学習中</p>
            <p className="text-xs text-gray-400">{todayDone ? '今日も達成！' : '今日まだ問題を解いていません'}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">最長記録</p>
          <p className="text-sm font-semibold text-gray-900">{longest}日</p>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className={`text-xs ${i === todayIdx ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{d}</span>
            <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xl border ${
              i === todayIdx
                ? 'border-green-500 border-2'
                : 'border-gray-100'
            } ${i > todayIdx ? 'opacity-30 bg-gray-50' : getBg(weekDailyQuestions[i]) || 'bg-gray-50'}`}>
              {i <= todayIdx ? getStamp(weekDailyQuestions[i]) : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1"><span className="text-sm">🌱</span><span className="text-xs text-gray-400">〜9問</span></div>
        <div className="flex items-center gap-1"><span className="text-sm">🌿</span><span className="text-xs text-gray-400">〜29問</span></div>
        <div className="flex items-center gap-1"><span className="text-sm">🌳</span><span className="text-xs text-gray-400">〜49問</span></div>
        <div className="flex items-center gap-1"><span className="text-sm">🌸</span><span className="text-xs text-gray-400">50問〜</span></div>
      </div>
    </div>
  );
}
