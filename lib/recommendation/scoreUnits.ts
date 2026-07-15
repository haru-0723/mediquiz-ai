// 「今日やること」の優先順位づけを行う純粋関数群。
// DBアクセスを含まないため、getTodayUnits.ts（Supabase呼び出し）から分離してテスト可能にしている。

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

export type UnitCandidate = {
  unitId: string;
  unitName: string;
  subjectId: string;
  subjectName: string;
  importance: number;
};

export type UnitProgressInfo = {
  answeredCount: number;
  correctCount: number;
  lastStudiedAt: string | null;
};

export type ScoreContext = {
  examType: string;
  daysToExam: number;
  now: number;
  targetBySubject: Map<string, number>;
  progressByUnit: Map<string, UnitProgressInfo>;
  dismissedUnitIds: Set<string>;
};

export const REVIEW_THRESHOLD_DAYS = 7;
export const MIN_RELIABLE_ANSWERS = 5; // これ未満は「データ不足」
export const DEFAULT_TARGET = 80;

// 間隔反復（スペースドリピティション）の簡易版：正答率が高い単元ほど
// 「まだ大丈夫」とみなせる期間を長くし、低い単元ほど早めに復習を促す。
export function idealReviewIntervalDays(accuracy: number | null): number {
  if (accuracy === null) return 1;
  if (accuracy >= 90) return 30;
  if (accuracy >= 80) return 21;
  if (accuracy >= 70) return 14;
  if (accuracy >= 50) return 7;
  return 3;
}

export function scoreUnit(candidate: UnitCandidate, ctx: ScoreContext): TodayUnit {
  const p = ctx.progressByUnit.get(candidate.unitId);
  const importance = candidate.importance ?? 3;
  const importanceW = importance / 5;

  const hasData = !!p && p.answeredCount > 0;
  const accuracy = hasData ? Math.round((p!.correctCount / p!.answeredCount) * 100) : null;
  const target = ctx.targetBySubject.get(candidate.subjectId) ?? DEFAULT_TARGET;

  // 各因子（0〜1）
  const weakness = hasData
    ? Math.min(Math.max((target - (accuracy as number)) / 100, 0), 1)
    : 0.55; // 未学習は「中程度に弱い」とみなし、まず一度測りに行かせる

  const daysSince = p?.lastStudiedAt
    ? (ctx.now - new Date(p.lastStudiedAt).getTime()) / 86_400_000
    : Infinity;
  const reviewWindow = idealReviewIntervalDays(accuracy);
  const staleness = Math.min((daysSince === Infinity ? reviewWindow : daysSince) / reviewWindow, 1);

  const answered = p?.answeredCount ?? 0;
  const dataDeficit = answered < MIN_RELIABLE_ANSWERS ? 1 : 0;

  // 試験が近いほど 0→1 に近づく（180日を基準に線形）
  const examUrgency = Math.min(Math.max(1 - ctx.daysToExam / 180, 0), 1);

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
    const examLabel = ctx.examType === 'cbt' ? 'CBT' : ctx.examType === 'kokushi' ? '国試' : '試験';
    detailParts.push(`${examLabel}で${importance >= 5 ? '最重要' : '重要'}とされる単元です。`);
  }
  if (hasData && dataDeficit) {
    detailParts.push(`回答数がまだ${answered}問と少なく、正答率の信頼度が低い状態です。`);
  }
  detailParts.push(`試験まで残り${ctx.daysToExam}日。`);

  return {
    unitId: candidate.unitId,
    unitName: candidate.unitName,
    subjectName: candidate.subjectName,
    accuracy,
    answeredCount: answered,
    importance,
    reasons,
    detail: detailParts.join(''),
    priority,
  };
}

export function rankTodayUnits(candidates: UnitCandidate[], ctx: ScoreContext, limit = 4): TodayUnit[] {
  const scored = candidates
    .filter(c => !ctx.dismissedUnitIds.has(c.unitId))
    .map(c => scoreUnit(c, ctx));
  return scored.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
