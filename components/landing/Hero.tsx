import Link from 'next/link';
import { ArrowRight, Check, FileText, Sparkles, Target, BarChart3 } from 'lucide-react';

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
            資料をアップロードするだけで
            <span className="mt-1 block text-emerald-600">AIが問題を自動生成</span>
          </h1>
          <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-slate-600">
            授業スライドやノートから、試験に出やすい問題を自動作成。CBT・国試モードで本番対策まで、これ一つで完結します。
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
              数分で問題集が完成
            </span>
          </div>
        </div>

        {/* プロダクトモック */}
        <div className="relative">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/60">
            <div className="flex items-center gap-1.5 pb-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">循環器</span>
                <span className="text-xs text-slate-400">Q3 / 10</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800">
                心不全患者で最初に確認すべきバイタルサインはどれか。
              </p>
              <div className="mt-3 space-y-2">
                {[
                  { label: '呼吸数と SpO₂', correct: true },
                  { label: '体温', correct: false },
                  { label: '身長', correct: false },
                ].map((o) => (
                  <div
                    key={o.label}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      o.correct
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        o.correct ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
                      }`}
                    >
                      {o.correct && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {o.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* フローティングチップ */}
          <div className="absolute -left-3 top-8 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:flex sm:items-center sm:gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100">
              <FileText className="h-4 w-4 text-sky-600" />
            </span>
            <span className="text-xs font-medium text-slate-700">PDF から生成</span>
          </div>
          <div className="absolute -bottom-3 -right-2 hidden rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg sm:flex sm:items-center sm:gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <BarChart3 className="h-4 w-4 text-amber-600" />
            </span>
            <span className="text-xs font-medium text-slate-700">苦手分野を分析</span>
          </div>
          <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg lg:flex lg:items-center lg:gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <Target className="h-4 w-4 text-emerald-600" />
            </span>
            <span className="text-xs font-medium text-slate-700">国試モード</span>
          </div>
        </div>
      </div>
    </section>
  );
}
