'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { requestFCMToken } from '@/lib/firebase';

const STORAGE_KEY = 'fcm-permission-asked';

export default function PushNotification() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;

    // 許可済みなら毎回トークンを更新（トークンは変わることがある）
    if (Notification.permission === 'granted') {
      registerToken();
      return;
    }

    // 拒否済み or 既に聞いた場合はバナーを出さない
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (Notification.permission === 'denied') {
      localStorage.setItem(STORAGE_KEY, '1');
      return;
    }
    setShow(true);
  }, []);

  async function registerToken() {
    const token = await requestFCMToken();
    if (!token) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({ fcm_token: token }).eq('id', user.id);
  }

  async function handleAllow() {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
    const permission = await Notification.requestPermission();
    if (permission === 'granted') await registerToken();
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
          <p className="text-xs text-blue-600 mt-0.5 leading-relaxed">
            毎朝7:30に「今日の問題」をお知らせします
          </p>
          <div className="flex gap-2 mt-2.5 flex-wrap">
            <button
              onClick={handleAllow}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              通知を許可する
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-blue-500 py-1.5 hover:underline"
            >
              後で
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-300 hover:text-blue-500 text-lg leading-none"
          aria-label="閉じる"
        >
          ×
        </button>
      </div>
    </div>
  );
}
