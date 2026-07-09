// 買い切りパック（基本パック）と、追加教材クレジットの定義。
// checkout / webhook / 料金ページで共有する。金額は税込・JPY。
// credits = そのパックで付与される「教材生成クレジット」（1教材=1クレジット）。
export type PackKey = '24h' | '2w' | '1m' | '3m';

export type Pack = {
  key: PackKey;
  label: string;
  amount: number; // JPY（税込）
  days: number;   // プラン有効期間（日）
  credits: number; // 付与する教材生成クレジット
  plan: 'standard';
  perDay: string;  // 表示用の1日あたり目安
};

export const PACKS: Record<PackKey, Pack> = {
  '24h': { key: '24h', label: '24時間お試し', amount: 380, days: 1, credits: 15, plan: 'standard', perDay: '¥380/日' },
  '2w': { key: '2w', label: '2週間', amount: 1280, days: 14, credits: 40, plan: 'standard', perDay: '約¥91/日' },
  '1m': { key: '1m', label: '1ヶ月', amount: 1980, days: 30, credits: 70, plan: 'standard', perDay: '約¥66/日' },
  '3m': { key: '3m', label: '3ヶ月', amount: 4980, days: 90, credits: 160, plan: 'standard', perDay: '約¥55/日' },
};

export const PACK_ORDER: PackKey[] = ['24h', '2w', '1m', '3m'];

// 追加教材クレジット（有料プラン利用中に買い足せる。期間は延びず、クレジットだけ増える）
export type AddonKey = 'add10' | 'add20' | 'add50';

export type Addon = {
  key: AddonKey;
  label: string;
  amount: number;  // JPY（税込）
  credits: number; // 追加される教材生成クレジット
};

export const ADDONS: Record<AddonKey, Addon> = {
  'add10': { key: 'add10', label: '教材10件ぶん追加', amount: 250, credits: 10 },
  'add20': { key: 'add20', label: '教材20件ぶん追加', amount: 500, credits: 20 },
  'add50': { key: 'add50', label: '教材50件ぶん追加', amount: 1250, credits: 50 },
};

export const ADDON_ORDER: AddonKey[] = ['add10', 'add20', 'add50'];

export function isPackKey(v: unknown): v is PackKey {
  return typeof v === 'string' && v in PACKS;
}

export function isAddonKey(v: unknown): v is AddonKey {
  return typeof v === 'string' && v in ADDONS;
}
