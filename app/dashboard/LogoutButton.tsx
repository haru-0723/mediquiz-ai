'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
      <span className="hidden sm:inline">ログアウト</span>
    </button>
  );
}
