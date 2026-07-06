type Profile = {
  plan: string | null;
  trial_ends_at?: string | null;
};

/**
 * トライアル期間中はstandardとして扱う。
 * 既存のplan判定を壊さないよう、このヘルパーを通してplanを取得する。
 */
export function getEffectivePlan(profile: Profile | null | undefined): string {
  if (!profile) return 'free';
  const basePlan = profile.plan ?? 'free';
  const trialActive = !!profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  // トライアル中はstandardに引き上げる。ただし既にstandard以上ならそのまま維持（premiumをダウングレードしない）
  if (trialActive) {
    const rank: Record<string, number> = { free: 0, standard: 1, premium: 2 };
    return (rank[basePlan] ?? 0) >= rank.standard ? basePlan : 'standard';
  }
  return basePlan;
}
