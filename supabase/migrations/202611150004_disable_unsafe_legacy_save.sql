-- Retire legacy SECURITY DEFINER writer that trusted caller-supplied role/NIK.
revoke execute on function public.simpan_isian(bigint,text,text,text,jsonb) from public,anon,authenticated;
