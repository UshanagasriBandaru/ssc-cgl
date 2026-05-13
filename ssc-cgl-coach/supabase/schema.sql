-- Run in Supabase SQL Editor (Dashboard → SQL).
-- 1) Extensions
create extension if not exists vector;

-- 2) Profiles (mirror auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Saved study plans
create table if not exists public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  markdown text not null,
  horizon text,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists saved_plans_user_idx on public.saved_plans (user_id);

alter table public.saved_plans enable row level security;

create policy "plans_own_select" on public.saved_plans
  for select using (auth.uid() = user_id);

create policy "plans_own_insert" on public.saved_plans
  for insert with check (auth.uid() = user_id);

create policy "plans_own_delete" on public.saved_plans
  for delete using (auth.uid() = user_id);

-- 4) Topic notes vault
create table if not exists public.topic_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_slug text not null,
  title text,
  body text not null,
  source_url text,
  created_at timestamptz default now()
);

create index if not exists topic_notes_user_topic_idx
  on public.topic_notes (user_id, topic_slug);

alter table public.topic_notes enable row level security;

create policy "notes_own_all" on public.topic_notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Mistake notebook
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_slug text not null,
  question text not null,
  correct_answer text,
  user_answer text,
  explanation text,
  next_review_at date,
  created_at timestamptz default now()
);

create index if not exists mistakes_user_topic_idx on public.mistakes (user_id, topic_slug);

alter table public.mistakes enable row level security;

create policy "mistakes_own_all" on public.mistakes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 6) Uploaded knowledge (NotebookLM-style source docs)
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_slug text,
  filename text,
  raw_text text,
  created_at timestamptz default now()
);

create index if not exists documents_user_idx on public.documents (user_id);

alter table public.documents enable row level security;

create policy "documents_own_all" on public.documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7) Chunks + optional embeddings (1536 for text-embedding-3-small)
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector (1536)
);

create index if not exists document_chunks_doc_idx on public.document_chunks (document_id);

alter table public.document_chunks enable row level security;

create policy "chunks_own_select" on public.document_chunks
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = auth.uid()
    )
  );

create policy "chunks_own_insert" on public.document_chunks
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = auth.uid()
    )
  );

create policy "chunks_own_delete" on public.document_chunks
  for delete using (
    exists (
      select 1 from public.documents d
      where d.id = document_id and d.user_id = auth.uid()
    )
  );
