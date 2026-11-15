-- Managers and cooperative officers may inspect other cooperatives' forms.
-- Save access remains restricted by private.kdmp_save_form.
create or replace function private.kdmp_load_form(t text,n text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; v jsonb;
begin
  s:=private.kdmp_check(t);
  if s->>'role'='guest' and n is null then raise exception 'Pilih koperasi'; end if;
  select jsonb_build_object(
    'groups',(select coalesce(jsonb_agg(jsonb_build_object('kelompok_id',g.kelompok_id,'penilaian_awal',x.penilaian_awal,'versi',coalesce(x.versi,0)) order by g.urutan),'[]'::jsonb)
      from public.sarpras_kelompok g left join public.sarpras_isian_kelompok x on x.kelompok_id=g.kelompok_id and x.nik_koperasi=n where g.aktif),
    'items',(select coalesce(jsonb_agg(to_jsonb(i) order by k.urutan),'[]'::jsonb) from public.sarpras_isian i join public.sarpras_katalog k using(item_id) where i.nik_koperasi=n and k.aktif)
  ) into v;
  return v;
end
$$;
