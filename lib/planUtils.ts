type Profile = {
  plan: string | null;
  trial_ends_at?: string | null;
  plan_expires_at?: string | null;
};

/**
 * 実効プランを返す。
 * - 買い切りプラン: plan_expires_at を過ぎていたら free に戻す。
 * - トライアル期間中: standard として扱う（既に standard 以上ならそのまま維持）。
 * 既存のplan判定を壊さないよう、必ずこのヘルパーを通してplanを取得する。
 */
export function getEffectivePlan(profile: Profile | null | undefined): string {
  if (!profile) return 'free';
  let basePlan = profile.plan ?? 'free';

  // 買い切りプランの有効期限チェック：期限切れなら free 扱い
  if (basePlan !== 'free') {
    const expiresAt = profile.plan_expires_at;
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      basePlan = 'free';
    }
  }

  const trialActive = !!profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  // トライアル中はstandardに引き上げる。ただし既にstandard以上ならそのまま維持（premiumをダウングレードしない）
  if (trialActive) {
    const rank: Record<string, number> = { free: 0, standard: 1, premium: 2 };
    return (rank[basePlan] ?? 0) >= rank.standard ? basePlan : 'standard';
  }
  return basePlan;
}

/**
 * 買い切りプランの残り有効期限（表示用）。有効な期限があればISO文字列、無ければnull。
 */
export function getPlanExpiry(profile: Profile | null | undefined): string | null {
  if (!profile?.plan_expires_at) return null;
  return new Date(profile.plan_expires_at) > new Date() ? profile.plan_expires_at : null;
}
