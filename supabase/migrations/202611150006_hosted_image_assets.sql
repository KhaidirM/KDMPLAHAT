-- Image binaries and their hosting paths are served from assets/, not stored in Supabase.
update public.sarpras_katalog
set gambar='{}'::jsonb
where gambar is distinct from '{}'::jsonb;

comment on column public.sarpras_katalog.gambar is
  'Deprecated and intentionally empty. Image files and path mapping are served from assets/catalog-images.json and assets/img/sarpras/.';

