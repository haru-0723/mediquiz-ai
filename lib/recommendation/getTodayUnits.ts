import { createClient } from '@/lib/supabase/server';

export type TodayUnit = {
  unitId: string;
  unitName: string;
  subjectName: string;
  reasons: string[];
  priority: number;
};

const STALENESS_WINDOW_DAYS = 14;
const REVIEW_THRESHOLD_DAYS = 7;
const WEAK_THRESHOLD = 0.4; // 正答率60%以下相当

// Phase 0: weakness（正答率の低さ）+ staleness（学習からの経過日数）のみでスコアリング。
// 復習期限・データ不足判定はPhase 1で追加予定。
export async function getTodayUnits(userId: string): Promise<TodayUnit[]> {
  const supabase = createClient();

  const { data: examSetting } = await supabase
    .from('user_exam_settings')
    .select('exam_type, grade')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!examSetting) return [];

  const scopeGrade = examSetting.exam_type === 'regular_test' ? (examSetting.grade ?? 0) : 0;

  const { data: scopes } = await supabase
    .from('unit_scopes')
    .select('unit_id, units(id, name, subject_id, subjects(name))')
    .eq('exam_type', examSetting.exam_type)
    .eq('grade', scopeGrade);

  if (!scopes || scopes.length === 0) return [];

  const unitIds = scopes.map(s => s.unit_id);

  const { data: progress } = await supabase
    .from('user_unit_progress')
    .select('unit_id, answered_count, correct_count, last_studied_at')
    .eq('user_id', userId)
    .in('unit_id', unitIds);

  const progressMap = new Map((progress ?? []).map(p => [p.unit_id, p]));
  const now = Date.now();

  const scored: TodayUnit[] = scopes
    .filter(s => s.units)
    .map(s => {
      // Supabaseのネスト select は型上 配列/単体どちらもあり得るため実行時に正規化
      const unit = Array.isArray(s.units) ? s.units[0] : s.units;
      const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
      const p = progressMap.get(s.unit_id);

      const weakness = p && p.answered_count > 0 ? 1 - p.correct_count / p.answered_count : 0.5;
      const daysSince = p?.last_studied_at
        ? (now - new Date(p.last_studied_at).getTime()) / 86_400_000
        : Infinity;
      const staleness = Math.min(daysSince / STALENESS_WINDOW_DAYS, 1);
      const priority = weakness + staleness;

      const reasons: string[] = [];
      if (!p) reasons.push('未学習');
      else if (weakness >= WEAK_THRESHOLD) reasons.push('正答率が低い');
      if (daysSince >= REVIEW_THRESHOLD_DAYS) reasons.push('しばらく勉強していない');

      return {
        unitId: s.unit_id,
        unitName: unit.name as string,
        subjectName: (subject?.name as string) ?? '',
        reasons,
        priority,
      };
    });

  return scored.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
