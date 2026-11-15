-- KDKMP application completeness, server-derived dashboard, and optimistic saves.
create index if not exists sarpras_isian_kelompok_group_idx
  on public.sarpras_isian_kelompok(kelompok_id);
create index if not exists sarpras_katalog_parent_idx
  on public.sarpras_katalog(induk_item_id);

create or replace function private.kdmp_list_coops(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; v jsonb;
begin
  s:=private.kdmp_check(t);
  select coalesce(jsonb_agg(jsonb_build_object(
    'nik',i."NIK"::text,'kdkmp',i."KDKMP",'desa',i."DESA - KELURAHAN",'kecamatan',i."KECAMATAN"
  ) order by i."KECAMATAN",i."DESA - KELURAHAN"),'[]'::jsonb)
  into v
  from public.index_kdkmp_lahat i
  where s->>'role' not in ('manager','pengurus') or i."NIK"::text=s->>'nik';
  return v;
end
$$;

create or replace function private.kdmp_load_form(t text,n text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; v jsonb;
begin
  s:=private.kdmp_check(t);
  if s->>'role'='guest' and n is null then raise exception 'Pilih koperasi'; end if;
  if s->>'role' in ('manager','pengurus') and s->>'nik' is distinct from n then
    raise exception 'Tidak berhak membuka koperasi ini';
  end if;
  select jsonb_build_object(
    'groups',(
      select coalesce(jsonb_agg(jsonb_build_object(
        'kelompok_id',g.kelompok_id,'penilaian_awal',x.penilaian_awal,'versi',coalesce(x.versi,0)
      ) order by g.urutan),'[]'::jsonb)
      from public.sarpras_kelompok g
      left join public.sarpras_isian_kelompok x
        on x.kelompok_id=g.kelompok_id and x.nik_koperasi=n
      where g.aktif
    ),
    'items',(
      select coalesce(jsonb_agg(to_jsonb(i) order by k.urutan),'[]'::jsonb)
      from public.sarpras_isian i
      join public.sarpras_katalog k using(item_id)
      where i.nik_koperasi=n and k.aktif
    )
  ) into v;
  return v;
end
$$;

create or replace function private.kdmp_dashboard(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; result jsonb;
begin
  s:=private.kdmp_check(t);
  with
  catalog as (
    select item_id,jumlah_rencana from public.sarpras_katalog where aktif
  ),
  coop_rows as (
    select i."NIK"::text as nik,i."KDKMP" as kdkmp,
      i."DESA - KELURAHAN" as desa,i."KECAMATAN" as kecamatan,
      (select count(*) from catalog) as items_total,
      count(*) filter (where x.keberadaan is not null)::integer as items_rated,
      count(*) filter (where x.keberadaan='ada' and x.kondisi='baik' and
        (c.jumlah_rencana is null or x.jumlah_aktual>=c.jumlah_rencana)
        and coalesce(x.jumlah_rusak,0)=0)::integer as items_ready,
      count(*) filter (where x.keberadaan='tidak_ada')::integer as items_missing,
      count(*) filter (where x.kondisi='rusak' or coalesce(x.jumlah_rusak,0)>0)::integer as items_damaged,
      count(*) filter (where x.kondisi='belum_dicek')::integer as items_unchecked,
      count(*) filter (where x.keberadaan='ada' and c.jumlah_rencana is not null and
        x.jumlah_aktual is not null and x.jumlah_aktual<c.jumlah_rencana)::integer as items_below_plan,
      max(x.diubah_pada) as last_saved_at
    from public.index_kdkmp_lahat i
    left join public.sarpras_isian x on x.nik_koperasi=i."NIK"::text
    left join catalog c on c.item_id=x.item_id
    where s->>'role' not in ('manager','pengurus') or i."NIK"::text=s->>'nik'
    group by i."NIK",i."KDKMP",i."DESA - KELURAHAN",i."KECAMATAN"
  ),
  coop_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nik',nik,'kdkmp',kdkmp,'desa',desa,'kecamatan',kecamatan,
      'items_total',items_total,'items_rated',items_rated,'items_ready',items_ready,
      'items_missing',items_missing,'items_damaged',items_damaged,
      'items_unchecked',items_unchecked,'items_below_plan',items_below_plan,
      'last_saved_at',last_saved_at
    ) order by kecamatan,desa),'[]'::jsonb) as value
    from coop_rows
  ),
  total_json as (
    select
      count(*)::integer as coop_count,
      count(distinct kecamatan)::integer as district_count,
      coalesce(sum(items_total),0)::integer as items_total,
      coalesce(sum(items_rated),0)::integer as items_rated,
      coalesce(sum(items_ready),0)::integer as items_ready,
      coalesce(sum(items_missing),0)::integer as items_missing,
      coalesce(sum(items_damaged),0)::integer as items_damaged,
      coalesce(sum(items_unchecked),0)::integer as items_unchecked,
      coalesce(sum(items_below_plan),0)::integer as items_below_plan,
      count(*) filter (where items_rated=0)::integer as coops_not_started,
      count(*) filter (where items_rated>0)::integer as coops_started,
      count(*) filter (where items_rated>=items_total)::integer as coops_complete,
      count(*) filter (where items_missing+items_damaged+items_unchecked+items_below_plan>0)::integer as coops_attention,
      max(last_saved_at) as last_saved_at
    from coop_rows
  ),
  district_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'kecamatan',kecamatan,'coop_count',coop_count,'coops_started',coops_started,
      'completion_pct',case when items_total=0 then 0 else round(items_rated*100.0/items_total)::integer end,
      'items_total',items_total,'items_rated',items_rated
    ) order by kecamatan),'[]'::jsonb) as value
    from (
      select kecamatan,count(*)::integer as coop_count,
        count(*) filter(where items_rated>0)::integer as coops_started,
        sum(items_total)::integer as items_total,sum(items_rated)::integer as items_rated
      from coop_rows group by kecamatan
    ) d
  ),
  priority_json as (
    select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'count',count,'coops',coops)
      order by case kind when 'missing' then 1 when 'damaged' then 2 when 'unchecked' then 3 else 4 end),'[]'::jsonb) as value
    from (
      select 'missing'::text as kind,coalesce(sum(items_missing),0)::integer as count,
        count(*) filter(where items_missing>0)::integer as coops from coop_rows
      union all
      select 'damaged',coalesce(sum(items_damaged),0)::integer,count(*) filter(where items_damaged>0)::integer from coop_rows
      union all
      select 'unchecked',coalesce(sum(items_unchecked),0)::integer,count(*) filter(where items_unchecked>0)::integer from coop_rows
      union all
      select 'below',coalesce(sum(items_below_plan),0)::integer,count(*) filter(where items_below_plan>0)::integer from coop_rows
    ) p
  )
  select jsonb_build_object(
    'generated_at',now(),
    'coops',co.value,
    'districts',d.value,
    'priorities',p.value,
    'totals',jsonb_build_object(
      'coop_count',t.coop_count,'district_count',t.district_count,'items_total',t.items_total,
      'items_rated',t.items_rated,'items_scored',t.items_rated,'items_unrated',greatest(t.items_total-t.items_rated,0),
      'items_ready',t.items_ready,'items_missing',t.items_missing,'items_damaged',t.items_damaged,
      'items_unchecked',t.items_unchecked,'items_below_plan',t.items_below_plan,
      'items_attention',t.items_missing+t.items_damaged+t.items_unchecked+t.items_below_plan,
      'coops_not_started',t.coops_not_started,'coops_started',t.coops_started,
      'coops_complete',t.coops_complete,'coops_attention',t.coops_attention,'last_saved_at',t.last_saved_at
    )
  )
  into result
  from coop_json co cross join total_json t cross join district_json d cross join priority_json p;
  return result;
