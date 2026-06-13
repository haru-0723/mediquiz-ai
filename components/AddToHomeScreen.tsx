'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pwa-banner-dismissed';

type Platform = 'ios' | 'android' | 'line-ios' | 'line-android' | null;
type Props = { inline?: boolean };

export default function AddToHomeScreen({ inline = false }: Props) {
  const [platform, setPlatform] = useState<Platform>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    const ua = navigator.userAgent;
    const isLine = ua.includes('Line/');
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(ua.includes('CriOS') || ua.includes('FxiOS'));
    const isAndroid = /Android/.test(ua);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as Navigator & { standalone: boolean }).standalone);

    if (isStandalone) return;

    // LINEアプリ内ブラウザ
    if (isLine) {
      setPlatform(isIOS ? 'line-ios' : 'line-android');
      setVisible(true);
      return;
    }

    // 通常 iOS Safari
    if (isIOS) {
      setPlatform('ios');
      setVisible(true);
      return;
    }

    // Android Chrome: beforeinstallprompt を待つ
    if (isAndroid) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatform('android');
        setVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') dismiss();
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  if (!visible || !platform) return null;

  // LINE内ブラウザ向けコンテンツ
  const lineContent = platform === 'line-ios' ? (
    <>
      <p className="text-sm font-semibold text-orange-800">
        Safariで開いてホーム画面に追加できます
      </p>
      <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
        右下の <span className="font-medium">「…」→「ブラウザで開く」</span> をタップ後、Safariの共有ボタン（□↑）→「ホーム画面に追加」
      </p>
    </>
  ) : (
    <>
      <p className="text-sm font-semibold text-orange-800">
        Chromeで開いてホーム画面に追加できます
      </p>
      <p className="text-xs text-orange-700 mt-0.5 leading-relaxed">
        右上の <span className="font-medium">「…」→「他のアプリで開く」</span> でChromeを選択後、メニューから「ホーム画面に追加」
      </p>
    </>
  );

  const isLineVariant = platform === 'line-ios' || platform === 'line-android';

  if (inline) {
    return (
      <div className="sm:hidden mb-4">
        <div className={`border rounded-xl p-3 flex items-start gap-3 ${
          isLineVariant ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
        }`}>
          <span className="text-xl flex-shrink-0">📱</span>
          <div className="flex-1 min-w-0">
            {isLineVariant ? lineContent : (
              <>
                <p className="text-sm font-semibold text-green-800">ホーム画面に追加できます</p>
                {platform === 'ios' ? (
                  <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                    Safari の <span className="font-medium">共有（□↑）</span> →「ホーム画面に追加」
                  </p>
                ) : (
                  <button
                    onClick={handleAndroidInstall}
                    className="mt-1.5 text-xs bg-green-600 text-white px-3 py-1 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    ホーム画面に追加する
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            className={`flex-shrink-0 text-lg leading-none ${
              isLineVariant ? 'text-orange-400 hover:text-orange-600' : 'text-green-400 hover:text-green-600'
            }`}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pointer-events-none">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 pointer-events-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">📱</span>
            <div>
              {isLineVariant ? lineContent : (
                <>
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
                </>
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
