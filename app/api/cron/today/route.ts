import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPushNotification, type PushSubscription } from '@/lib/webpush';
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
        model: 'claude-sonnet-4-5',
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

  // Web Pushで通知送信
  let notificationResult = 'skipped';
  try {
    const { data: rows } = await admin
      .from('profiles')
      .select('id, push_subscription')
      .not('push_subscription', 'is', null);

    const subscribers = (rows ?? []).filter(r => r.push_subscription);
    if (subscribers.length === 0) { notificationResult = 'no subscribers'; }
    else {
      let successCount = 0;
      const invalidIds: string[] = [];

      await Promise.all(subscribers.map(async (row) => {
        const result = await sendPushNotification(
          row.push_subscription as PushSubscription,
          { title: '📅 今日の問題が届きました！', body: 'MediQuiz AIで今日の5問に挑戦しよう！', url: '/today' },
        ).catch(() => 'invalid' as const);

        if (result === 'ok') successCount++;
        else invalidIds.push(row.id);
      }));

      if (invalidIds.length > 0) {
        await admin.from('profiles').update({ push_subscription: null }).in('id', invalidIds);
      }

      notificationResult = `sent to ${successCount}/${subscribers.length} users`;
    }
  } catch (e) {
    console.error('[cron/today] 通知送信エラー:', e);
    notificationResult = `error: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json({ date: dateStr, results, notification: notificationResult });
}
