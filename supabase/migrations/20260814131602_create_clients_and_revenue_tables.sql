-- Słownik klientów (SPEC.md IV.5). NIP jest kluczem naturalnym (decyzja V.3).
create table public.clients (
  nip text primary key,
  name text not null,
  type text not null default 'nieokreślony'
    check (type in ('bank', 'SKOK', 'inny', 'nieokreślony')),
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Pozycje rozliczeniowe z importu (SPEC.md IV.5). Import całościowy: pozycje
-- poprzedniego importu przestają być aktywne (is_active = false), ale nie są
-- usuwane - historia importów pozostaje (SPEC.md IV.5, ostatni akapit).
create table public.revenue_items (
  id bigint generated always as identity primary key,
  import_id bigint not null references public.imports (id),
  nip text not null references public.clients (nip),
  document_number text not null,
  document_type text not null check (document_type in ('FVS', 'FKS', 'FVZ', 'FVZK')),
  sale_month date not null,
  net_amount numeric(14, 2) not null,
  flag text check (flag in ('F', 'G', 'H', 'I')), -- null wyłącznie dla FKS (SPEC.md II.3.a)
  source_row_number integer not null,
  is_active boolean not null default true
);

create index revenue_items_nip_idx on public.revenue_items (nip);
create index revenue_items_import_id_idx on public.revenue_items (import_id);
create index revenue_items_is_active_idx on public.revenue_items (is_active);

alter table public.revenue_items enable row level security;

-- Przychody miesięczne pozycji (SPEC.md IV.5): rozbicie wartości pozycji na
-- kolumny miesięczne z pliku źródłowego.
create table public.revenue_months (
  id bigint generated always as identity primary key,
  revenue_item_id bigint not null references public.revenue_items (id),
  month date not null,
  amount numeric(14, 2) not null,
  unique (revenue_item_id, month)
);

create index revenue_months_revenue_item_id_idx on public.revenue_months (revenue_item_id);
create index revenue_months_month_idx on public.revenue_months (month);

alter table public.revenue_months enable row level security;
