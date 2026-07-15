import { describe, it, expect } from 'vitest';
import { scoreUnit, rankTodayUnits, idealReviewIntervalDays, type UnitCandidate, type ScoreContext } from './scoreUnits';

function makeCandidate(overrides: Partial<UnitCandidate> = {}): UnitCandidate {
  return {
    unitId: 'unit-1',
    unitName: 'テスト単元',
    subjectId: 'subject-1',
    subjectName: 'テスト科目',
    importance: 3,
    ...overrides,
  };
}

function makeContext(overrides: Partial<ScoreContext> = {}): ScoreContext {
  return {
    examType: 'kokushi',
    daysToExam: 100,
    now: new Date('2026-07-15T00:00:00Z').getTime(),
    targetBySubject: new Map(),
    progressByUnit: new Map(),
    dismissedUnitIds: new Set(),
    ...overrides,
  };
}

describe('idealReviewIntervalDays', () => {
  it('未学習（accuracy=null）は最短間隔', () => {
    expect(idealReviewIntervalDays(null)).toBe(1);
  });
  it('正答率が高いほど間隔が長くなる（間隔反復）', () => {
    const low = idealReviewIntervalDays(40);
    const mid = idealReviewIntervalDays(75);
    const high = idealReviewIntervalDays(95);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
  });
});

describe('scoreUnit', () => {
  it('未学習の単元は「まだ手をつけていません」の理由を含む', () => {
    const result = scoreUnit(makeCandidate(), makeContext());
    expect(result.accuracy).toBeNull();
    expect(result.reasons.some(r => r.label === 'まだ手をつけていません')).toBe(true);
  });

  it('目標未達の単元は正答率と目標の差を理由に含む', () => {
    const ctx = makeContext({
      targetBySubject: new Map([['subject-1', 80]]),
      progressByUnit: new Map([['unit-1', { answeredCount: 10, correctCount: 5, lastStudiedAt: '2026-07-14T00:00:00Z' }]]),
    });
    const result = scoreUnit(makeCandidate(), ctx);
    expect(result.accuracy).toBe(50);
    expect(result.reasons.some(r => r.label.includes('正答率50%（目標80%）'))).toBe(true);
  });

  it('回答数が少ない単元はデータ不足の理由を含む', () => {
    const ctx = makeContext({
      progressByUnit: new Map([['unit-1', { answeredCount: 2, correctCount: 2, lastStudiedAt: '2026-07-14T00:00:00Z' }]]),
    });
    const result = scoreUnit(makeCandidate(), ctx);
    expect(result.reasons.some(r => r.tone === 'data')).toBe(true);
  });

  it('重要度5の単元は「試験で最重要」の理由を含む', () => {
    const result = scoreUnit(makeCandidate({ importance: 5 }), makeContext());
    expect(result.reasons.some(r => r.label === '試験で最重要')).toBe(true);
  });

  it('同じ正答率でも長く放置している単元の方が優先度が高い', () => {
    const ctx = makeContext();
    const recentlyStudied = scoreUnit(
      makeCandidate({ unitId: 'a' }),
      { ...ctx, progressByUnit: new Map([['a', { answeredCount: 10, correctCount: 8, lastStudiedAt: '2026-07-14T00:00:00Z' }]]) }
    );
    const longNeglected = scoreUnit(
      makeCandidate({ unitId: 'b' }),
      { ...ctx, progressByUnit: new Map([['b', { answeredCount: 10, correctCount: 8, lastStudiedAt: '2026-06-01T00:00:00Z' }]]) }
    );
    expect(longNeglected.priority).toBeGreaterThan(recentlyStudied.priority);
  });

  it('正答率が低い単元の方が高い単元より優先度が高い（同条件下）', () => {
    const ctx = makeContext({
      progressByUnit: new Map([
        ['weak', { answeredCount: 10, correctCount: 3, lastStudiedAt: '2026-07-14T00:00:00Z' }],
        ['strong', { answeredCount: 10, correctCount: 9, lastStudiedAt: '2026-07-14T00:00:00Z' }],
      ]),
    });
    const weak = scoreUnit(makeCandidate({ unitId: 'weak' }), ctx);
    const strong = scoreUnit(makeCandidate({ unitId: 'strong' }), ctx);
    expect(weak.priority).toBeGreaterThan(strong.priority);
  });
});

describe('rankTodayUnits', () => {
  it('無視した単元は結果から除外される', () => {
    const candidates = [makeCandidate({ unitId: 'a' }), makeCandidate({ unitId: 'b' })];
    const ctx = makeContext({ dismissedUnitIds: new Set(['a']) });
    const result = rankTodayUnits(candidates, ctx);
    expect(result.map(r => r.unitId)).toEqual(['b']);
  });

  it('優先度の降順に並び、limit件数に絞られる', () => {
    const candidates = [
      makeCandidate({ unitId: 'low', importance: 1 }),
      makeCandidate({ unitId: 'high', importance: 5 }),
      makeCandidate({ unitId: 'mid', importance: 3 }),
    ];
    const result = rankTodayUnits(candidates, makeContext({ daysToExam: 5 }), 2);
    expect(result).toHaveLength(2);
    expect(result[0].unitId).toBe('high');
  });
});
