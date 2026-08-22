create table if not exists public.user_collections (
  owner text primary key,
  favorites jsonb not null default '[]'::jsonb,
  compare jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_collections enable row level security;

-- 仅本人可读写
create policy "user_collections_select_self" on public.user_collections
  for select using (owner = auth.uid());
create policy "user_collections_insert_self" on public.user_collections
  for insert with check (owner = auth.uid());
create policy "user_collections_update_self" on public.user_collections
  for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "user_collections_delete_self" on public.user_collections
  for delete using (owner = auth.uid());
