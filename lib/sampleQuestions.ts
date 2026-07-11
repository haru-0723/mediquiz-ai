// 登録直後、教材アップロードなしで体験できる「お試し問題」セット。
// 医療系学生の頻出科目から幅広く出題し、専攻を問わず解ける内容にする。
export type SampleQuestion = {
  id: string;
  subject: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    id: 'sample-1',
    subject: '解剖生理学',
    question: '心臓の4つの部屋のうち、全身から戻ってきた静脈血が最初に入るのはどこか。',
    option_a: '右心房',
    option_b: '右心室',
    option_c: '左心房',
    option_d: '左心室',
    answer: 'A',
    explanation: '全身を巡った静脈血は上大静脈・下大静脈を通って右心房に流入し、右心室→肺動脈→肺へと送られます。',
    difficulty: 'easy',
  },
  {
    id: 'sample-2',
    subject: '薬理学',
    question: 'アナフィラキシーショックの第一選択薬はどれか。',
    option_a: 'アセトアミノフェン',
    option_b: 'アドレナリン',
    option_c: 'インスリン',
    option_d: 'ワルファリン',
    answer: 'B',
    explanation: 'アドレナリンはα・β受容体を刺激し、血管収縮・気管支拡張・心収縮力増強により、アナフィラキシーショックに対して最も早く効果を発揮します。',
    difficulty: 'medium',
  },
  {
    id: 'sample-3',
    subject: '基礎医学',
    question: '血液のpHの基準値として正しいものはどれか。',
    option_a: '6.8〜7.0',
    option_b: '7.05〜7.15',
    option_c: '7.35〜7.45',
    option_d: '7.6〜7.8',
    answer: 'C',
    explanation: '動脈血のpHは7.35〜7.45の狭い範囲に保たれており、これより低いとアシドーシス、高いとアルカローシスと呼ばれます。',
    difficulty: 'easy',
  },
  {
    id: 'sample-4',
    subject: '看護学',
    question: '成人の標準的な1回換気量（安静時）に最も近い値はどれか。',
    option_a: '約50mL',
    option_b: '約500mL',
    option_c: '約1500mL',
    option_d: '約3000mL',
    answer: 'B',
    explanation: '成人の安静時1回換気量は約500mLとされ、これに呼吸数（約12〜18回/分）を掛けたものが分時換気量になります。',
    difficulty: 'medium',
  },
  {
    id: 'sample-5',
    subject: '公衆衛生学',
    question: 'ある集団において、特定の期間内に新たに発生した疾病の割合を表す指標はどれか。',
    option_a: '有病率',
    option_b: '罹患率',
    option_c: '致命率',
    option_d: '死亡率',
    answer: 'B',
    explanation: '罹患率（incidence rate）は一定期間内に新たに発生した患者の割合を示し、既存の患者も含む有病率（prevalence）とは区別されます。',
    difficulty: 'hard',
  },
];
