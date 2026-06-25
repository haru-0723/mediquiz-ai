import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSubjectInstruction, getDepartmentType, getSourceInstruction } from '@/lib/departmentUtils';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });


export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    // プランを確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, department, target_exam')
      .eq('id', user.id)
      .single();

    // プラン別制限チェック
    if (!profile || profile.plan === 'free' || profile.plan === 'standard') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count: generateCount } = await supabase
        .from('generate_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString());

      const isFree = !profile || profile.plan === 'free';
      const limit = isFree ? 2 : 10;
      if ((generateCount ?? 0) >= limit) {
        return NextResponse.json({
          error: isFree
            ? '無料プランのAI問題生成は1日2回までです。スタンダードプランにアップグレードしてください。'
            : 'スタンダードプランのAI問題生成は1日10回までです。プレミアムプランにアップグレードしてください。',
          upgrade: true
        }, { status: 403 });
      }

      if (isFree) {
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
    }

    const { materialId, count = 5, supplementText: rawSupplementText = '', format = '4択' } = await request.json();
    const supplementText = String(rawSupplementText).slice(0, 200).replace(/[`${}\\]/g, '');

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

    const examType = getDepartmentType(profile?.department, profile?.target_exam);
    const sourceInstruction = getSourceInstruction(examType === 'other' ? null : examType);

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
            text: format === '穴埋め'
              ? `この画像は医療系大学生の教材です。画像の内容をもとに穴埋め選択問題を${count}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"〜は【　　】である。","options":["A. 選択肢1","B. 選択肢2","C. 選択肢3","D. 選択肢4"],"answer":"A","explanation":"解説文","difficulty":"easy"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- 問題文・選択肢・解説はすべて日本語で書く
- 問題文には必ず【　　】を1箇所入れて穴埋め形式にする
- 選択肢は【　　】に入る語句のみを書く（短く簡潔に）
- 国家試験レベルを意識した問題を作成する
- 画像に写っている内容から問題を作成する
- 正解はA・B・C・Dが均等になるように分散させてください
- 画像に手書き文字やメモ書きが含まれている場合、周囲の文脈から補完してください
${sourceInstruction}
${supplementText ? `- 【出題の指示】以下の指示を最優先で守って問題を作成してください：${supplementText}` : ''}
${getSubjectInstruction(profile?.department)}`
              : format === '○×'
              ? `この画像は医療系大学生の教材です。画像の内容をもとに○×問題を${count}問作成してください。

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"〜である。","options":["○. 正しい","×. 誤り"],"answer":"○","explanation":"解説文","difficulty":"easy"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: ○ or × (symbol only)
- options must always be exactly ["○. 正しい", "×. 誤り"]
- 問題文・解説はすべて日本語で書く
- 問題文は「〜である。」「〜はどれか。」などの断定文または疑問文にする
- 国家試験レベルを意識した問題を作成する
- 画像に写っている内容から問題を作成する
- ○と×が均等になるように分散させてください
- 画像に手書き文字やメモ書きが含まれている場合、周囲の文脈から補完してください
${sourceInstruction}
${supplementText ? `- 【出題の指示】以下の指示を最優先で守って問題を作成してください：${supplementText}` : ''}
${getSubjectInstruction(profile?.department)}`
              : `この画像は医療系大学生の教材です。画像の内容をもとに4択問題を${count}問作成してください。

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
${sourceInstruction}
${supplementText ? `- 【出題の指示】以下の指示を最優先で守って問題を作成してください：${supplementText}` : ''}
${getSubjectInstruction(profile?.department)}`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    let parsed: { questions?: unknown[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      throw new Error('JSONのパースに失敗しました');
    }
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('問題データが見つかりません');
    }

    // 生成ログを記録（adminクライアントでRLSをバイパス）
    const admin = createAdminClient();
    const { error: logError } = await admin.from('generate_logs').insert({ user_id: user.id });
    if (logError) console.error('[generate] log insert error:', logError);

    return NextResponse.json({ questions: parsed.questions });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '問題生成に失敗しました' }, { status: 500 });
  }
}
