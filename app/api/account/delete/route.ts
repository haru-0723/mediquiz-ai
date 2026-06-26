import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ストレージのファイルを先に削除
    const { data: materialFiles } = await supabase
      .from('materials')
      .select('file_url')
      .eq('user_id', user.id);

    if (materialFiles && materialFiles.length > 0) {
      const paths = materialFiles
        .map(m => {
          const parts = m.file_url?.split('/storage/v1/object/public/materials/');
          return parts?.[1] ?? null;
        })
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        await supabase.storage.from('materials').remove(paths);
      }
    }

    // 関連データをFK順に削除（子→親の順）
    await adminSupabase.from('quiz_sessions').delete().eq('user_id', user.id);
    await adminSupabase.from('generate_logs').delete().eq('user_id', user.id);
    await adminSupabase.from('cbt_logs').delete().eq('user_id', user.id);
    await adminSupabase.from('kokushi_logs').delete().eq('user_id', user.id);
    await adminSupabase.from('questions').delete().eq('user_id', user.id);
    await adminSupabase.from('folders').delete().eq('user_id', user.id);
    await adminSupabase.from('exams').delete().eq('user_id', user.id);
    await adminSupabase.from('materials').delete().eq('user_id', user.id);
    await adminSupabase.from('profiles').delete().eq('id', user.id);

    const { error } = await adminSupabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'アカウントの削除に失敗しました' }, { status: 500 });
  }
}
