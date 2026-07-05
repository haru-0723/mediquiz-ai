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
  if (profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date()) {
    return 'standard';
  }
  return profile.plan ?? 'free';
}
