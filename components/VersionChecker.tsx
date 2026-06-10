'use client';

import { useEffect, useRef, useState } from 'react';

export default function VersionChecker() {
  const initialVersion = useRef<string | null>(null);
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json();
        const version = data.version as string;

        if (initialVersion.current === null) {
          initialVersion.current = version;
        } else if (version !== initialVersion.current) {
          setOutdated(true);
        }
      } catch {
        // ネットワークエラーは無視
      }
    }

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!outdated) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-yellow-400 px-4 py-3 shadow-md">
      <span className="text-sm font-medium text-yellow-900">
        🔔 新しいバージョンがあります。再読み込みして最新の状態にしてください
      </span>
      <button
        onClick={() => window.location.reload()}
        className="flex-shrink-0 rounded-lg bg-yellow-900 px-3 py-1.5 text-xs font-semibold text-yellow-100 transition-colors hover:bg-yellow-800"
      >
        再読み込み
      </button>
    </div>
  );
}
