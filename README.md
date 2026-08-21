# budzet-app

Aplikacja webowa do raportowania danych sprzedażowych i przychodowych spółki SaaS B2B (klienci m.in. banki i SKOK-i). Dane wchodzą wyłącznie przez import pliku `.xlsx` przygotowanego z arkusza „Sprzedaż" — aplikacja waliduje plik, zapisuje pozycje do bazy i generuje zestawienia (liczba i wartość sprzedaży/przychodów wg miesiąca i typu transakcji, lista klientów z przychodem, liczba banków/SKOK-ów wśród klientów).

Aplikacja jest narzędziem raportowym, nie źródłem prawdy — źródłem prawdy pozostają księgi rachunkowe. Nie ma i nie będzie miała funkcji ręcznego wprowadzania ani edycji danych rozliczeniowych; korekty robi się w pliku źródłowym i importuje ponownie.

Projekt zrealizowany jako praca zaliczeniowa kursu vibe codingu (termin: 14 dni, praca w parze z Claude Code).

## Link do aplikacji

**https://budzet-app-sigma.vercel.app**

## Dane logowania (instancja demo)

Login i hasło do konta demo przekazane są osobno, w prezentacji dla organizatorów kursu — nie w tym publicznym repozytorium (ujawnienie danych logowania do produkcyjnej instancji w publicznym README naruszałoby zasady bezpieczeństwa). Rejestracja samodzielna jest wyłączona — konto zakłada właściciel projektu w panelu Supabase Auth.

## Dane demo

Instancja pod publicznym linkiem zawiera **wyłącznie dane syntetyczne** — fikcyjne nazwy firm i NIP-y, wygenerowane skryptem `scripts/generate-synthetic-data.ts`. Nigdy nie zawiera i nie będzie zawierać danych rzeczywistych klientów spółki.

## Stack

- **Język:** TypeScript
- **Framework:** Next.js (App Router) — frontend i API w jednym projekcie
- **Baza:** Supabase (Postgres), schemat wyłącznie przez migracje SQL (`supabase/migrations/`)
- **Autoryzacja:** Supabase Auth (email + hasło)
- **Parsowanie `.xlsx`:** SheetJS (`xlsx`)
- **Testy:** Vitest
- **Hosting:** Vercel, automatyczny deploy z gałęzi `main`

## Uruchomienie lokalne

```bash
npm install
cp .env.local.example .env.local   # uzupełnić zmiennymi z panelu Supabase
npm run dev                        # serwer developerski — http://localhost:3000
npm test                           # testy jednostkowe
npm run build                      # build produkcyjny
npm run lint                       # lint
```

Wymagane zmienne środowiskowe w `.env.local` (nigdy nie commitowane):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Uwaga: w tym projekcie jest **jedna** instancja Supabase, współdzielona przez lokalny `npm run dev` i produkcję/demo pod publicznym linkiem — nie ma osobnej bazy do zabawy lokalnie. Zmiany zapisywane lokalnie trafiają do tej samej bazy, co widoczna publicznie.

### Dodatkowe skrypty

```bash
npm run generate:data              # generuje syntetyczny plik .xlsx do importu (test-data/)
npm run generate:data -- --with-errors   # wariant z celowymi błędami, do testów walidacji
npm run reports:preview -- --month=rrrr-mm             # podgląd zestawień z bazy, bez UI
npm run reports:preview -- --file=sciezka.xlsx --month=rrrr-mm  # podgląd z pliku, bez dotykania bazy
```

## Dokumentacja projektu

- [`SPEC.md`](./SPEC.md) — specyfikacja biznesowa: reguły walidacji, definicje zestawień, rejestr decyzji projektowych z uzasadnieniami.
- [`PLAN.md`](./PLAN.md) — etapy realizacji, dziennik projektu, pytania otwarte.
- [`CLAUDE.md`](./CLAUDE.md) — instrukcje dla Claude Code (zasady twarde projektu, stack, konwencje).
