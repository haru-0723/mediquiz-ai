import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { materialId } = await request.json();

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
      return NextResponse.json({ hasIssues: false, issues: '' });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mediaType = (material.file_type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 512,
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
            text: 'この画像を読み取ってください。手書き文字、ぼやけ、読み取りにくい部分がある場合はhasIssues: trueと読み取れなかった部分の説明をissuesに返してください。問題なければhasIssues: falseを返してください。JSON形式のみで返答してください。',
          },
        ],
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ hasIssues: false, issues: '' });

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({
      hasIssues: Boolean(parsed.hasIssues),
      issues: typeof parsed.issues === 'string' ? parsed.issues : '',
    });

  } catch (e) {
    console.error(e);
    // エラー時はブロックしない
    return NextResponse.json({ hasIssues: false, issues: '' });
  }
}
