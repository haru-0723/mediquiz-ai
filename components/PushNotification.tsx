'use client';

import { useEffect, useState } from 'react';
import { subscribePush } from '@/lib/pushClient';

const STORAGE_KEY = 'push-permission-asked';

export default function PushNotification() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') { registerSubscription(); return; }
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission === 'denied') { localStorage.setItem(STORAGE_KEY, '1'); return; }
    setShow(true);
  }, []);

  async function registerSubscription() {
    const sub = await subscribePush();
    if (!sub) return;
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
  }

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await registerSubscription();
  }

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="mb-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-800">毎日の問題を通知で受け取る</p>
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">毎朝7:30に「今日の問題」をお知らせします</p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <button onClick={handleAllow} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              通知を許可する
            </button>
            <button onClick={handleDismiss} className="text-xs text-blue-500 py-1.5 hover:underline">後で</button>
          </div>
        </div>
        <button onClick={handleDismiss} className="flex-shrink-0 text-blue-300 hover:text-blue-500 text-lg leading-none" aria-label="閉じる">×</button>
      </div>
    </div>
  );
}
