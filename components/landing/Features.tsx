import { ListChecks, Target, BarChart3, ClipboardCheck, Trophy, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: ListChecks, tint: 'bg-emerald-50 text-emerald-600', title: '今日やることが分かる', desc: '正答率・重要度・試験日から算出した優先順位で、毎日の学習に迷いません。' },
  { icon: Target, tint: 'bg-sky-50 text-sky-600', title: '目標正答率から逆算', desc: '試験日までに必要な正答率を「今日の目標」として日々表示します。' },
  { icon: BarChart3, tint: 'bg-amber-50 text-amber-600', title: '単元別の弱点分析', desc: '科目・単元ごとの正答率を記録し、苦手をピンポイントで把握できます。' },
  { icon: ClipboardCheck, tint: 'bg-teal-50 text-teal-600', title: '理解度チェック・週次診断', desc: '単元ごとの3問チェックと、週1回の50問診断テストで実力を定点観測。' },
  { icon: Trophy, tint: 'bg-indigo-50 text-indigo-600', title: 'CBT・国試モード', desc: '本番さながらの模試形式で、実力を正確に測れます。' },
  { icon: Sparkles, tint: 'bg-rose-50 text-rose-600', title: 'AI問題生成', desc: '授業スライドをアップロードするだけで、自分専用の問題も作れます。' },
];

export function Features() {
  return (
    <section id="features" className="border-y border-slate-200 bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold text-emerald-600">FEATURES</p>
          <h2 className="mt-2 text-balance text-3xl font-bold tracking-tight text-slate-900">合格に必要な機能が、すべてここに</h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${f.tint}`}>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
