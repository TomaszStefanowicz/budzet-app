-- Zachowanie poprzedniej nazwy klienta przy rzadkiej zmianie nazwy (SPEC.md V.35,
-- zadanie 1.6b) - nowa nazwa przez jakiś czas nie jest rozpoznawalna, więc stara
-- musi pozostać widoczna.
alter table public.clients add column previous_name text;
