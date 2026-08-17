-- Archiwum wygenerowanych zestawień (SPEC.md IV.3/IV.5, zadanie 4.1) - migawka
-- tego, co zostało pokazane/wysłane do funduszu dla danego miesiąca, w danym
-- momencie, na podstawie danego importu. Zestawienia same są liczone na
-- żądanie (P1) - to archiwum służy do przywołania "co konkretnie wysłaliśmy",
-- nie do ponownego liczenia (to i tak zawsze możliwe z aktywnych pozycji).
-- Przeglądanie archiwum poza zakresem tej wersji - odczyt przez panel
-- podglądu danych Supabase (CLAUDE.md pkt 4).
create table public.report_archive (
  id bigint generated always as identity primary key,
  import_id bigint not null references public.imports (id),
  month date not null,
  generated_at timestamptz not null default now(),
  payload jsonb not null
);

create index report_archive_month_idx on public.report_archive (month);
create index report_archive_import_id_idx on public.report_archive (import_id);

alter table public.report_archive enable row level security;
