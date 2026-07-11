import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { getTodayPrompt } from '@/lib/todayPrompt';

if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEPT_TYPES = ['medical', 'pharmacy', 'nursing'] as const;

function getJSTDateStr(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jst.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const dateStr = getJSTDateStr();
  const results: Record<string, string> = {};

  for (const deptType of DEPT_TYPES) {
    try {
      const { data: existing } = await admin
        .from('today_questions')
        .select('id')
        .eq('department_type', deptType)
        .eq('date', dateStr)
        .single();

      if (existing) { results[deptType] = 'skipped (already exists)'; continue; }

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: getTodayPrompt(deptType) }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSONが見つかりません');

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.questions)) throw new Error('問題データが見つかりません');

      const questions = parsed.questions.slice(0, 5).map((q: Record<string, string>) => ({
        id: crypto.randomUUID(),
        ...q,
      }));

      await admin.from('today_questions').insert({ department_type: deptType, date: dateStr, questions });
      results[deptType] = `generated (${questions.length} questions)`;
    } catch (e) {
      results[deptType] = `error: ${e instanceof Error ? e.message : String(e)}`;
      console.error(`[cron/today] ${deptType}:`, e);
    }
  }

  return NextResponse.json({ date: dateStr, results });
}
