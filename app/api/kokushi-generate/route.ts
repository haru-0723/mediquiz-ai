import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

type KokushiDept = 'pharmacy' | 'medical' | 'nursing' | 'pt' | 'ot' | 'st' | 'dental' | 'unset';

function getKokushiDept(department: string | null | undefined, targetExam?: string | null): KokushiDept {
  const valid: KokushiDept[] = ['pharmacy', 'medical', 'nursing', 'pt', 'ot', 'st', 'dental'];
  if (targetExam && valid.includes(targetExam as KokushiDept)) return targetExam as KokushiDept;
  const d = department ?? '';
  if (d.includes('薬学')) return 'pharmacy';
  if (d.includes('医学') || d.includes('医師')) return 'medical';
  if (d.includes('看護')) return 'nursing';
  if (d.includes('理学療法')) return 'pt';
  if (d.includes('作業療法')) return 'ot';
  if (d.includes('言語聴覚')) return 'st';
  if (d.includes('歯学') || d.includes('歯科')) return 'dental';
  return 'unset';
}

function getKokushiPrompt(dept: KokushiDept, subject: string, batchCount: number): string {
  const subjectLabel = subject !== 'すべて' ? `「${subject}」科目の` : '';

  const examName = {
    pharmacy: '薬剤師国家試験',
    medical: '医師国家試験',
    nursing: '看護師国家試験',
    pt: '理学療法士国家試験',
    ot: '作業療法士国家試験',
    st: '言語聴覚士国家試験',
    dental: '歯科医師国家試験',
    unset: '医療系国家試験（薬剤師・医師・看護師・PT・OT・ST）',
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

    pt: `理学療法士国家試験の出題範囲：
共通科目：解剖学・生理学・運動学・人間発達学・医学概論・病理学概論・臨床医学総論・リハビリテーション医学・臨床心理学・精神障害と臨床医学・骨関節障害・慢性疼痛・中枢神経障害・末梢神経筋障害・小児障害・内部障害・がん関連障害・老年期障害・保健医療福祉・リハビリテーション概論
専門科目：基礎理学療法学・理学療法管理学・理学療法評価学（筋力・関節可動域・歩行分析・バランス・神経評価）・理学療法治療学（運動療法・物理療法・ADL訓練・義肢装具）・地域理学療法学（在宅リハビリ・地域包括ケア・介護保険）・臨床実習
- subjectフィールドには選択した科目名をそのまま使用してください`,

    ot: `作業療法士国家試験の出題範囲：
共通科目：解剖学・生理学・運動学・人間発達学・医学概論・病理学概論・臨床医学総論・リハビリテーション医学・臨床心理学・精神障害と臨床医学・骨関節障害・慢性疼痛・中枢神経障害・末梢神経筋障害・小児障害・内部障害・がん関連障害・老年期障害・保健医療福祉・リハビリテーション概論
専門科目：基礎作業療法学・作業療法管理学・作業療法評価学（ADL評価・認知機能評価・感覚機能評価・精神機能評価）・作業療法治療学（身体障害・精神障害・発達障害・高次脳機能障害）・地域作業療法学（在宅復帰・就労支援・地域包括ケア）・臨床実習
- subjectフィールドには選択した科目名をそのまま使用してください`,

    st: `言語聴覚士国家試験の出題範囲：
基礎医学（解剖学・生理学・神経科学）・臨床医学（内科学・神経内科学・精神医学・小児科学・耳鼻咽喉科学）・臨床歯科医学（口腔解剖・嚥下関連）・音声言語聴覚医学（音声障害・構音障害・吃音・嚥下障害）・心理学（発達心理学・認知心理学・臨床心理学）・音声言語学（音韻論・形態論・統語論）・社会福祉教育・言語聴覚障害学総論・失語高次脳機能障害学・言語発達障害学・発声発語嚥下障害学・聴覚障害学
- subjectフィールドには選択した科目名をそのまま使用してください`,

    dental: `歯科医師国家試験の出題範囲：
必修問題：医療倫理・患者安全・感染予防・救急処置・社会保障・歯科医師法
口腔解剖学：歯の形態・歯列・顎骨・顎関節・口腔軟組織の解剖・神経・血管分布
生理学・口腔生理学：咀嚼・嚥下・発音・唾液分泌・歯髄の生理・顎運動
口腔生化学：エナメル質・象牙質・セメント質の成分・石灰化・フッ化物の作用
病理学・口腔病理学：炎症・腫瘍・う蝕・歯周炎の病理組織像・顎骨病変
免疫・細菌・微生物学：口腔細菌・歯周病原菌・う蝕関連菌・感染症・消毒滅菌
薬理学・口腔薬理学：局所麻酔薬・鎮痛薬・抗菌薬・血管収縮薬・歯科用薬剤
歯科理工学：歯科材料（印象材・セメント・コンポジットレジン・合金・セラミックス）の性質と操作
法医学・歯科法医学：個人識別・歯科鑑定・医事法規
保存修復学：う蝕治療・コンポジットレジン修復・インレー・コンポマー・接着技法
歯内治療学：根管治療・抜髄・感染根管処置・根尖病変・根管充填材
歯周治療学：歯周病の分類・スケーリング・ルートプレーニング・歯周外科・メインテナンス
全部床義歯学・部分床義歯学：印象・咬合採得・人工歯排列・義歯設計・クラスプ設計
冠橋義歯学・インプラント学：クラウン・ブリッジの適応と設計・インプラント外科・補綴
口腔外科学：抜歯・嚢胞・腫瘍・顎骨骨折・顎関節症・口腔癌・唾液腺疾患
矯正歯科学：不正咬合の分類・矯正力・固定式・可撤式装置・保定・成長期矯正
小児歯科学：乳歯の特徴・混合歯列期・小児のう蝕・外傷・行動管理
全身麻酔・歯科麻酔学：局所麻酔法・全身麻酔・鎮静法・術前術後管理
歯科放射線学・臨床診断：デンタルX線・パノラマ・CBCT・口腔癌の画像診断・読影
摂食嚥下・高齢者歯科：嚥下機能評価・義歯管理・口腔機能低下症・訪問歯科
予防・口腔衛生学：う蝕予防・歯周病予防・フッ化物・シーラント・口腔保健指導
社会歯科学：医療保険制度・地域歯科保健・疫学・統計・歯科医療管理
内科学・全身疾患：高血圧・糖尿病・心疾患・血液疾患・免疫疾患の歯科との関連・全身管理
- subjectフィールドには選択した科目名（例：保存修復学）をそのまま使用してください`,

    unset: `薬剤師・医師・看護師・理学療法士・作業療法士・言語聴覚士国家試験の出題範囲から選択された科目の問題を作成してください。
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
      .select('plan, department, target_exam')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'standard') {
      return NextResponse.json({
        error: '国試モードはスタンダードプランの機能です。',
        upgrade: true,
      }, { status: 403 });
    }

    const { subject, count } = await request.json();
    const dept = getKokushiDept(profile?.department, profile?.target_exam);
    const kokushiType = dept === 'unset' ? 'other' : dept;
    const isKokushi = dept !== 'unset';

    const BATCH_SIZE = 10;
    const allRawQuestions: RawQuestion[] = [];
    let remaining = count;

    while (remaining > 0) {
      const batchCount = Math.min(remaining, BATCH_SIZE);
      const batch = await generateBatch(dept, subject, batchCount);
      allRawQuestions.push(...batch);
      remaining -= batchCount;
    }

    if (allRawQuestions.length === 0) {
      throw new Error('問題を生成できませんでした');
    }

    const questionsToSave = allRawQuestions.map((q: RawQuestion) => ({
      user_id: user.id,
      subject: q.subject,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      is_kokushi: isKokushi,
      kokushi_type: kokushiType,
    }));

    const { data: saved, error: saveError } = await supabase
      .from('questions')
      .insert(questionsToSave)
      .select();

    if (saveError) throw saveError;

    // ログを記録（adminクライアントでRLSをバイパス）
    const admin = createAdminClient();
    const { error: logError } = await admin.from('kokushi_logs').insert({ user_id: user.id });
    if (logError) console.error('[kokushi-generate] log insert error:', logError);

    return NextResponse.json({ questions: saved });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
