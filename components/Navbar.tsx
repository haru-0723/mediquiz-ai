'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import HelpModal from '@/components/HelpModal';
import LogoutButton from '@/app/dashboard/LogoutButton';
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
    <nav className="bg-white border-b px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
        <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">M</span>
        </div>
        <span className="font-semibold text-sm sm:text-base">MediQuiz AI</span>
      </Link>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {isAdmin && (
          <Link href="/admin" className="text-xs bg-red-500 text-white px-2 py-1 rounded-lg hover:bg-red-600">管理者</Link>
        )}
        <Link href="/settings" className="text-xs text-gray-400 hover:text-gray-600">設定</Link>
        {help && <HelpModal steps={help.steps} pageTitle={help.title} />}
        <LogoutButton />
      </div>
    </nav>
  );
}
