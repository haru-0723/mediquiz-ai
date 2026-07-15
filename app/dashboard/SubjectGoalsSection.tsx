'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, Pencil, Check, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type SubjectGoal = {
  subjectId: string;
  subjectName: string;
  currentAccuracy: number | null;
  answeredCount: number;
  targetAccuracy: number;
  todayTarget: number;
  onTrack: boolean;
};

const GRID_LINES = [0, 25, 50, 75, 100];

export default function SubjectGoalsSection({ goals }: { goals: SubjectGoal[] }) {
  const supabase = createClient();
  const [items, setItems] = useState(goals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(g: SubjectGoal) {
    setEditingId(g.subjectId);
    setDraftValue(String(g.targetAccuracy));
  }

  async function saveTarget(subjectId: string) {
    const value = Math.min(100, Math.max(1, Math.round(Number(draftValue) || 0)));
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('user_subject_goals').upsert({
        user_id: user.id,
        subject_id: subjectId,
        target_accuracy: value,
      });
      setItems(prev => prev.map(g => g.subjectId === subjectId ? { ...g, targetAccuracy: value } : g));
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

  const onTrackCount = items.filter(g => g.currentAccuracy !== null && g.onTrack).length;
  const withData = items.filter(g => g.currentAccuracy !== null).length;

  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">学習目標・到達度</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-500" strokeWidth={2} />
          <h3 className="text-sm font-semibold text-slate-900">科目別 正答率と目標</h3>
          {withData > 0 && (
            <span className="ml-auto text-xs text-slate-400">{onTrackCount}/{withData} 科目が順調</span>
          )}
        </div>
        <div className="mb-3 flex items-center gap-4 px-0.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />現在の正答率</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />今日の目標</span>
          <span className="flex items-center gap-1"><span className="h-2 w-0.5 bg-slate-400" />最終目標</span>
        </div>

        <div className="space-y-5">
          {items.map(g => {
            const hasData = g.currentAccuracy !== null;
            const gap = hasData ? g.todayTarget - (g.currentAccuracy as number) : null;
            const isEditing = editingId === g.subjectId;
            return (
              <div key={g.subjectId}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <Link href={`/subject/${g.subjectId}`}
                    className="flex min-w-0 items-center gap-0.5 text-sm font-medium text-slate-900 hover:text-emerald-600">
                    <span className="truncate">{g.subjectName}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} />
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {hasData ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        g.onTrack ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {g.onTrack ? '順調' : `あと${gap}%`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">未着手</span>
                    )}
                  </div>
                </div>

                {/* 現在の正答率と目標を比較する棒グラフ（グリッド線付き） */}
                <div className="relative rounded-lg bg-slate-50 px-2 pb-1.5 pt-2">
                  <div className="pointer-events-none absolute inset-x-2 top-2 bottom-6">
                    {GRID_LINES.map(v => (
                      <div key={v} className="absolute top-0 h-full w-px bg-slate-200" style={{ left: `${v}%` }} />
                    ))}
                  </div>

                  <div className="relative mb-1.5 flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[10px] text-slate-400">現在</span>
                    <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-slate-200">
                      <div
                        className={`h-full rounded ${g.onTrack ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                        style={{ width: `${hasData ? g.currentAccuracy : 0}%` }}
                      />
                      <div className="absolute top-0 h-full w-0.5 bg-slate-500" style={{ left: `${g.targetAccuracy}%` }} title="最終目標" />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-700">
                      {hasData ? `${g.currentAccuracy}%` : '--'}
                    </span>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <span className="w-10 shrink-0 text-[10px] text-slate-400">今日</span>
                    <div className="relative h-3.5 flex-1 overflow-hidden rounded bg-slate-200">
                      <div className="h-full rounded bg-amber-400" style={{ width: `${g.todayTarget}%` }} />
                      <div className="absolute top-0 h-full w-0.5 bg-slate-500" style={{ left: `${g.targetAccuracy}%` }} title="最終目標" />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-amber-600">
                      {g.todayTarget}%
                    </span>
                  </div>

                  <div className="relative mt-1.5 flex h-3 items-center">
                    <span className="w-10 shrink-0" />
                    <div className="relative flex-1">
                      {GRID_LINES.map(v => (
                        <span key={v} className="absolute -translate-x-1/2 text-[9px] text-slate-300" style={{ left: `${v}%` }}>{v}</span>
                      ))}
                    </div>
                    <span className="w-9 shrink-0" />
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-end text-xs">
                  {isEditing ? (
                    <span className="flex items-center gap-1">
                      <input type="number" min={1} max={100} value={draftValue} onChange={e => setDraftValue(e.target.value)}
                        className="w-12 rounded-lg border border-emerald-300 px-1 py-0.5 text-right text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                      <button onClick={() => saveTarget(g.subjectId)} disabled={saving}
                        className="flex h-5 w-5 items-center justify-center rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    </span>
                  ) : (
                    <button onClick={() => startEdit(g)} className="flex items-center gap-0.5 text-slate-400 hover:text-emerald-600">
                      最終目標{g.targetAccuracy}%
                      <Pencil className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
