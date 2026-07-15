import { createClient } from '@/lib/supabase/server';
import { rankTodayUnits, type UnitCandidate, type UnitProgressInfo } from './scoreUnits';

export type { TodayReason, TodayUnit } from './scoreUnits';

export function getJSTDateStr(base: Date = new Date()): string {
  const jst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// 「今日やること」を、以下の要素を複合してスコアリングして返す：
//  - 目標正答率との差（weakness）
//  - 解いた問題数＝データの信頼度（dataDeficit）
//  - 試験での重要度（importance）
//  - 試験までの日数（examUrgency）
//  - 最後に勉強してからの経過日数（staleness、正答率に応じた間隔反復）
// スコアリング本体は lib/recommendation/scoreUnits.ts の純粋関数に委譲している。
export async function getTodayUnits(userId: string, limit = 4) {
  const supabase = createClient();

  const { data: examSetting } = await supabase
    .from('user_exam_settings')
    .select('exam_type, grade, exam_date')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!examSetting) return [];

  const scopeGrade = examSetting.exam_type === 'regular_test' ? (examSetting.grade ?? 0) : 0;
  const daysToExam = Math.max(
    Math.ceil((new Date(examSetting.exam_date).getTime() - Date.now()) / 86_400_000),
    0
  );

  const [{ data: scopes }, { data: goals }, { data: dismissals }] = await Promise.all([
    supabase
      .from('unit_scopes')
      .select('unit_id, importance, units(id, name, subject_id, subjects(name))')
      .eq('exam_type', examSetting.exam_type)
      .eq('grade', scopeGrade),
    supabase.from('user_subject_goals').select('subject_id, target_accuracy').eq('user_id', userId),
    supabase.from('today_dismissals').select('unit_id').eq('user_id', userId).eq('dismissed_on', getJSTDateStr()),
  ]);

  if (!scopes || scopes.length === 0) return [];

  const unitIds = scopes.map(s => s.unit_id);
  const { data: progress } = await supabase
    .from('user_unit_progress')
    .select('unit_id, answered_count, correct_count, last_studied_at')
    .eq('user_id', userId)
    .in('unit_id', unitIds);

  const candidates: UnitCandidate[] = scopes
    .filter(s => s.units)
    .map(s => {
      const unit = Array.isArray(s.units) ? s.units[0] : s.units;
      const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
      return {
        unitId: s.unit_id,
        unitName: unit.name as string,
        subjectId: unit.subject_id as string,
        subjectName: (subject?.name as string) ?? '',
        importance: s.importance ?? 3,
      };
    });

  const progressByUnit = new Map<string, UnitProgressInfo>(
    (progress ?? []).map(p => [p.unit_id, {
      answeredCount: p.answered_count,
      correctCount: p.correct_count,
      lastStudiedAt: p.last_studied_at,
    }])
  );

  return rankTodayUnits(candidates, {
    examType: examSetting.exam_type,
    daysToExam,
    now: Date.now(),
    targetBySubject: new Map((goals ?? []).map(g => [g.subject_id, g.target_accuracy])),
    progressByUnit,
    dismissedUnitIds: new Set((dismissals ?? []).map(d => d.unit_id)),
  }, limit);
}
