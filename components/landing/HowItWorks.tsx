import { Upload, Bot, Trophy } from 'lucide-react';

const STEPS = [
  { icon: Upload, step: 'STEP 1', title: '資料をアップロード', desc: '授業スライドやノートをそのままアップロードするだけ。PDF・画像に対応。' },
  { icon: Bot, step: 'STEP 2', title: 'AIが問題を自動生成', desc: '内容を読み取り、試験に出やすい4択問題を解説付きで自動作成します。' },
  { icon: Trophy, step: 'STEP 3', title: '演習して実力アップ', desc: '繰り返し解いて知識を定着。苦手分野は自動で分析・復習できます。' },
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
              <span className="absolute right-6 top-6 text-5xl font-bold text-slate-100">{i + 1}</span>
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
