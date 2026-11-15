-- PMO operator identities and cooperative lookup in the login screen.
create or replace function private.kdmp_login(r text,n text,p text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare t text; h text; operator_name text;
begin
  if r not in ('pmo','manager','pengurus','guest') then raise exception 'Login tidak valid'; end if;
  select pin_hash into h from private.app_role_pins where role=r;
  if h is null or extensions.crypt(coalesce(p,''),h)<>h then perform pg_sleep(.5);raise exception 'Login tidak valid';end if;

  if r in ('manager','pengurus') then
    if n !~ '^[0-9]{13}$' then raise exception 'NIK koperasi tidak valid';end if;
    if r='manager' and not exists(select 1 from public.manager where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
    if r='pengurus' and not exists(select 1 from public.pengurus where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
  elsif r='pmo' then
    if n='1111' then operator_name:='Khaidir';
    elsif n='2222' then operator_name:='Iqnabila';
    else raise exception 'Pilih identitas PMO'; end if;
  end if;

  if r='guest' then n:=null;end if;
  t:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.app_sessions values(
    encode(extensions.digest(t,'sha256'),'hex'),r,nullif(n,''),now()+interval '12 hours'
  );
  return jsonb_build_object(
    'token',t,'role',r,'nik',nullif(n,''),'operator_name',operator_name,
    'expires_at',now()+interval '12 hours'
  );
end
$$;

create or replace function private.kdmp_coop_picker() returns jsonb
language sql security definer set search_path=''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'nik',"NIK"::text,'kdkmp',"KDKMP",'desa',"DESA - KELURAHAN",'kecamatan',"KECAMATAN"
  ) order by "KECAMATAN","DESA - KELURAHAN"),'[]'::jsonb)
  from public.index_kdkmp_lahat
$$;

create or replace function public.kdmp_coop_picker() returns jsonb
language sql security invoker set search_path=''
as $$ select private.kdmp_coop_picker() $$;

revoke all on function private.kdmp_coop_picker() from public,anon,authenticated;
grant execute on function private.kdmp_coop_picker() to anon,authenticated;
revoke all on function public.kdmp_coop_picker() from public;
grant execute on function public.kdmp_coop_picker() to anon,authenticated;

