const DEPT_LABELS: Record<string, string> = {
  medical:  '医学部生（医師国家試験・CBT対策）',
  pharmacy: '薬学部生（薬剤師国家試験・CBT対策）',
  nursing:  '看護学生（看護師国家試験・CBT対策）',
  other:    '医療系学生（看護・医学・薬学・福祉系）',
};

export function getTodayPrompt(deptType: string): string {
  const label = DEPT_LABELS[deptType] ?? DEPT_LABELS.other;
  return `あなたは医療系大学生の学習支援AIです。${label}向けの「今日の問題」として、異なる分野からバランスよく5問の4択問題を作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard（3種類をバランスよく使う）
- answer must be: A, B, C, or D（A〜Dが均等になるよう分散させる）
- 問題文・選択肢・解説はすべて日本語
- 国家試験・CBTレベルを意識した実践的な問題
- 5問は必ず異なる科目・分野から出題する
- 選択肢A〜Dの文章の長さ・文体を揃える（正解だけ長くしない）
- 解説は簡潔かつ正確に（なぜその答えが正しいか・他の選択肢が誤りかを説明）`;
}
