import { Sparkles, Target, BarChart3, FolderClosed, RefreshCw, Printer } from 'lucide-react';

const FEATURES = [
  { icon: Sparkles, tint: 'bg-emerald-50 text-emerald-600', title: 'AIが問題を自動生成', desc: '授業スライドをアップロードするだけで4択問題が完成します。' },
  { icon: Target, tint: 'bg-sky-50 text-sky-600', title: 'CBT・国試モード', desc: '本番さながらの模試形式で、実力を正確に測れます。' },
  { icon: BarChart3, tint: 'bg-amber-50 text-amber-600', title: '苦手分野を自動分析', desc: '正解率から苦手科目を特定し、効率的に復習できます。' },
  { icon: FolderClosed, tint: 'bg-teal-50 text-teal-600', title: '問題をフォルダ管理', desc: '科目ごとに整理して、いつでも見返せます。' },
  { icon: RefreshCw, tint: 'bg-indigo-50 text-indigo-600', title: '間違えた問題を復習', desc: '苦手な問題だけを集めて、繰り返し演習できます。' },
  { icon: Printer, tint: 'bg-rose-50 text-rose-600', title: 'PDFで印刷', desc: '作成した問題集はPDFに書き出して紙でも使えます。' },
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
