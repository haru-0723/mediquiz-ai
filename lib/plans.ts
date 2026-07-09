// 買い切りパックの定義（金額・期間）。checkout / webhook / 料金ページで共有する。
// 金額は税込・JPY。days はプラン有効期間（日数）。
export type PackKey = '24h' | '2w' | '1m' | '3m';

export type Pack = {
  key: PackKey;
  label: string;
  amount: number; // JPY（税込）
  days: number;   // 有効期間（日）
  plan: 'standard'; // 付与するプラン（有料1プラン=standard相当）
  perDay: string;   // 表示用の1日あたり目安
};

export const PACKS: Record<PackKey, Pack> = {
  '24h': { key: '24h', label: '24時間お試し', amount: 380, days: 1, plan: 'standard', perDay: '¥380/日' },
  '2w': { key: '2w', label: '2週間', amount: 1280, days: 14, plan: 'standard', perDay: '約¥91/日' },
  '1m': { key: '1m', label: '1ヶ月', amount: 1980, days: 30, plan: 'standard', perDay: '約¥66/日' },
  '3m': { key: '3m', label: '3ヶ月', amount: 4980, days: 90, plan: 'standard', perDay: '約¥55/日' },
};

export const PACK_ORDER: PackKey[] = ['24h', '2w', '1m', '3m'];

export function isPackKey(v: unknown): v is PackKey {
  return typeof v === 'string' && v in PACKS;
}
