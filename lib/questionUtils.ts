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
