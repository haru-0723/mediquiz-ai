import { createClient } from '@/lib/supabase/server';

export type TodayReason = { label: string; tone: 'weak' | 'stale' | 'important' | 'data' };

export type TodayUnit = {
  unitId: string;
  unitName: string;
  subjectName: string;
  accuracy: number | null;
  answeredCount: number;
  importance: number;
  reasons: TodayReason[];
  detail: string;
  priority: number;
};


const STALENESS_WINDOW_DAYS = 14;
const REVIEW_THRESHOLD_DAYS = 7;
const MIN_RELIABLE_ANSWERS = 5; // これ未満は「データ不足」
const DEFAULT_TARGET = 80;

export function getJSTDateStr(base: Date = new Date()): string {
  const jst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// 「今日やること」を、以下の要素を複合してスコアリングして返す：
//  - 目標正答率との差（weakness）
//  - 解いた問題数＝データの信頼度（dataDeficit）
//  - 試験での重要度（importance）
//  - 試験までの日数（examUrgency）
//  - 最後に勉強してからの経過日数（staleness）
// スコア降順で最大件数を返し、それぞれ人間が読める理由を添える。
export async function getTodayUnits(userId: string, limit = 4): Promise<TodayUnit[]> {
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

  const progressMap = new Map((progress ?? []).map(p => [p.unit_id, p]));
  const targetBySubject = new Map((goals ?? []).map(g => [g.subject_id, g.target_accuracy]));
  const dismissedIds = new Set((dismissals ?? []).map(d => d.unit_id));

  const now = Date.now();
  // 試験が近いほど 0→1 に近づく（180日を基準に線形）
  const examUrgency = Math.min(Math.max(1 - daysToExam / 180, 0), 1);

  const scored: TodayUnit[] = scopes
    .filter(s => s.units && !dismissedIds.has(s.unit_id))
    .map(s => {
      const unit = Array.isArray(s.units) ? s.units[0] : s.units;
      const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
      const subjectName = (subject?.name as string) ?? '';
      const p = progressMap.get(s.unit_id);
      const importance = s.importance ?? 3;
      const importanceW = importance / 5;

      const hasData = !!p && p.answered_count > 0;
      const accuracy = hasData ? Math.round((p!.correct_count / p!.answered_count) * 100) : null;
      const target = targetBySubject.get(unit.subject_id) ?? DEFAULT_TARGET;

      // 各因子（0〜1）
      const weakness = hasData
        ? Math.min(Math.max((target - (accuracy as number)) / 100, 0), 1)
        : 0.55; // 未学習は「中程度に弱い」とみなし、まず一度測りに行かせる
      const daysSince = p?.last_studied_at
        ? (now - new Date(p.last_studied_at).getTime()) / 86_400_000
        : Infinity;
      const staleness = Math.min((daysSince === Infinity ? STALENESS_WINDOW_DAYS : daysSince) / STALENESS_WINDOW_DAYS, 1);
      const answered = p?.answered_count ?? 0;
      const dataDeficit = answered < MIN_RELIABLE_ANSWERS ? 1 : 0;

      // 複合スコア。重要度は「試験が近いほど」効きを強める。
      const priority =
        weakness * 1.3 +
        staleness * 0.8 +
        importanceW * (1.0 + examUrgency * 0.8) +
        dataDeficit * 0.6;

      const reasons: TodayReason[] = [];
      if (hasData && (accuracy as number) < target) {
        reasons.push({ label: `正答率${accuracy}%（目標${target}%）`, tone: 'weak' });
      }
      if (daysSince === Infinity) {
        reasons.push({ label: 'まだ手をつけていません', tone: 'stale' });
      } else if (daysSince >= REVIEW_THRESHOLD_DAYS) {
        reasons.push({ label: `${Math.floor(daysSince)}日間勉強していません`, tone: 'stale' });
      }
      if (importance >= 4) {
        reasons.push({ label: importance >= 5 ? '試験で最重要' : '試験で重要', tone: 'important' });
      }
      if (hasData && dataDeficit) {
        reasons.push({ label: `データ不足（あと${MIN_RELIABLE_ANSWERS - answered}問で安定）`, tone: 'data' });
      }
      if (reasons.length === 0) {
        reasons.push({ label: '定着のため復習', tone: 'stale' });
      }

      // 優先順位の根拠を文章で伝える（一番上のカードで詳しく表示するため）
      const detailParts: string[] = [];
      if (hasData) {
        const diff = target - (accuracy as number);
        detailParts.push(
          diff > 0
            ? `正答率${accuracy}%で、目標の${target}%まであと${diff}%です。`
            : `正答率${accuracy}%で目標${target}%を達成中ですが、定着のため復習をおすすめします。`
        );
      } else {
        detailParts.push('まだ一度もこの単元を学習していません。');
      }
      if (daysSince !== Infinity && daysSince >= REVIEW_THRESHOLD_DAYS) {
        detailParts.push(`最後に勉強してから${Math.floor(daysSince)}日経っています。`);
      }
      if (importance >= 4) {
        detailParts.push(`${examSetting.exam_type === 'cbt' ? 'CBT' : examSetting.exam_type === 'kokushi' ? '国試' : '試験'}で${importance >= 5 ? '最重要' : '重要'}とされる単元です。`);
      }
      if (hasData && dataDeficit) {
        detailParts.push(`回答数がまだ${answered}問と少なく、正答率の信頼度が低い状態です。`);
      }
      detailParts.push(`試験まで残り${daysToExam}日。`);

      return {
        unitId: s.unit_id,
        unitName: unit.name as string,
        subjectName,
        accuracy,
        answeredCount: answered,
        importance,
        reasons,
        detail: detailParts.join(''),
        priority,
      };
    });

  return scored.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
