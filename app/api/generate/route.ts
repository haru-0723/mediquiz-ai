import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { materialId, count = 5 } = await request.json();

    const { data: material } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (!material) return NextResponse.json({ error: '教材が見つかりません' }, { status: 404 });

    // 画像をfetchしてbase64に変換
    const imageResponse = await fetch(material.file_url);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
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
- 画像に写っている内容から問題を作成する`
          }
        ]
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ questions: parsed.questions });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '問題生成に失敗しました' }, { status: 500 });
  }
}
