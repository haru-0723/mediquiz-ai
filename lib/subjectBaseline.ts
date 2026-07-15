import type { SupabaseClient } from '@supabase/supabase-js';

// 指定した単元群が属する科目について、まだ「開始地点」（実力チェックの正答率の
// スナップショット）が記録されていなければ、現時点の累積正答率を開始地点として
// 記録する。診断テスト・理解度チェック・演習など、正答率を更新するあらゆる経路の
// 直後に呼び出すことで、どの経路から最初にデータが入っても「今日の目標」が動き出す。
export async function ensureSubjectBaselines(
  supabase: SupabaseClient,
  userId: string,
  unitIds: string[]
): Promise<void> {
  const uniqueUnitIds = Array.from(new Set(unitIds));
  if (uniqueUnitIds.length === 0) return;

  const { data: touchedUnits } = await supabase
    .from('units')
    .select('id, subject_id')
    .in('id', uniqueUnitIds);

  const subjectIds = Array.from(new Set((touchedUnits ?? []).map(u => u.subject_id).filter(Boolean)));
  if (subjectIds.length === 0) return;

  const { data: existingGoals } = await supabase
    .from('user_subject_goals')
    .select('subject_id, baseline_date')
    .eq('user_id', userId)
    .in('subject_id', subjectIds);

  const alreadyBaselined = new Set((existingGoals ?? []).filter(g => g.baseline_date).map(g => g.subject_id));
  const subjectsNeedingBaseline = subjectIds.filter(id => !alreadyBaselined.has(id));
  if (subjectsNeedingBaseline.length === 0) return;

  const { data: subjectUnits } = await supabase
    .from('units')
    .select('id, subject_id')
    .in('subject_id', subjectsNeedingBaseline);

  const unitToSubject = new Map((subjectUnits ?? []).map(u => [u.id, u.subject_id]));
  const allUnitIds = (subjectUnits ?? []).map(u => u.id);
  if (allUnitIds.length === 0) return;

  const { data: progress } = await supabase
    .from('user_unit_progress')
    .select('unit_id, answered_count, correct_count')
    .eq('user_id', userId)
    .in('unit_id', allUnitIds);

  const totals = new Map<string, { correct: number; answered: number }>();
  for (const p of progress ?? []) {
    const subjectId = unitToSubject.get(p.unit_id);
    if (!subjectId) continue;
    const t = totals.get(subjectId) ?? { correct: 0, answered: 0 };
    t.correct += p.correct_count;
    t.answered += p.answered_count;
    totals.set(subjectId, t);
  }

  const today = new Date().toISOString().slice(0, 10);
  await Promise.all(
    Array.from(totals.entries())
      .filter(([, t]) => t.answered > 0)
      .map(([subjectId, t]) =>
        supabase.from('user_subject_goals').upsert({
          user_id: userId,
          subject_id: subjectId,
          baseline_accuracy: Math.round((t.correct / t.answered) * 100),
          baseline_date: today,
        })
      )
  );
}
