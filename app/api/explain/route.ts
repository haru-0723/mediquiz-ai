import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is not set');
}
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan !== 'standard') {
      return NextResponse.json(
        { error: 'AI解説の深掘りはスタンダードプランの機能です。', upgrade: true },
        { status: 403 },
      );
    }

    const { question, answer, explanation, subject } = await request.json();

    const prompt = `以下の医療系国家試験の問題について、医学生・看護学生・薬学生が理解しやすいよう詳しく解説してください。なぜその答えが正解なのか、他の選択肢がなぜ間違いなのか、臨床的な背景も含めて説明してください。不正確な情報は絶対に書かないで。必要であれば、論文など、学術的に信頼のある所から情報を調べるようにして。解説は簡潔にまとめて、800文字以内で完結させてください。途中で切れないように必ず最後まで書いてください。

科目：${subject ?? '不明'}
問題：${question}
正解：${answer}
既存の解説：${explanation ?? 'なし'}

詳しい解説をマークダウン形式（## 見出し、**太字**、- 箇条書き）で記述してください。`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    return NextResponse.json({ explanation: text });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '解説の生成に失敗しました' }, { status: 500 });
  }
}
