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

    // プランを確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, department')
      .eq('id', user.id)
      .single();

    // 無料プランの場合、制限チェック
    if (!profile || profile.plan === 'free') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: generateCount } = await supabase
        .from('generate_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());

      if ((generateCount ?? 0) >= 3) {
        return NextResponse.json({
          error: '無料プランのAI問題生成は1日3回までです。スタンダードプランにアップグレードしてください。',
          upgrade: true
        }, { status: 403 });
      }

      const { count: questionCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if ((questionCount ?? 0) >= 30) {
        return NextResponse.json({
          error: '無料プランの保存上限（30問）に達しました。スタンダードプランにアップグレードしてください。',
          upgrade: true
        }, { status: 403 });
      }
    }

    const { materialId, count = 5 } = await request.json();

    const { data: material } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (!material) return NextResponse.json({ error: '教材が見つかりません' }, { status: 404 });

    const urlParts = material.file_url.split('/storage/v1/object/public/materials/');
    const filePath = urlParts[1];

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('materials')
      .download(filePath);

    if (downloadError || !fileData) {
      throw new Error('画像の取得に失敗しました');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = (material.file_type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `この画像は医療系大学生の教材です。画像の内容をもとに4択問題を${count}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"問題文","options":["A. 選択肢1","B. 選択肢2","C. 選択肢3","D. 選択肢4"],"answer":"A","explanation":"解説文","difficulty":"easy"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 国家試験レベルを意識した問題を作成する
- 画像に写っている内容から問題を作成する
- 選択肢A〜Dの文章の長さをできるだけ揃える（正解だけ長くならないように）
- 選択肢は全て同じくらいの文字数・文体にする
- 正解を長く詳しく書かない
- 正解はA・B・C・Dが均等になるように分散させてください
- 選択肢A〜Dの文章の長さ・文体・詳しさを必ず揃えること。正解の選択肢だけ長くしたり、詳しく書いたりしないこと。全ての選択肢が同じくらいの文字数・同じ文体になるようにすること
- 画像に手書き文字やメモ書きが含まれている場合、周囲の文脈・文章・図表から内容を推測して補完してください。完全に読み取れない部分があっても、前後の文脈から意味を推測して問題作成に活用してください。また、画像の認識が難しかった部分については解説文に反映させてください。
${getSubjectInstruction(profile?.department)}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    const parsed = JSON.parse(jsonMatch[0]);

    // 生成ログを記録
    await supabase.from('generate_logs').insert({ user_id: user.id });

    return NextResponse.json({ questions: parsed.questions });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
