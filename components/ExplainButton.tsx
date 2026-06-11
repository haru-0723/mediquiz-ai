'use client';

import { useState } from 'react';
import Link from 'next/link';

type Props = {
  question: string;
  answer: string;
  explanation: string | null;
  subject: string | null;
  accentColor?: 'green' | 'orange' | 'blue' | 'purple';
};

type Status = 'idle' | 'loading' | 'done' | 'upgrade' | 'error';

const ACCENT = {
  green:  { border: 'border-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  btn: 'text-green-600 border-green-200 hover:bg-green-50' },
  orange: { border: 'border-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', btn: 'text-orange-500 border-orange-200 hover:bg-orange-50' },
  blue:   { border: 'border-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   btn: 'text-blue-600 border-blue-200 hover:bg-blue-50' },
  purple: { border: 'border-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', btn: 'text-purple-600 border-purple-200 hover:bg-purple-50' },
};

function renderMarkdown(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    if (block.startsWith('## ')) {
      return <h2 key={i} className="font-bold text-gray-900 text-base mt-4 mb-1">{block.slice(3)}</h2>;
    }
    if (block.startsWith('### ')) {
      return <h3 key={i} className="font-semibold text-gray-900 text-sm mt-3 mb-1">{block.slice(4)}</h3>;
    }
    const lines = block.split('\n');
    const isList = lines.every(l => l.startsWith('- ') || l.startsWith('* ') || l.trim() === '');
    if (isList) {
      const items = lines.filter(l => l.startsWith('- ') || l.startsWith('* ')).map(l => l.slice(2));
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-2">
          {items.map((item, j) => <li key={j} className="text-sm text-gray-700 leading-relaxed">{renderInline(item)}</li>)}
        </ul>
      );
    }
    return <p key={i} className="text-sm text-gray-700 leading-relaxed">{renderInline(block)}</p>;
  });
}

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : part
  );
}

export default function ExplainButton({ question, answer, explanation, subject, accentColor = 'green' }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [deepExplanation, setDeepExplanation] = useState('');
  const c = ACCENT[accentColor];

  async function handleClick() {
    if (status === 'done') {
      setStatus('idle');
      setDeepExplanation('');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, explanation, subject }),
      });
      const data = await res.json();
      if (res.status === 403 && data.upgrade) {
        setStatus('upgrade');
        return;
      }
      if (!res.ok) throw new Error(data.error);
      setDeepExplanation(data.explanation);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="mt-3">
      {status !== 'upgrade' && (
        <button
          onClick={handleClick}
          disabled={status === 'loading'}
          className={`text-xs border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${c.btn}`}
        >
          {status === 'loading' ? '⏳ AIが解説を生成しています...' : status === 'done' ? '▲ 詳しい解説を閉じる' : '💡 もっと詳しく解説する'}
        </button>
      )}

      {status === 'upgrade' && (
        <div className={`mt-2 p-3 rounded-xl border ${c.border} ${c.bg}`}>
          <p className={`text-xs font-medium ${c.text} mb-1`}>✨ スタンダードプランの機能です</p>
          <p className="text-xs text-gray-500 mb-2">AI解説の深掘りは有料プランでご利用いただけます。</p>
          <Link href="/pricing" className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 inline-block">
            アップグレードする →
          </Link>
          <button onClick={() => setStatus('idle')} className="ml-2 text-xs text-gray-400 hover:text-gray-600">閉じる</button>
        </div>
      )}

      {status === 'error' && (
        <p className="text-xs text-red-500 mt-1">解説の生成に失敗しました。もう一度お試しください。</p>
      )}

      {status === 'done' && deepExplanation && (
        <div className={`mt-3 p-4 rounded-xl border-l-4 ${c.border} ${c.bg} space-y-1`}>
          <p className={`text-xs font-semibold ${c.text} mb-2`}>🔬 AI詳細解説</p>
          {renderMarkdown(deepExplanation)}
        </div>
      )}
    </div>
  );
}
