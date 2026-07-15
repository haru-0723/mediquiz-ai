// JST基準で「今週の月曜日」の日付文字列（YYYY-MM-DD）を返す。
// 週次診断テストの受験判定・週の正答率推移のキーに使う。
export function getJSTMondayStr(base: Date = new Date()): string {
  const jst = new Date(base.getTime() + 9 * 60 * 60 * 1000);
  const day = jst.getUTCDay(); // JSTの曜日（0=日）
  const diff = day === 0 ? 6 : day - 1;
  jst.setUTCDate(jst.getUTCDate() - diff);
  return jst.toISOString().slice(0, 10);
}