end
$$;

create or replace function public.kdmp_dashboard(p_token text) returns jsonb
language sql security invoker set search_path=''
as $$ select private.kdmp_dashboard(p_token) $$;

create or replace function private.kdmp_save_form(t text,n text,rows jsonb,groups jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; cnt integer; group_cnt integer; expected_rows integer; expected_groups integer;
begin
  s:=private.kdmp_check(t);
  if s->>'role'='guest' then raise exception 'Guest hanya dapat melihat'; end if;
  if s->>'role' in ('manager','pengurus') and s->>'nik' is distinct from n then
    raise exception 'Tidak berhak mengubah koperasi ini';
  end if;
  if not exists(select 1 from public.index_kdkmp_lahat where "NIK"::text=n) then
    raise exception 'NIK koperasi tidak ditemukan';
  end if;
  if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>120 then raise exception 'Form tidak valid'; end if;
  expected_rows:=jsonb_array_length(rows);
  insert into public.sarpras_isian as old
    (nik_koperasi,item_id,tipe_dipilih,keberadaan,kondisi,jumlah_aktual,jumlah_rusak,catatan,detail,versi,
     diubah_pada,diubah_oleh_role,diubah_oleh_nik)
  select n,x.item_id,x.tipe_dipilih,x.keberadaan,
    case when x.keberadaan='ada' then x.kondisi else null end,
    x.jumlah_aktual,x.jumlah_rusak,x.catatan,coalesce(x.detail,'{}'::jsonb),1,
    now(),s->>'role',s->>'nik'
  from jsonb_to_recordset(rows) as x(
    item_id text,expected_versi bigint,tipe_dipilih text,keberadaan text,kondisi text,
    jumlah_aktual integer,jumlah_rusak integer,catatan text,detail jsonb
  )
  join public.sarpras_katalog k on k.item_id=x.item_id and k.aktif
  on conflict(nik_koperasi,item_id) do update set
    tipe_dipilih=excluded.tipe_dipilih,keberadaan=excluded.keberadaan,kondisi=excluded.kondisi,
    jumlah_aktual=excluded.jumlah_aktual,jumlah_rusak=excluded.jumlah_rusak,catatan=excluded.catatan,
    detail=excluded.detail,versi=old.versi+1,diubah_pada=now(),
    diubah_oleh_role=excluded.diubah_oleh_role,diubah_oleh_nik=excluded.diubah_oleh_nik
  where (select x2.expected_versi from jsonb_to_recordset(rows) as x2(item_id text,expected_versi bigint)
    where x2.item_id=excluded.item_id) is null
    or old.versi=(select x2.expected_versi from jsonb_to_recordset(rows) as x2(item_id text,expected_versi bigint)
    where x2.item_id=excluded.item_id);
  get diagnostics cnt=row_count;
  if cnt<>expected_rows then raise exception 'Form berubah di server sejak dibuka. Muat data terbaru sebelum menyimpan.'; end if;

  expected_groups:=jsonb_array_length(coalesce(groups,'[]'::jsonb));
  insert into public.sarpras_isian_kelompok as old(nik_koperasi,kelompok_id,penilaian_awal,versi,diubah_pada)
  select n,x.kelompok_id,x.penilaian_awal,1,now()
  from jsonb_to_recordset(coalesce(groups,'[]'::jsonb)) as x(kelompok_id text,penilaian_awal text,expected_versi bigint)
  join public.sarpras_kelompok g on g.kelompok_id=x.kelompok_id and g.aktif
  on conflict(nik_koperasi,kelompok_id) do update set
    penilaian_awal=excluded.penilaian_awal,versi=old.versi+1,diubah_pada=now()
  where (select x2.expected_versi from jsonb_to_recordset(coalesce(groups,'[]'::jsonb))
    as x2(kelompok_id text,expected_versi bigint) where x2.kelompok_id=excluded.kelompok_id) is null
    or old.versi=(select x2.expected_versi from jsonb_to_recordset(coalesce(groups,'[]'::jsonb))
    as x2(kelompok_id text,expected_versi bigint) where x2.kelompok_id=excluded.kelompok_id);
  get diagnostics group_cnt=row_count;
  if group_cnt<>expected_groups then raise exception 'Penilaian kelompok berubah di server. Muat ulang form sebelum menyimpan.'; end if;

  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
  values(s->>'role',n,'simpan','sarpras_isian','form',jsonb_build_object('rows',cnt,'groups',group_cnt));
  return jsonb_build_object('saved_rows',cnt,'saved_groups',group_cnt,'saved_at',now());
end
$$;

create or replace function public.kdmp_save_form(p_token text,p_nik text,p_rows jsonb,p_groups jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.kdmp_save_form(p_token,p_nik,p_rows,p_groups) $$;

revoke all on function public.lihat_koperasi(),public.lihat_pengelola(bigint),public.masuk_pmo(text)
  from public,anon,authenticated;
revoke all on function public.kdmp_dashboard(text) from public;
grant execute on function public.kdmp_dashboard(text) to anon,authenticated;
revoke all on function private.kdmp_dashboard(text) from public,anon,authenticated;
grant execute on function private.kdmp_dashboard(text) to anon,authenticated;
revoke all on function public.kdmp_save_form(text,text,jsonb,jsonb) from public;
grant execute on function public.kdmp_save_form(text,text,jsonb,jsonb) to anon,authenticated;

