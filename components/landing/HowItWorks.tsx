import { CalendarCheck, ListChecks, TrendingUp } from 'lucide-react';

const STEPS = [
  { icon: CalendarCheck, step: 'STEP 1', title: '試験を設定', desc: '学部・学年・試験日を入力するだけ。定期テスト・CBT・国試に対応。' },
  { icon: ListChecks, step: 'STEP 2', title: '今日やることが分かる', desc: '正答率・重要度・試験までの日数からAIが優先順位をつけて毎日更新します。' },
  { icon: TrendingUp, step: 'STEP 3', title: '理解度チェックで定着', desc: '単元ごとに正答率を記録。目標までの差が「今日の目標」として見える化されます。' },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-emerald-600">HOW IT WORKS</p>
        <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-slate-900">使い方はかんたん3ステップ</h2>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.title} className="relative rounded-2xl border border-slate-200 bg-white p-7 transition-shadow hover:shadow-md">
              <span className="pointer-events-none absolute -z-10 right-6 top-6 text-5xl font-bold text-slate-100" aria-hidden="true">{i + 1}</span>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Icon className="h-6 w-6 text-emerald-600" strokeWidth={2} />
              </span>
              <p className="mt-5 text-xs font-semibold tracking-wide text-emerald-600">{s.step}</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
