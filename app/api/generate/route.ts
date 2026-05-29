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

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Create ${count} multiple choice questions for medical students about "${material.title}" (subject: ${material.subject ?? 'medical'}).

IMPORTANT: Return ONLY a JSON object. No explanation, no markdown, no code blocks. Just raw JSON.

Required format:
{"questions":[{"question":"Question text here","options":["A. option1","B. option2","C. option3","D. option4"],"answer":"A","explanation":"Explanation in Japanese","difficulty":"easy"}]}

Rules:
- difficulty must be: easy, medium, or hard
- answer must be: A, B, C, or D (letter only)
- Write questions and explanations in Japanese
- Questions should be at medical/nursing national exam level`
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    
    // JSONのみ抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSONが見つかりません');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ questions: parsed.questions });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '問題生成に失敗しました' }, { status: 500 });
  }
}
