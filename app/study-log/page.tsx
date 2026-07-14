'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase/client';

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
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
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
        .select('unit_id, units(id, name, subject_id, subjects(id, name))')
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

  const unitsInSubject = useMemo(
    () => units.filter(u => u.subjectId === selectedSubjectId),
    [units, selectedSubjectId]
  );

  async function handleSelectUnit(unit: UnitRow) {
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error: insertError } = await supabase.from('study_logs').insert({
        user_id: user.id,
        unit_id: unit.unitId,
        source: 'self_report',
      });
      if (insertError) throw insertError;
      router.push(`/unit-check?unit=${unit.unitId}&unitName=${encodeURIComponent(unit.unitName)}&subjectName=${encodeURIComponent(unit.subjectName)}`);
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
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-lg px-4 py-6 sm:py-8">
        <h1 className="text-lg font-semibold text-slate-900">今日は何を勉強しましたか？</h1>

        {!selectedSubjectId ? (
          <>
            <p className="mt-1 text-sm text-slate-500">科目を選んでください</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {subjects.map(s => (
                <button key={s.id} onClick={() => setSelectedSubjectId(s.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-medium text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  {s.name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <button onClick={() => setSelectedSubjectId(null)} className="text-emerald-600 hover:underline">← 科目を選び直す</button>
              <span>/</span>
              <span>{subjects.find(s => s.id === selectedSubjectId)?.name}</span>
            </div>
            <p className="mt-3 text-sm text-slate-500">単元を選んでください</p>
            <div className="mt-4 space-y-2">
              {unitsInSubject.map(u => (
                <button key={u.unitId} onClick={() => handleSelectUnit(u)} disabled={saving}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left text-sm font-medium text-slate-900 transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60">
                  {u.unitName}
                  <span className="text-emerald-600">→</span>
                </button>
              ))}
            </div>
          </>
        )}

        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
