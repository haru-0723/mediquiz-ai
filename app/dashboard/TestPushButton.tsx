'use client';

import { useState } from 'react';

export default function TestPushButton() {
  const [status, setStatus] = useState('');

  async function handleTest() {
    setStatus('送信中...');
    const res = await fetch('/api/push/test', { method: 'POST' });
    const data = await res.json();
    if (data.result === 'ok') setStatus('通知を送信しました！');
    else setStatus(`エラー: ${JSON.stringify(data)}`);
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleTest}
        className="text-xs bg-gray-700 text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
      >
        🔔 テスト通知を送る
      </button>
      {status && <p className="text-xs text-gray-500 mt-1">{status}</p>}
    </div>
  );
}
