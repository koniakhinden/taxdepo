-- ============================================================
--  Миграция v2 — поля для налогового учёта (тип использования расхода)
--  Выполни в Supabase: SQL Editor → New query → вставь → Run
--  Безопасна для существующих данных (колонки добавляются со значениями по умолчанию).
-- ============================================================

alter table public.receipts
  add column if not exists usage_type text not null default 'work';
  -- 'work' = робоча витрата (100% до вычету)
  -- 'personal' = особиста (0%)
  -- 'partial' = частково робоча (business_percent %)

alter table public.receipts
  add column if not exists business_percent integer not null default 100;

-- Ограничим процент диапазоном 0..100
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'receipts_business_percent_range'
  ) then
    alter table public.receipts
      add constraint receipts_business_percent_range
      check (business_percent >= 0 and business_percent <= 100);
  end if;
end $$;
