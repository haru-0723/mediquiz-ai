export type RawQuestion = {
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

export function extractQuestions(text: string): RawQuestion[] {
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

// AIは単発（1問だけ）の生成依頼だと正解をAに置きがちなため、
// 生成後に選択肢の並びをプログラム側でシャッフルして正解位置を均等化する。
export function randomizeAnswerPosition<T extends RawQuestion>(q: T): T {
  const letters = ['A', 'B', 'C', 'D'];
  const correctIndex = letters.indexOf(q.answer?.toUpperCase?.() ?? '');
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

// Fisher-Yatesシャッフル。問題バンクからの抽出・出題順のランダム化など
// 複数の生成APIルートで共通して使う。
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
