import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getSubjectInstruction(department: string | null | undefined): string {
  const d = department ?? '';
  if (d.includes('看護')) {
    return `- subjectは必ず以下の看護系科目リストから最も適切なものを選んでください：
  基礎看護学、成人看護学、老年看護学、小児看護学、母性看護学、精神看護学、在宅看護学、看護の統合と実践、解剖生理学、生化学、微生物学、免疫学、栄養学`;
  }
  if (d.includes('医学') || d.includes('医師')) {
    return `- subjectは必ず以下の医学系科目リストから最も適切なものを選んでください：
  解剖学、生理学、生化学、病理学、薬理学、内科学、外科学、小児科学、産婦人科学、精神医学、公衆衛生学`;
  }
  if (d.includes('薬学')) {
    return `- subjectは必ず以下の薬学系科目リストから最も適切なものを選んでください：
  薬剤学、薬理学、薬物治療学、製剤学、薬事法規、医薬品化学、生薬学、病態生理学、臨床薬学、調剤学`;
  }
  if (d.includes('理学療法') || d.includes('作業療法') || d.includes('リハビリ')) {
    return `- subjectは必ず以下のリハビリ系科目リストから最も適切なものを選んでください：
  運動学、解剖学、神経学、整形外科学、内部障害学、日常生活活動学、理学療法評価学、作業療法学`;
  }
  return `- subjectは必ず以下のリストから最も適切なものを選んでください：
  看護系：基礎看護学、成人看護学、老年看護学、小児看護学、母性看護学、精神看護学、在宅看護学、看護の統合と実践
  医学系：解剖学、生理学、生化学、病理学、薬理学、内科学、外科学、小児科学、産婦人科学、精神医学、公衆衛生学
  薬学系：薬剤学、薬理学、薬物治療学、製剤学、薬事法規、医薬品化学、生薬学、病態生理学、臨床薬学、調剤学
  リハビリ系：運動学、解剖学、神経学、整形外科学、内部障害学、日常生活活動学、理学療法評価学、作業療法学
  基礎系：解剖生理学、生化学、微生物学、免疫学、栄養学`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('department')
      .eq('id', user.id)
      .single();

    const { subject, count } = await request.json();

    const prompt = `あなたは医療系大学生の国家試験・定期試験対策を支援するAIです。
${subject !== 'すべて' ? `「${subject}」分野の` : '医療系（看護・医学・薬学・リハビリ）の'}CBT形式の4択問題を${count}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","option_a":"選択肢1","option_b":"選択肢2","option_c":"選択肢3","option_d":"選択肢4","answer":"A","explanation":"解説文","subject":"科目名","difficulty":"medium"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 国家試験レベルを意識した問題を作成する
${getSubjectInstruction(profile?.department)}
- 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解を長く詳しく書かない
- 正解はA・B・C・Dが均等になるように分散させてください
- 選択肢A〜Dの文章の長さ・文体・詳しさを必ず揃えること。正解の選択肢だけ長くしたり、詳しく書いたりしないこと。全ての選択肢が同じくらいの文字数・同じ文体になるようにすること`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    const parsed = JSON.parse(jsonMatch[0]);

    // 生成した問題をDBに保存
    const questionsToSave = parsed.questions.map((q: Record<string, string>) => ({
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
    }));

    const { data: saved, error: saveError } = await supabase
      .from('questions')
      .insert(questionsToSave)
      .select();

    if (saveError) throw saveError;

    return NextResponse.json({ questions: saved });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
