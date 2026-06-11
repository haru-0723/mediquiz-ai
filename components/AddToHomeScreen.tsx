'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pwa-banner-dismissed';

export default function AddToHomeScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      'standalone' in window.navigator &&
      (window.navigator as Navigator & { standalone: boolean }).standalone;
    const dismissed = localStorage.getItem(STORAGE_KEY);

    if (isIOS && !isStandalone && !dismissed) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                ホーム画面に追加してアプリとして使えます！
              </p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Safari の <span className="font-medium text-gray-700">共有ボタン（□↑）</span> をタップ
                →<span className="font-medium text-gray-700">「ホーム画面に追加」</span> を選択
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
