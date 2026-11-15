-- KDKMP Pra-Verval schema foundation. Access remains closed until an
-- authenticated authorization model and reviewed RLS policies are installed.
create table if not exists public.sarpras_kelompok (
  kelompok_id text primary key,
  nama_kelompok text not null,
  urutan integer not null unique check (urutan > 0),
  aktif boolean not null default true
);

create table if not exists public.sarpras_katalog (
  item_id text primary key,
  induk_item_id text references public.sarpras_katalog(item_id),
  kelompok_id text not null references public.sarpras_kelompok(kelompok_id),
  nama_item text not null,
  urutan integer not null check (urutan > 0),
  jumlah_rencana integer check (jumlah_rencana is null or jumlah_rencana >= 0),
  daftar_tipe jsonb not null default '[]'::jsonb,
  spesifikasi jsonb not null default '{}'::jsonb,
  gambar jsonb not null default '{}'::jsonb,
  aktif boolean not null default true,
  unique (kelompok_id, urutan)
);

create table if not exists public.sarpras_isian_kelompok (
  nik_koperasi text not null,
  kelompok_id text not null references public.sarpras_kelompok(kelompok_id),
  penilaian_awal text check (penilaian_awal in ('ada','tidak_ada','custom')),
  versi bigint not null default 1 check (versi > 0),
  diubah_pada timestamptz not null default now(),
  primary key (nik_koperasi, kelompok_id)
);

create table if not exists public.sarpras_isian (
  id bigint generated always as identity primary key,
  nik_koperasi text not null,
  item_id text not null references public.sarpras_katalog(item_id),
  tipe_dipilih text,
  keberadaan text check (keberadaan in ('ada','tidak_ada')),
  kondisi text check (kondisi in ('baik','belum_dicek','rusak')),
  jumlah_aktual integer check (jumlah_aktual is null or jumlah_aktual >= 0),
  jumlah_rusak integer check (jumlah_rusak is null or jumlah_rusak >= 0),
  catatan text check (catatan is null or char_length(catatan) <= 1000),
  detail jsonb not null default '{}'::jsonb,
  lampiran jsonb not null default '[]'::jsonb,
  versi bigint not null default 1 check (versi > 0),
  dibuat_pada timestamptz not null default now(),
  diubah_pada timestamptz not null default now(),
  diubah_oleh_role text check (diubah_oleh_role in ('pmo','manager','pengurus')),
  diubah_oleh_nik text,
  unique (nik_koperasi, item_id),
  check (jumlah_rusak is null or jumlah_aktual is not null and jumlah_rusak <= jumlah_aktual),
  check (keberadaan = 'ada' or kondisi is null)
);

create table if not exists public.log_aktivitas (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  role text not null check (role in ('pmo','manager','pengurus','guest')),
  nik_koperasi text,
  aktivitas text not null,
  entitas text,
  kunci_data text,
  nilai_sebelum jsonb,
  nilai_sesudah jsonb
);

create index if not exists sarpras_isian_nik_idx on public.sarpras_isian(nik_koperasi);
create index if not exists sarpras_isian_item_idx on public.sarpras_isian(item_id);
create index if not exists sarpras_isian_kelompok_nik_idx on public.sarpras_isian_kelompok(nik_koperasi);
create index if not exists log_aktivitas_waktu_idx on public.log_aktivitas(waktu desc);

alter table public.sarpras_kelompok enable row level security;
alter table public.sarpras_katalog enable row level security;
alter table public.sarpras_isian_kelompok enable row level security;
alter table public.sarpras_isian enable row level security;
alter table public.log_aktivitas enable row level security;

-- Intentionally no anon/authenticated policies or grants yet: PIN-only sessions
-- do not provide trustworthy database identity for enforcing cooperative scope.
revoke all on public.sarpras_kelompok, public.sarpras_katalog,
  public.sarpras_isian_kelompok, public.sarpras_isian, public.log_aktivitas
  from anon, authenticated;
