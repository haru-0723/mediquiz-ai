import { describe, it, expect } from 'vitest';
import { computeTodayTarget } from './todayTarget';

describe('computeTodayTarget', () => {
  it('試験まで残り日数が少ないほど、目標は最終目標に近づく', () => {
    // CBT（想定準備期間90日）で残り15日、開始地点40%、最終目標80%
    const target = computeTodayTarget(40, 80, 15, 'cbt');
    // 90日想定のうち残り15日＝進捗率83.3%地点にいるべき
    expect(target).toBe(73);
  });

  it('残り日数が想定準備期間以上あるときは、開始地点に近い', () => {
    const target = computeTodayTarget(40, 80, 89, 'cbt');
    expect(target).toBeLessThanOrEqual(41);
  });

  it('試験当日（残り0日）は最終目標そのものになる', () => {
    const target = computeTodayTarget(40, 80, 0, 'cbt');
    expect(target).toBe(80);
  });

  it('想定準備期間を超える残り日数でも0%未満にはならない（クランプ）', () => {
    const target = computeTodayTarget(40, 80, 1000, 'cbt');
    expect(target).toBe(40);
  });

  it('試験種別ごとに想定準備期間が異なる（同じ残り日数でも準備期間が短いほど進捗率は低い）', () => {
    // 残り60日は、CBT（想定90日）だと準備期間の1/3しか消化していないが、
    // 国試（想定240日）だと3/4を消化している計算になるため、目標はより高くなる
    const cbtTarget = computeTodayTarget(40, 80, 60, 'cbt');
    const kokushiTarget = computeTodayTarget(40, 80, 60, 'kokushi');
    expect(kokushiTarget).toBeGreaterThan(cbtTarget);
  });

  it('未知の試験種別はCBT相当（90日）にフォールバックする', () => {
    const fallback = computeTodayTarget(40, 80, 15, 'regular_test_unknown');
    const cbt = computeTodayTarget(40, 80, 15, 'cbt');
    expect(fallback).toBe(cbt);
  });
});
