import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export function CtaFooter() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-emerald-600 px-8 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
          <h2 className="relative text-balance text-3xl font-bold tracking-tight text-white">今日から、学習を効率化しよう</h2>
          <p className="relative mx-auto mt-3 max-w-md text-pretty text-emerald-50">登録は無料。試験日を設定すれば、今日やることがすぐに分かります。</p>
          <Link
            href="/auth/signup"
            className="relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-transform hover:scale-[1.02]"
          >
            無料で始める
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <Link href="/terms" className="transition-colors hover:text-slate-800">利用規約</Link>
            <Link href="/privacy" className="transition-colors hover:text-slate-800">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="transition-colors hover:text-slate-800">特定商取引法</Link>
          </div>
          <span className="text-sm text-slate-400">© 2026 MediQuiz AI</span>
        </div>
      </footer>
    </>
  );
}
