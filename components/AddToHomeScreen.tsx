'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pwa-banner-dismissed';

type Platform = 'ios' | 'android' | null;

export default function AddToHomeScreen() {
  const [platform, setPlatform] = useState<Platform>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(ua.includes('CriOS') || ua.includes('FxiOS'));
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone: boolean }).standalone);

    if (isStandalone) return;

    if (isIOS) {
      setPlatform('ios');
      setVisible(true);
      return;
    }

    // Android / Chrome: beforeinstallprompt イベントを待つ
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible || !platform) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 pointer-events-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                ホーム画面に追加してアプリとして使えます！
              </p>
              {platform === 'ios' ? (
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Safari の <span className="font-medium text-gray-700">共有ボタン（□↑）</span> をタップ
                  → <span className="font-medium text-gray-700">「ホーム画面に追加」</span> を選択
                </p>
              ) : (
                <button
                  onClick={handleAndroidInstall}
                  className="mt-2 text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  ホーム画面に追加する
                </button>
              )}
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
