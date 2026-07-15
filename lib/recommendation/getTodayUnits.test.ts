import { describe, it, expect } from 'vitest';
import { getJSTDateStr } from './getTodayUnits';

describe('getJSTDateStr', () => {
  it('UTC日付をまたぐJST時刻でも正しいJST日付を返す', () => {
    // UTC 2026-07-14 15:30 は JSTで2026-07-15 00:30
    expect(getJSTDateStr(new Date('2026-07-14T15:30:00Z'))).toBe('2026-07-15');
  });

  it('通常の日中時刻は同じ日付を返す', () => {
    // UTC 2026-07-14 03:00 は JSTで2026-07-14 12:00
    expect(getJSTDateStr(new Date('2026-07-14T03:00:00Z'))).toBe('2026-07-14');
  });
});
