-- Catalog and group labels are non-sensitive reference data. Keep them
-- read-only for browser clients until per-user authentication is implemented.
grant select on public.sarpras_kelompok, public.sarpras_katalog to anon, authenticated;
create policy "catalog_read_only" on public.sarpras_kelompok
  for select to anon, authenticated using (true);
create policy "items_catalog_read_only" on public.sarpras_katalog
  for select to anon, authenticated using (true);
