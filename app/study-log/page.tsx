'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

type UnitRow = {
  unitId: string;
  unitName: string;
  subjectId: string;
  subjectName: string;
};

export default function StudyLogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: examSetting } = await supabase
        .from('user_exam_settings')
        .select('exam_type, grade')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!examSetting) { router.push('/onboarding'); return; }

      const scopeGrade = examSetting.exam_type === 'regular_test' ? (examSetting.grade ?? 0) : 0;

      const { data: scopes } = await supabase
        .from('unit_scopes')
        .select('unit_id, units(id, name, subject_id, subjects(id, name, display_order))')
        .eq('exam_type', examSetting.exam_type)
        .eq('grade', scopeGrade);

      const rows: UnitRow[] = (scopes ?? [])
        .filter(s => s.units)
        .map(s => {
          const unit = Array.isArray(s.units) ? s.units[0] : s.units;
          const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
          return {
            unitId: unit.id as string,
            unitName: unit.name as string,
            subjectId: (subject?.id as string) ?? '',
            subjectName: (subject?.name as string) ?? 'その他',
          };
        });

      setUnits(rows);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) map.set(u.subjectId, u.subjectName);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [units]);

  function toggleUnit(unitId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  }

  function countInSubject(subjectId: string) {
    return units.filter(u => u.subjectId === subjectId && selected.has(u.unitId)).length;
  }

  async function handleStart() {
    if (selected.size === 0) return;
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ids = Array.from(selected);
      const { error: insertError } = await supabase.from('study_logs').insert(
        ids.map(unitId => ({ user_id: user.id, unit_id: unitId, source: 'self_report' }))
      );
      if (insertError) throw insertError;
      router.push(`/unit-check?units=${ids.join(',')}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (units.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-lg px-4 py-10 text-center">
          <p className="text-sm text-slate-500">現在の試験設定に対応する単元データがまだありません。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <h1 className="text-lg font-semibold text-slate-900">今日は何を勉強しましたか？</h1>
        <p className="mt-1 text-sm text-slate-500">勉強した単元をタップで選んでください（複数OK）。まとめて理解度チェックできます。</p>

        <div className="mt-5 space-y-3">
          {subjects.map(s => {
            const isOpen = openSubject === s.id;
            const cnt = countInSubject(s.id);
            const subjectUnits = units.filter(u => u.subjectId === s.id);
            return (
              <div key={s.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <button
                  onClick={() => setOpenSubject(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-slate-900">{s.name}</span>
                  <span className="flex items-center gap-2">
                    {cnt > 0 && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{cnt}選択中</span>
                    )}
                    <span className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4">
                    {subjectUnits.map(u => {
                      const on = selected.has(u.unitId);
                      return (
                        <button
                          key={u.unitId}
                          onClick={() => toggleUnit(u.unitId)}
                          className={`flex items-center gap-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                            on ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                          {u.unitName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </div>

      {/* 下部固定バー */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{selected.size}単元</span> 選択中
              <span className="ml-1 text-xs text-slate-400">（{selected.size * 3}問）</span>
            </p>
            <button
              onClick={handleStart}
              disabled={saving}
              className="ml-auto rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? '準備中...' : 'まとめて確認テスト →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
