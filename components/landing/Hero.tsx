import Link from 'next/link';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50/70 to-transparent" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
        {/* コピー */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            看護・医学・薬学・福祉系の大学生向け
          </div>
          <h1 className="mt-5 text-pretty text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            今日何を勉強するか、
            <span className="mt-1 block text-emerald-600">もう迷わない。</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-slate-600">
            試験日と目標正答率から、今日取り組むべき単元をAIが優先順位づけ。理解度チェックで弱点を可視化し、迷わず対策を続けられます。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              無料で始める
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              使い方を見る
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              クレジットカード不要
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" />
              「今日やること」は無料で使い放題
            </span>
          </div>
        </div>

        {/* プロダクトモック */}
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60 sm:p-5">
            <div className="flex items-center gap-1.5 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">今日やること</span>
                <span className="text-xs text-slate-400">試験まで あと45日</span>
              </div>
              <div className="mt-3 rounded-xl border-2 border-emerald-400 bg-white p-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-xs font-bold text-white">1</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400">病態・薬物治療</p>
                    <p className="text-sm font-bold text-slate-900">心不全・虚血性心疾患</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">正答率58%（目標80%）</span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">5日間未学習</span>
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">試験で最重要</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                  正答率58%で目標の80%まであと22%。最後に勉強してから5日経っています。
                </div>
                <div className="mt-2.5 rounded-lg bg-emerald-600 py-2 text-center text-xs font-semibold text-white">
                  この単元をやる →
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 bg-white px-3 py-2">
                <span className="truncate text-xs font-medium text-slate-600">薬理・自律神経系</span>
                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">要復習</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
