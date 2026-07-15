-- ============================================================
--  Receipt Tracker — схема базы данных для Supabase
--  Выполни этот скрипт в панели Supabase: SQL Editor → New query → Run
-- ============================================================

-- Таблица чеков
create table if not exists public.receipts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  purchased_at date not null,                 -- дата покупки с чека
  category    text not null,                  -- категория расхода
  amount      numeric(12, 2) not null,        -- сумма
  currency    text not null default 'USD',    -- валюта
  merchant    text,                           -- магазин / продавец
  note        text,                           -- заметка пользователя
  image_path  text,                           -- путь к фото в Storage (bucket "receipts")
  created_at  timestamptz not null default now()
);

create index if not exists receipts_user_idx on public.receipts (user_id, purchased_at desc);

-- ============================================================
--  Row Level Security — каждый пользователь видит ТОЛЬКО свои чеки
-- ============================================================
alter table public.receipts enable row level security;

drop policy if exists "receipts_select_own" on public.receipts;
create policy "receipts_select_own"
  on public.receipts for select
  using (auth.uid() = user_id);

drop policy if exists "receipts_insert_own" on public.receipts;
create policy "receipts_insert_own"
  on public.receipts for insert
  with check (auth.uid() = user_id);

drop policy if exists "receipts_update_own" on public.receipts;
create policy "receipts_update_own"
  on public.receipts for update
  using (auth.uid() = user_id);

drop policy if exists "receipts_delete_own" on public.receipts;
create policy "receipts_delete_own"
  on public.receipts for delete
  using (auth.uid() = user_id);

-- ============================================================
--  Хранилище фото чеков (Storage bucket + политики доступа)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Файлы хранятся по пути:  <user_id>/<filename>
-- Пользователь имеет доступ только к своей папке.
drop policy if exists "receipt_files_select_own" on storage.objects;
create policy "receipt_files_select_own"
  on storage.objects for select
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipt_files_insert_own" on storage.objects;
create policy "receipt_files_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "receipt_files_delete_own" on storage.objects;
create policy "receipt_files_delete_own"
  on storage.objects for delete
  using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
