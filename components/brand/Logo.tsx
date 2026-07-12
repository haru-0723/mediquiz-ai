import Link from 'next/link';
import { Stethoscope } from 'lucide-react';

export function Logo({
  href = '/',
  variant = 'default',
  showText = true,
}: {
  href?: string;
  variant?: 'default' | 'onColor';
  showText?: boolean;
}) {
  const isOnColor = variant === 'onColor';
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-xl ${
          isOnColor ? 'bg-white/15 ring-1 ring-white/25' : 'bg-emerald-600'
        }`}
      >
        <Stethoscope className="h-[18px] w-[18px] text-white" strokeWidth={2.2} />
      </div>
      {showText && (
        <span className={`font-semibold tracking-tight ${isOnColor ? 'text-white' : 'text-slate-900'}`}>
          MediQuiz <span className={isOnColor ? 'text-white/80' : 'text-emerald-600'}>AI</span>
        </span>
      )}
    </Link>
  );
}
