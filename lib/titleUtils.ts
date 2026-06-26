type TitleInfo = {
  name: string;
  level: number;
  nextLevelAt: number;
  progress: number;
};

const TITLES = [
  { name: '見習い',   minQ: 0,    maxQ: 49,   minLv: 1,  step: 10 },
  { name: '修行中',   minQ: 50,   maxQ: 199,  minLv: 6,  step: 30 },
  { name: '熟練者',   minQ: 200,  maxQ: 499,  minLv: 11, step: 60 },
  { name: '達人',     minQ: 500,  maxQ: 999,  minLv: 16, step: 100 },
  { name: 'レジェンド', minQ: 1000, maxQ: Infinity, minLv: 21, step: 200 },
];

export function getTitleInfo(totalQuestions: number): TitleInfo {
  const tier = TITLES.findIndex((t, i) => {
    const next = TITLES[i + 1];
    return totalQuestions >= t.minQ && (!next || totalQuestions < next.minQ);
  });
  const t = TITLES[Math.max(tier, 0)];
  const stepsInTier = Math.floor((totalQuestions - t.minQ) / t.step);
  const level = t.minLv + stepsInTier;
  const currentStepStart = t.minQ + stepsInTier * t.step;
  const isMaxTier = tier === TITLES.length - 1;
  const nextLevelAt = isMaxTier ? currentStepStart + t.step : currentStepStart + t.step;
  const progress = isMaxTier && level >= 25
    ? 100
    : Math.round(((totalQuestions - currentStepStart) / t.step) * 100);

  return {
    name: t.name,
    level: Math.min(level, 25),
    nextLevelAt,
    progress: Math.min(progress, 99),
  };
}
