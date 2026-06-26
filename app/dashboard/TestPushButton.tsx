'use client';

import { useState } from 'react';
import { subscribePush } from '@/lib/pushClient';

export default function TestPushButton() {
  const [status, setStatus] = useState('');

  async function handleReregister() {
    setStatus('再登録中...');
    localStorage.removeItem('push-permission-asked');
    const sub = await subscribePush();
    if (!sub) { setStatus('通知許可が必要です。ブラウザの通知設定を確認してください。'); return; }
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub),
    });
    if (res.ok) setStatus('再登録完了！テスト通知を送ってください。');
    else setStatus('再登録失敗');
  }

  async function handleTest() {
    setStatus('送信中...');
    const res = await fetch('/api/push/test', { method: 'POST' });
    const data = await res.json();
    if (data.result === 'ok') setStatus('通知を送信しました！');
    else setStatus(`失敗: ${JSON.stringify(data)}`);
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex gap-2">
        <button onClick={handleReregister} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          🔄 通知を再登録
        </button>
        <button onClick={handleTest} className="text-xs bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors">
          🔔 テスト通知を送る
        </button>
      </div>
      {status && <p className="text-xs text-gray-500">{status}</p>}
    </div>
  );
}
