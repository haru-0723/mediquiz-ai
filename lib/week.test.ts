import { describe, it, expect } from 'vitest';
import { getJSTMondayStr } from './week';

describe('getJSTMondayStr', () => {
  it('月曜日はその日自身を返す', () => {
    // 2026-07-13 は月曜日（JST）
    expect(getJSTMondayStr(new Date('2026-07-13T03:00:00Z'))).toBe('2026-07-13');
  });

  it('週の途中（水曜）はその週の月曜日を返す', () => {
    // 2026-07-15 12:00 JST（水曜）
    expect(getJSTMondayStr(new Date('2026-07-15T03:00:00Z'))).toBe('2026-07-13');
  });

  it('日曜日は前週の月曜日を返す', () => {
    // 2026-07-19 は日曜日（JST）
    expect(getJSTMondayStr(new Date('2026-07-19T03:00:00Z'))).toBe('2026-07-13');
  });

  it('UTC日付をまたぐJST時刻でも正しいJST日付から算出する', () => {
    // UTC 2026-07-12 23:30 は JSTで2026-07-13 08:30（月曜）
    expect(getJSTMondayStr(new Date('2026-07-12T23:30:00Z'))).toBe('2026-07-13');
  });
});
