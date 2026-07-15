// 国試・CBTそれぞれの出題範囲（unit_scopes）に沿って、単元ごとに1問ずつ
// あらかじめ生成し unit_question_bank に保存しておく一回限りのメンテナンススクリプト。
// 実行後は全ユーザーがこのキャッシュを共有して使う（診断テストの初回コールドスタートを解消する）。
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
for (const line of envContent.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  const key = m[1];
  let val = m[2];
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const EXAM_LABEL = { cbt: '薬学共用試験（CBT）', kokushi: '薬剤師国家試験' };
const CONCURRENCY = 5;
const MAX_ATTEMPTS = 2;

function getSourceInstruction() {
  return `- 参照ソース：薬学教育モデル・コアカリキュラム（文部科学省）、薬剤師国家試験出題基準（厚生労働省）、日本薬局方、日本薬学会・各学会のガイドライン
- 確信が持てない情報は出題しないでください。曖昧な内容や見解が分かれる内容は避け、確立された知識のみを出題してください。
- 解説は正解を示すだけでなく、なぜその選択肢が正しいのか・なぜ他の選択肢が誤りなのかを明確に説明してください。`;
}

function getPrompt(examType, subjectName, unitName) {
  const examLabel = EXAM_LABEL[examType] ?? '薬剤師国家試験';
  return `あなたは薬学部生向けの${examLabel}対策問題を作成する専門家です。
科目「${subjectName}」の単元「${unitName}」について、実力チェック用の4択問題を1問作成してください。

IMPORTANT: Return ONLY raw JSON. No explanation, no markdown, no code blocks.
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"${subjectName}","difficulty":"medium"}]}

Rules:
- answer must be: A, B, C, or D（文字のみ）
- 問題文・選択肢・解説はすべて日本語
- 「${unitName}」の内容から外れないこと
- ${examLabel}本番に近い難易度・形式にする
- 選択肢A〜Dの文章の長さをできるだけ揃える
${getSourceInstruction()}`;
}

function extractQuestions(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed.questions)) return parsed.questions;
  } catch {
    // ignore
  }
  return [];
}

function randomizeAnswerPosition(q) {
  const letters = ['A', 'B', 'C', 'D'];
  const correctIndex = letters.indexOf((q.answer ?? '').toUpperCase());
  if (correctIndex === -1) return q;
  const options = [q.option_a, q.option_b, q.option_c, q.option_d];
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    option_a: options[order[0]],
    option_b: options[order[1]],
    option_c: options[order[2]],
    option_d: options[order[3]],
    answer: letters[order.indexOf(correctIndex)],
  };
}

async function generateOne(examType, subjectName, unitName) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: getPrompt(examType, subjectName, unitName) }],
      });
      const text = res.content[0].type === 'text' ? res.content[0].text.trim() : '';
      const [q] = extractQuestions(text);
      if (q) return randomizeAnswerPosition(q);
    } catch (e) {
      console.error(`  attempt ${attempt} failed [${examType}] ${unitName}:`, e.message);
    }
  }
  return null;
}

async function main() {
  const { data: scopes, error: scopesError } = await supabase
    .from('unit_scopes')
    .select('unit_id, exam_type, units(name, subjects(name))')
    .in('exam_type', ['cbt', 'kokushi'])
    .eq('grade', 0);
  if (scopesError) throw scopesError;

  const { data: existing, error: existingError } = await supabase
    .from('unit_question_bank')
    .select('unit_id, exam_type');
  if (existingError) throw existingError;

  const existingSet = new Set((existing ?? []).map(r => `${r.unit_id}:${r.exam_type}`));
  const targets = (scopes ?? []).filter(s => !existingSet.has(`${s.unit_id}:${s.exam_type}`));

  console.log(`対象: ${scopes?.length ?? 0}件中、未生成 ${targets.length}件を生成します`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(async t => {
      const unit = Array.isArray(t.units) ? t.units[0] : t.units;
      const subject = Array.isArray(unit.subjects) ? unit.subjects[0] : unit.subjects;
      const q = await generateOne(t.exam_type, subject?.name ?? '', unit.name);
      return { t, unitName: unit.name, q };
    }));

    for (const { t, unitName, q } of results) {
      if (!q) {
        failed++;
        console.error(`  FAILED [${t.exam_type}] ${unitName}`);
        continue;
      }
      const { error } = await supabase.from('unit_question_bank').insert({
        unit_id: t.unit_id,
        exam_type: t.exam_type,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      });
      if (error) {
        failed++;
        console.error(`  INSERT ERROR [${t.exam_type}] ${unitName}:`, error.message);
      } else {
        done++;
      }
    }
    console.log(`progress: ${done + failed}/${targets.length} (成功${done} / 失敗${failed})`);
  }

  console.log(`完了。成功${done}件、失敗${failed}件`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
