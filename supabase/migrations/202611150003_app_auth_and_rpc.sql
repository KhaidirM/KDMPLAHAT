create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
create table if not exists private.app_role_pins(role text primary key check(role in ('pmo','manager','pengurus','guest')),pin_hash text not null);
create table if not exists private.app_sessions(token_hash text primary key,role text not null,nik text,expires_at timestamptz not null);
revoke all on private.app_role_pins,private.app_sessions from public,anon,authenticated;
insert into private.app_role_pins values
 ('pmo','$2a$06$PLntU0JjLQmqRslcnUsQFeB0i/HqmUOb7Wk4TBpkoVkwW16ILJLRG'),
 ('manager','$2a$06$6ubesuyuL5BeGXhS/K3aGOpbojT8Kb4NC6.Gpa6dFIqJFgQebjM3a'),
 ('pengurus','$2a$06$ZF0bMfYOpVqWlowm7V/zIuhsnsddP9ndNYuUNTTBr3rMyC1XhqJEW'),
 ('guest','$2a$06$c.NGl8ApQYrZb18pnseiEu7hybb07wu3M4JlbH68vvGmSv5jwEzqm')
on conflict(role) do nothing;

create or replace function private.kdmp_login(r text,n text,p text) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare t text;h text; begin
 if r not in ('pmo','manager','pengurus','guest') then raise exception 'Login tidak valid'; end if;
 select pin_hash into h from private.app_role_pins where role=r;
 if h is null or extensions.crypt(coalesce(p,''),h)<>h then perform pg_sleep(.5);raise exception 'Login tidak valid';end if;
 if r in ('manager','pengurus') then
  if n !~ '^[0-9]{13}$' then raise exception 'NIK koperasi tidak valid';end if;
  if r='manager' and not exists(select 1 from public.manager where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
  if r='pengurus' and not exists(select 1 from public.pengurus where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
 elsif r='pmo' and nullif(n,'') is not null and not exists(select 1 from public.index_kdkmp_lahat where "NIK"=n::bigint) then raise exception 'NIK tidak ditemukan'; end if;
 if r='guest' then n:=null;end if;
 t:=encode(extensions.gen_random_bytes(32),'hex');
 insert into private.app_sessions values(encode(extensions.digest(t,'sha256'),'hex'),r,nullif(n,''),now()+interval '12 hours');
 return jsonb_build_object('token',t,'role',r,'nik',nullif(n,''),'expires_at',now()+interval '12 hours');
end $$;

create or replace function private.kdmp_check(t text) returns jsonb language plpgsql security definer set search_path=''
as $$ declare s jsonb;begin select jsonb_build_object('role',role,'nik',nik,'expires_at',expires_at) into s from private.app_sessions where token_hash=encode(extensions.digest(coalesce(t,''),'sha256'),'hex') and expires_at>now();if s is null then raise exception 'Sesi berakhir';end if;return s;end $$;

create or replace function private.kdmp_list_coops(t text) returns jsonb language plpgsql security definer set search_path=''
as $$ declare v jsonb;begin perform private.kdmp_check(t);select coalesce(jsonb_agg(jsonb_build_object('nik',"NIK"::text,'kdkmp',"KDKMP",'desa',"DESA - KELURAHAN",'kecamatan',"KECAMATAN") order by "KECAMATAN","DESA - KELURAHAN"),'[]'::jsonb) into v from public.index_kdkmp_lahat;return v;end $$;

create or replace function private.kdmp_load_form(t text,n text) returns jsonb language plpgsql security definer set search_path=''
as $$ declare s jsonb;v jsonb;begin s:=private.kdmp_check(t);if s->>'role' in ('manager','pengurus') and s->>'nik' is distinct from n then raise exception 'Tidak berhak membuka koperasi ini';end if;select jsonb_build_object('groups',(select coalesce(jsonb_agg(jsonb_build_object('kelompok_id',g.kelompok_id,'penilaian_awal',x.penilaian_awal) order by g.urutan),'[]'::jsonb) from public.sarpras_kelompok g left join public.sarpras_isian_kelompok x on x.kelompok_id=g.kelompok_id and x.nik_koperasi=n where g.aktif),'items',(select coalesce(jsonb_agg(to_jsonb(i) order by k.urutan),'[]'::jsonb) from public.sarpras_isian i join public.sarpras_katalog k using(item_id) where i.nik_koperasi=n)) into v;return v;end $$;

create or replace function private.kdmp_save_form(t text,n text,rows jsonb,groups jsonb) returns jsonb language plpgsql security definer set search_path=''
as $$ declare s jsonb;cnt integer;begin s:=private.kdmp_check(t);if s->>'role'='guest' then raise exception 'Guest hanya dapat melihat';end if;if s->>'role' in ('manager','pengurus') and s->>'nik' is distinct from n then raise exception 'Tidak berhak mengubah koperasi ini';end if;if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>120 then raise exception 'Form tidak valid';end if;
 insert into public.sarpras_isian as old(nik_koperasi,item_id,tipe_dipilih,keberadaan,kondisi,jumlah_aktual,jumlah_rusak,catatan,detail,versi,diubah_pada,diubah_oleh_role,diubah_oleh_nik)
 select n,x.item_id,x.tipe_dipilih,x.keberadaan,x.kondisi,x.jumlah_aktual,x.jumlah_rusak,x.catatan,coalesce(x.detail,'{}'::jsonb),1,now(),s->>'role',s->>'nik' from jsonb_to_recordset(rows) as x(item_id text,tipe_dipilih text,keberadaan text,kondisi text,jumlah_aktual integer,jumlah_rusak integer,catatan text,detail jsonb)
 on conflict(nik_koperasi,item_id) do update set tipe_dipilih=excluded.tipe_dipilih,keberadaan=excluded.keberadaan,kondisi=excluded.kondisi,jumlah_aktual=excluded.jumlah_aktual,jumlah_rusak=excluded.jumlah_rusak,catatan=excluded.catatan,detail=excluded.detail,versi=old.versi+1,diubah_pada=now(),diubah_oleh_role=excluded.diubah_oleh_role,diubah_oleh_nik=excluded.diubah_oleh_nik;
 get diagnostics cnt=row_count;
 insert into public.sarpras_isian_kelompok as old(nik_koperasi,kelompok_id,penilaian_awal,versi,diubah_pada) select n,x.kelompok_id,x.penilaian_awal,1,now() from jsonb_to_recordset(coalesce(groups,'[]'::jsonb)) as x(kelompok_id text,penilaian_awal text) on conflict(nik_koperasi,kelompok_id) do update set penilaian_awal=excluded.penilaian_awal,versi=old.versi+1,diubah_pada=now();
 insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah) values(s->>'role',n,'edit','sarpras_isian','form',jsonb_build_object('rows',cnt));return jsonb_build_object('saved_rows',cnt,'saved_at',now());end $$;

create or replace function public.kdmp_login(p_role text,p_nik text,p_pin text) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_login(p_role,p_nik,p_pin) $$;
create or replace function public.kdmp_list_coops(p_token text) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_list_coops(p_token) $$;
create or replace function public.kdmp_load_form(p_token text,p_nik text) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_load_form(p_token,p_nik) $$;
create or replace function public.kdmp_save_form(p_token text,p_nik text,p_rows jsonb,p_groups jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_save_form(p_token,p_nik,p_rows,p_groups) $$;
revoke all on function private.kdmp_login(text,text,text),private.kdmp_check(text),private.kdmp_list_coops(text),private.kdmp_load_form(text,text),private.kdmp_save_form(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.kdmp_login(text,text,text),private.kdmp_check(text),private.kdmp_list_coops(text),private.kdmp_load_form(text,text),private.kdmp_save_form(text,text,jsonb,jsonb) to anon,authenticated;
revoke all on function public.kdmp_login(text,text,text),public.kdmp_list_coops(text),public.kdmp_load_form(text,text),public.kdmp_save_form(text,text,jsonb,jsonb) from public;
grant execute on function public.kdmp_login(text,text,text),public.kdmp_list_coops(text),public.kdmp_load_form(text,text),public.kdmp_save_form(text,text,jsonb,jsonb) to anon,authenticated;


