import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type RawQuestion = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string;
  subject: string;
  difficulty: string;
};

function extractQuestions(text: string): RawQuestion[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // fall through to partial extraction
  }

  const arrayStart = jsonMatch[0].search(/"questions"\s*:\s*\[/);
  if (arrayStart === -1) return [];
  const bracketPos = jsonMatch[0].indexOf('[', arrayStart) + 1;
  const content = jsonMatch[0].slice(bracketPos);

  const questions: RawQuestion[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\' && inString) { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const obj = JSON.parse(content.slice(start, i + 1));
          if (obj.question && obj.answer) questions.push(obj);
        } catch { /* skip incomplete */ }
        start = -1;
      }
    }
  }

  return questions;
}

type KokushiDept = 'pharmacy' | 'medical' | 'nursing' | 'unset';

function getKokushiDept(department: string | null | undefined): KokushiDept {
  const d = department ?? '';
  if (d.includes('薬学')) return 'pharmacy';
  if (d.includes('医学') || d.includes('医師')) return 'medical';
  if (d.includes('看護')) return 'nursing';
  return 'unset';
}

function getKokushiPrompt(dept: KokushiDept, subject: string, batchCount: number): string {
  const subjectLabel = subject !== 'すべて' ? `「${subject}」科目の` : '';

  const examName = {
    pharmacy: '薬剤師国家試験',
    medical: '医師国家試験',
    nursing: '看護師国家試験',
    unset: '医療系国家試験（薬剤師・医師・看護師）',
  }[dept];

  const subjectInstruction: Record<KokushiDept, string> = {
    pharmacy: `薬剤師国家試験の出題範囲：
物理・化学・生物：熱力学・反応速度論・電気化学・放射化学・分析化学・機器分析・有機化学・医薬品化学・構造決定・反応機構・天然物化学・生化学・分子生物学・遺伝学・免疫学・微生物学
衛生：公衆衛生・疫学・統計学・食品衛生・環境衛生・毒性学・栄養学・化学物質の安全性
薬理：自律神経系薬・循環器薬・中枢神経系薬・抗菌薬・抗がん薬・ホルモン薬・副作用・相互作用
薬剤：ADME・薬物動態学・製剤学・DDS・TDM・バイオアベイラビリティ・徐放製剤
病態・薬物治療：高血圧・糖尿病・脂質異常症・心不全・喘息・COPD・消化性潰瘍・感染症・がん・腎疾患・神経疾患の病態生理・診断・治療薬選択・ガイドライン・副作用管理
法規・制度・倫理：薬機法・薬剤師法・麻薬及び向精神薬取締法・健康保険法・医療法・地域医療・医療保険制度・医療倫理
実務：処方箋監査・調剤・疑義照会・服薬指導・注射剤調製・がん化学療法・TDM・在宅医療・チーム医療・医療安全
- subjectフィールドには選択した科目名（例：薬理）をそのまま使用してください`,

    medical: `医師国家試験の出題範囲：
必修問題：医療倫理・患者対応・医療安全・救急蘇生・社会医学
医学総論：診察・検査・病態生理・薬理・公衆衛生
循環器：虚血性心疾患・心不全・不整脈・高血圧
呼吸器：肺炎・COPD・喘息・肺癌
消化器：胃腸疾患・肝胆膵疾患・消化管出血
腎臓：急性慢性腎不全・ネフローゼ・電解質異常
内分泌代謝：糖尿病・甲状腺疾患・副腎疾患
血液：貧血・白血病・リンパ腫・凝固異常
神経：脳卒中・てんかん・認知症・神経変性疾患
感染症：敗血症・結核・HIV・抗菌薬選択
外科系：急性腹症・消化器癌・大動脈疾患・肺癌・頭部外傷・骨折
小児科：小児感染症・先天異常・成長発達
産婦人科：妊娠分娩・婦人科腫瘍・周産期医療
精神科：うつ病・統合失調症・認知症・依存症
臨床実地：胸痛・呼吸困難・発熱・腹痛・頭痛・意識障害・ショック・心電図読影・画像診断
- subjectフィールドには選択した科目名（例：循環器）をそのまま使用してください`,

    nursing: `看護師国家試験の出題範囲：
必修問題：健康の概念・人体の構造と機能・疾病の成り立ち・医療安全・感染予防・看護倫理・社会保障制度・看護技術の基本
基礎看護学：看護過程・看護理論・看護技術・バイタルサイン・清潔援助・移動援助
人体の構造と機能：解剖学・生理学・血液・神経・循環器・呼吸器・消化器・腎臓
疾病の成り立ちと回復の促進：病理学・薬理学・微生物学・免疫学・臨床検査・治療学
成人看護学：がん看護・周術期看護・慢性疾患看護・急性期看護・終末期看護・糖尿病・高血圧・心不全・COPD・脳梗塞
老年看護学：フレイル・認知症・転倒予防・高齢者薬物療法・介護保険制度
小児看護学：成長発達・予防接種・小児感染症・先天性疾患
母性看護学：妊娠・分娩・産褥期・新生児管理・母子保健
精神看護学：統合失調症・うつ病・双極症・不安障害・精神保健福祉法
地域在宅看護論：訪問看護・地域包括ケア・在宅療養支援・保健活動
看護の統合と実践：チーム医療・医療安全・災害看護・国際看護・マネジメント
状況設定問題：糖尿病患者・脳梗塞患者・心不全患者・COPD患者・認知症高齢者・妊婦・小児感染症・精神疾患患者の事例
- subjectフィールドには選択した科目名（例：成人看護学）をそのまま使用してください`,

    unset: `薬剤師・医師・看護師国家試験の出題範囲から選択された科目の問題を作成してください。
- subjectフィールドには選択した科目名をそのまま使用してください`,
  };

  return `あなたは医療系大学生の国家試験対策を支援するAIです。
${subjectLabel}${examName}レベルの4択問題を${batchCount}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.
必ず有効なJSON形式で返してください。JSONが長くなる場合も途中で切らないでください。全${batchCount}問を必ず完全に出力してください。

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 本番の国家試験に近い難易度・形式で問題を作成する
- 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解はA・B・C・Dが均等になるように分散させてください
${subjectInstruction[dept]}`;
}

async function generateBatch(dept: KokushiDept, subject: string, batchCount: number): Promise<RawQuestion[]> {
  const prompt = getKokushiPrompt(dept, subject, batchCount);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return extractQuestions(text);
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, department')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'standard') {
      return NextResponse.json({
        error: '国試モードはスタンダードプランの機能です。',
        upgrade: true,
      }, { status: 403 });
    }

    const { subject, count } = await request.json();
    const dept = getKokushiDept(profile?.department);

    const BATCH_SIZE = 10;
    const allQuestions: RawQuestion[] = [];
    let remaining = count;

    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      const batch = await generateBatch(dept, subject, batchCount);
      allQuestions.push(...batch);
      remaining -= batchCount;
    }

    if (allQuestions.length === 0) {
      throw new Error('問題を生成できませんでした');
    }

    return NextResponse.json({ questions: allQuestions });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
