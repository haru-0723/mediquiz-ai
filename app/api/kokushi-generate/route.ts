import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSourceInstruction } from '@/lib/departmentUtils';

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

  const allSubjectsInstruction: Record<KokushiDept, string> = {
    pharmacy: `出題科目：物理・化学・生物／衛生／薬理／薬剤／病態・薬物治療／法規・制度・倫理／実務`,
    medical: `出題科目：必修問題／医学総論／循環器／呼吸器／消化器／腎臓／内分泌代謝／血液／神経／感染症／外科系／小児科／産婦人科／精神科／臨床実地`,
    nursing: `出題科目：必修問題／基礎看護学／人体の構造と機能／疾病の成り立ち／成人看護学／老年看護学／小児看護学／母性看護学／精神看護学／地域在宅看護論／看護の統合と実践`,
    pt: `出題科目：解剖学／生理学／運動学／リハビリテーション医学／理学療法評価学／理学療法治療学／地域理学療法学`,
    ot: `出題科目：解剖学／生理学／運動学／リハビリテーション医学／作業療法評価学／作業療法治療学／地域作業療法学`,
    st: `出題科目：基礎医学／臨床医学／音声言語聴覚医学／心理学／言語聴覚障害学／失語高次脳機能障害学／聴覚障害学`,
    dental: `出題科目：口腔解剖学／口腔生理学／口腔生化学／口腔病理学／微生物学／薬理学／歯科理工学／保存修復学／歯内治療学／歯周治療学／補綴学／口腔外科学／矯正歯科学／小児歯科学／歯科放射線学／予防歯科学`,
    unset: `出題科目：薬剤師・医師・看護師・PT・OT・ST国家試験の範囲から出題してください`,
  };

  const subjectInstruction = subject !== 'すべて'
    ? `- subjectフィールドには「${subject}」をそのまま使用してください`
    : `${allSubjectsInstruction[dept]}\n- subjectフィールドには該当科目名をそのまま使用してください`;

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
${getSourceInstruction(dept === 'unset' ? null : dept)}
- 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解はA・B・C・Dが均等になるように分散させてください
${subjectInstruction}`;
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

    if (profile?.plan !== 'standard' && profile?.plan !== 'premium') {
      return NextResponse.json({
        error: '国試モードはスタンダードプラン以上の機能です。',
        upgrade: true,
      }, { status: 403 });
    }

    if (profile?.plan === 'standard') {
      const admin = createAdminClient();
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: kokushiCount } = await admin
        .from('kokushi_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if ((kokushiCount ?? 0) >= 15) {
        return NextResponse.json({
          error: 'スタンダードプランの国試モードは月15回までです。プレミアムプランにアップグレードしてください。',
          upgrade: true,
        }, { status: 403 });
      }
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
