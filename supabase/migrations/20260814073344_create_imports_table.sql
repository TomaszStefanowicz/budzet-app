-- Tabela imports: metryki każdego importu pliku sprzedażowego (SPEC.md IV.5, IV.2).
-- Import całościowy: rejestrowany jest tu każdy import, również odrzucony (validation_status = 'blad').
create table public.imports (
  id bigint generated always as identity primary key,
  imported_at timestamptz not null default now(),
  file_name text not null,
  row_count integer not null,
  validation_status text not null check (validation_status in ('sukces', 'blad')),
  detected_month_from date,
  detected_month_to date
);

-- Brak polityk: dostęp wyłącznie przez klucz service_role w warstwie API (CLAUDE.md pkt 4).
alter table public.imports enable row level security;
