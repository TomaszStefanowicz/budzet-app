# DEMO.md — odtwarzanie danych demo

## Kontekst

Instancja demo (`https://budzet-app-sigma.vercel.app`) ma dedykowane konto demo z **pełnymi** uprawnieniami, w tym importem (`SPEC.md` V.48) — świadoma decyzja, żeby demo pokazywało pełną funkcjonalność aplikacji. Konsekwencja: każdy, kto zna opublikowane hasło demo, może nadpisać dane własnym importem, zmienić słownik klientów albo zapisać migawkę do archiwum. Dane demo są syntetyczne i deterministycznie odtwarzalne (stały plik źródłowy, stały seed) — ta procedura przywraca je do stanu wyjściowego. Nie jest to utrata niczego wartościowego, tylko przywrócenie punktu odniesienia.

## Procedura pełnego resetu (sprawdzona w zadaniu 4.2a)

1. **Wyczyść bazę demo.** W panelu Supabase projektu `budzet-app-demo` (ref `lcbujqrxmiakvczsplti`) → SQL Editor:

   ```sql
   truncate imports, clients, revenue_items, revenue_months, report_archive restart identity cascade;
   ```

   Wszystkie **pięć** tabel — `report_archive` jest łatwo przeoczyć (`SPEC.md` V.41). Krok nieodwracalny, ale dane demo są odtwarzalne z pliku źródłowego (decyzja 2, `SPEC.md` V) — to zamierzone.

2. **Zaimportuj dane syntetyczne.** Zaloguj się na `https://budzet-app-sigma.vercel.app` kontem demo i wgraj [`test-data/dane-syntetyczne-clean.xlsx`](./test-data/dane-syntetyczne-clean.xlsx) na ekranie „Import". Na pustym słowniku wszystkich 500 klientów dostanie domyślny typ `nieokreślony`.

3. **Odtwórz rozkład typów słownika.** Reimport nie zmienia typu klientów, jeśli słownik nie był pusty (krok 2 aktualizuje tylko nazwę), więc po pustym imporcie z kroku 1–2 wszyscy klienci są `nieokreślony` — trzeba nadać im rozkład jak w zadaniu 4.2 (`PLAN.md`): 50 bank / 25 SKOK / 325 inny / 100 nieokreślony. To proporcja **demonstracyjna**, nie biznesowa — chodzi o pokazanie działającego zestawienia 16 i ostrzeżenia o nieuzupełnionych typach w słowniku, nie o przypisanie konkretnego NIP-u do konkretnego typu (może się różnić między odtworzeniami). W SQL Editorze:

   ```sql
   with ranked as (
     select nip, row_number() over (order by nip) as rn from clients
   )
   update clients c
   set type = case
     when r.rn <= 50 then 'bank'
     when r.rn <= 75 then 'SKOK'
     when r.rn <= 400 then 'inny'
     else 'nieokreślony'
   end
   from ranked r
   where c.nip = r.nip;
   ```

4. **Zweryfikuj.** „Słownik klientów" pokazuje 500 wpisów w proporcji z kroku 3. Zestawienia (`/reports`) liczą się bez błędów dla bieżącego miesiąca.

## Szybszy wariant — zmienił się tylko słownik

Jeśli podejrzewasz wyłącznie zmianę typów klientów (import i archiwum wciąż wyglądają poprawnie), pomiń krok 1–2 i wykonaj sam krok 3.

## Czego procedura nie obejmuje

- Jeśli liczba klientów w słowniku po imporcie nie wynosi 500 (np. ktoś zaimportował inny plik z innymi NIP-ami, dokładając nowych klientów obok pozostałych) — rozkład z kroku 3 przestaje odzwierciedlać zamierzone proporcje. Sprawdź `select count(*) from clients;` przed uruchomieniem SQL-a; jeśli liczba się nie zgadza, wróć do kroku 1 (pełny reset).
