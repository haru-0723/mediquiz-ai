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

    const prompt = `あなたは医療系大学生の国家試験・定期試験対策を支援するAIです。
「${material.title}」（科目：${material.subject ?? '医療系'}）に関する4択問題を${count}問作成してください。

以下のJSON形式で返してください（コードブロックなし、JSONのみ）：
{
  "questions": [
    {
      "question": "問題文",
      "options": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],
      "answer": "A",
      "explanation": "解説文",
      "difficulty": "easy"
    }
  ]
}

注意：
- 医療・看護・薬学・リハビリ分野の専門的な問題を作成
- 国家試験レベルを意識した問題
- 解説は理解が深まるよう丁寧に
- difficulty は easy/medium/hard のいずれか`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text.trim());

    return NextResponse.json({ questions: parsed.questions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '問題生成に失敗しました' }, { status: 500 });
  }
}
