// 「今日の目標正答率」の算出ロジック（純粋関数）。
// 標準的な準備期間に対して試験まで残り何日かで進捗率を決める。
// baseline_date（開始地点を記録した日）を基準にすると、記録が試験直前
// （＝残り日数が少ない）だった場合に「今日の目標＝現在地点」に張り付き、
// 危機感のない数値になってしまうため、あえて使わない設計にしている。
export const ASSUMED_PREP_DAYS: Record<string, number> = {
  kokushi: 240,
  cbt: 90,
  regular_test: 30,
};

export function getAssumedPrepDays(examType: string): number {
  return ASSUMED_PREP_DAYS[examType] ?? 90;
}

export function computeTodayTarget(
  baseline: number,
  finalTarget: number,
  daysToExam: number,
  examType: string
): number {
  const prepDays = getAssumedPrepDays(examType);
  const progressRatio = Math.min(Math.max(1 - daysToExam / prepDays, 0), 1);
  return Math.round(baseline + (finalTarget - baseline) * progressRatio);
}
