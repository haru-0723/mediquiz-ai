-- consume_usage_quota に「通算（lifetime）」期間を追加。
-- 無料プランのAI問題生成を「1日◯回」の日次リセットから「通算◯回まで」に変更するために使う。
CREATE OR REPLACE FUNCTION public.consume_usage_quota(p_user_id uuid, p_table text, p_period text, p_limit integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_count int;
  v_start timestamptz;
  v_new_id uuid;
begin
  if p_table not in ('generate_logs', 'kokushi_logs', 'cbt_logs') then
    raise exception 'invalid table: %', p_table;
  end if;

  -- 同一ユーザー＋テーブル単位で直列化
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_table, 0));

  if p_period = 'day' then
    v_start := ((now() at time zone 'Asia/Tokyo')::date)::timestamp at time zone 'Asia/Tokyo';
  elsif p_period = 'all' then
    v_start := '-infinity'::timestamptz;
  else
    v_start := (date_trunc('month', now() at time zone 'Asia/Tokyo'))::timestamp at time zone 'Asia/Tokyo';
  end if;

  execute format('select count(*) from %I where user_id = $1 and created_at >= $2', p_table)
    into v_count using p_user_id, v_start;

  if v_count >= p_limit then
    return null;
  end if;

  execute format('insert into %I(user_id) values ($1) returning id', p_table)
    into v_new_id using p_user_id;
  return v_new_id;
end;
$function$;
