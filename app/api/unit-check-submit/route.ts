import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureSubjectBaselines } from '@/lib/subjectBaseline';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const { unitId, correctCount, questionsCount } = await request.json();
    if (!unitId || typeof unitId !== 'string' || typeof correctCount !== 'number' || typeof questionsCount !== 'number') {
      return NextResponse.json({ error: '不正なリクエストです' }, { status: 400 });
    }

    const { error: insertError } = await supabase.from('check_results').insert({
      user_id: user.id,
      unit_id: unitId,
      questions_count: questionsCount,
      correct_count: correctCount,
    });
    if (insertError) throw insertError;

    const { data: existing } = await supabase
      .from('user_unit_progress')
      .select('answered_count, correct_count')
      .eq('user_id', user.id)
      .eq('unit_id', unitId)
      .maybeSingle();

    const beforeAccuracy = existing && existing.answered_count > 0
      ? Math.round((existing.correct_count / existing.answered_count) * 100)
      : null;

    const newAnswered = (existing?.answered_count ?? 0) + questionsCount;
    const newCorrect = (existing?.correct_count ?? 0) + correctCount;

    const { error: upsertError } = await supabase.from('user_unit_progress').upsert({
      user_id: user.id,
      unit_id: unitId,
      answered_count: newAnswered,
      correct_count: newCorrect,
      last_studied_at: new Date().toISOString(),
    });
    if (upsertError) throw upsertError;

    await ensureSubjectBaselines(supabase, user.id, [unitId]);

    const afterAccuracy = Math.round((newCorrect / newAnswered) * 100);

    return NextResponse.json({ beforeAccuracy, afterAccuracy });
  } catch (e) {
    console.error('[unit-check-submit]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : '保存に失敗しました' }, { status: 500 });
  }
}
