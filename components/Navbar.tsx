'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import HelpModal from '@/components/HelpModal';
import LogoutButton from '@/app/dashboard/LogoutButton';
import { Logo } from '@/components/brand/Logo';
import { quizHelp, generateHelp, kokushiHelp } from '@/lib/helpContent';
import { ADMIN_EMAIL } from '@/lib/constants';

type HelpStep = { icon: string; title: string; description: string };

const HELP_MAP: Record<string, { steps: HelpStep[]; title: string }> = {
  '/quiz':     { steps: quizHelp.steps,     title: quizHelp.pageTitle },
  '/review':   { steps: quizHelp.steps,     title: quizHelp.pageTitle },
  '/generate': { steps: generateHelp.steps, title: generateHelp.pageTitle },
  '/kokushi':  { steps: kokushiHelp.steps,  title: kokushiHelp.pageTitle },
};

export default function Navbar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const help = HELP_MAP[pathname ?? ''];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.email === ADMIN_EMAIL);
    });
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link href="/admin" className="mr-1 rounded-lg bg-rose-500 px-2 py-1 text-xs font-medium text-white hover:bg-rose-600">管理者</Link>
          )}
          {help && <HelpModal steps={help.steps} pageTitle={help.title} />}
          <Link href="/settings" aria-label="設定"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <Settings className="h-5 w-5" strokeWidth={2} />
          </Link>
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
