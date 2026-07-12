'use client';

type Props = {
  message: string;
  showUpgrade?: boolean;
};

export default function ErrorBanner({ message, showUpgrade = true }: Props) {
  return (
    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
      <p>{message}</p>
      {showUpgrade && (
        <a href="/pricing" className="mt-1 inline-block font-medium underline">
          プランをアップグレードする →
        </a>
      )}
    </div>
  );
}
