// クライアント・サーバー両方から安全に参照できるよう、getTodayUnits.ts
// （next/headersに依存するサーバー専用モジュール）とは分離している。
export const SKIP_REASONS = [
  { value: 'confident', label: 'もう理解している' },
  { value: 'no_time', label: '今日は時間がない' },
  { value: 'studied_elsewhere', label: '他の方法で勉強済み' },
  { value: 'not_now', label: '今はやりたくない' },
  { value: 'other', label: 'その他' },
] as const;
