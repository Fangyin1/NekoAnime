-- Optional schema for persisting scraped catalog snapshots in Supabase.
-- This starter frontend currently reads the source through Vercel API endpoints directly.
create table if not exists public.anime_catalog (
  id bigint generated always as identity primary key,
  source_url text not null unique,
  slug text not null,
  title text not null,
  poster_url text,
  synopsis text,
  latest_episode text,
  status text,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists anime_catalog_title_idx on public.anime_catalog using gin (to_tsvector('simple', title));
-- Do not enable public write access. Persist records only from a trusted server/worker using a server-side secret.
