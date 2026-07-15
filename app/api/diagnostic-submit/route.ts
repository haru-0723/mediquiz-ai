import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureSubjectBaselines } from '@/lib/subjectBaseline';
import { getJSTDateStr } from '@/lib/recommendation/getTodayUnits';

type ResultEntry = { unitId: string; correct: number; total: number };

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { results } = await request.json();
    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
    }

    const entries = (results as ResultEntry[]).filter(
      r => r && typeof r.unitId === 'string' && typeof r.correct === 'number' && typeof r.total === 'number'
    );

    await Promise.all(entries.map(async ({ unitId, correct, total }) => {
      await supabase.from('check_results').insert({
        user_id: user.id,
        unit_id: unitId,
        questions_count: total,
        correct_count: correct,
      });

      const { data: existing } = await supabase
        .from('user_unit_progress')
        .select('answered_count, correct_count')
        .eq('user_id', user.id)
        .eq('unit_id', unitId)
        .maybeSingle();

      await supabase.from('user_unit_progress').upsert({
        user_id: user.id,
        unit_id: unitId,
        answered_count: (existing?.answered_count ?? 0) + total,
        correct_count: (existing?.correct_count ?? 0) + correct,
        last_studied_at: new Date().toISOString(),
      });
    }));

    // 試験日までの逆算目標（今日の目標正答率）の起点となる「開始地点」を、
    // まだ記録されていない科目についてのみ記録する。
    await ensureSubjectBaselines(supabase, user.id, entries.map(e => e.unitId));

    // 今日すでに取り組んだ単元は「今日やること」から外す（＝次点の優先度が繰り上がる）
    await supabase.from('today_dismissals').upsert(
      entries.map(e => ({ user_id: user.id, unit_id: e.unitId, dismissed_on: getJSTDateStr(), reason: 'completed' })),
      { onConflict: 'user_id,unit_id,dismissed_on' }
    );

    return NextResponse.json({ success: true, unitsUpdated: entries.length });
  } catch (e) {
    console.error('[diagnostic-submit]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '保存に失敗しました' }, { status: 500 });
  }
}
