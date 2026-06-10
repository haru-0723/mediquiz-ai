'use client';

type Props = {
  message: string;
  showUpgrade?: boolean;
};

export default function ErrorBanner({ message, showUpgrade = true }: Props) {
  return (
    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
      <p>{message}</p>
      {showUpgrade && (
        <a href="/pricing" className="underline font-medium mt-1 inline-block">
          プランをアップグレードする →
        </a>
      )}
    </div>
  );
}
