import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <div className="hidden items-center gap-8 md:flex">
          <a href="#how" className="text-sm text-slate-600 transition-colors hover:text-slate-900">使い方</a>
          <a href="#features" className="text-sm text-slate-600 transition-colors hover:text-slate-900">機能</a>
          <Link href="/pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-900">料金</Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            ログイン
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            無料で始める
          </Link>
        </div>
      </nav>
    </header>
  );
}
