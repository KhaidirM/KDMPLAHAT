-- Return cooperative manager/officer names to the signed-in user's own session.
create or replace function private.kdmp_login(r text,n text,p text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare t text; h text; operator_name text; coop_name text;
begin
  if r not in ('pmo','manager','pengurus','guest') then raise exception 'Login tidak valid'; end if;
  select pin_hash into h from private.app_role_pins where role=r;
  if h is null or extensions.crypt(coalesce(p,''),h)<>h then perform pg_sleep(.5);raise exception 'Login tidak valid';end if;
  if r in ('manager','pengurus') then
    if n !~ '^[0-9]{13}$' then raise exception 'NIK koperasi tidak valid';end if;
    if r='manager' then
      select nullif(m.nama,''),i."KDKMP" into operator_name,coop_name from public.manager m left join public.index_kdkmp_lahat i on i."NIK"=m.nik_koperasi where m.nik_koperasi=n::bigint order by m.dibuat_pada limit 1;
    else
      select nullif(p.nama,''),i."KDKMP" into operator_name,coop_name from public.pengurus p left join public.index_kdkmp_lahat i on i."NIK"=p.nik_koperasi where p.nik_koperasi=n::bigint order by p.dibuat_pada limit 1;
    end if;
    if r='manager' and not exists(select 1 from public.manager where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
    if r='pengurus' and not exists(select 1 from public.pengurus where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
  elsif r='pmo' then
    if n='1111' then operator_name:='Khaidir'; elsif n='2222' then operator_name:='Iqnabila'; else raise exception 'Pilih identitas PMO'; end if;
  end if;
  if r='guest' then n:=null;end if;
  t:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.app_sessions values(encode(extensions.digest(t,'sha256'),'hex'),r,nullif(n,''),now()+interval '12 hours');
  return jsonb_build_object('token',t,'role',r,'nik',nullif(n,''),'operator_name',operator_name,'coop_name',coop_name,'expires_at',now()+interval '12 hours');
end
$$;
