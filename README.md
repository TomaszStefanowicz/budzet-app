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

## Środowiska

Trzy niezależne środowiska (`SPEC.md` VI.3), rozdzielone po incydentach z pracy na współdzielonej instancji:

| | Demo (publiczny link) | Produkcja | Dev lokalny |
|---|---|---|---|
| Dane | wyłącznie syntetyczne | rzeczywiste | syntetyczne |
| Supabase | projekt „demo" | projekt „produkcja" | lokalny, przez Supabase CLI (`supabase start`, Docker) |
| Vercel | gałąź `demo` (zamrożona na wersji ocenionej, aktualizowana wyłącznie świadomie) | gałąź `main` | `npm run dev` |
| URL | ten wyżej | nieujawniany publicznie | localhost |

Commit na `main` **nie** zmienia publicznego demo. Instancja demo ma dedykowane konto o pełnych uprawnieniach (w tym import) — procedura odtwarzania jej danych po nadpisaniu przez odwiedzającego opisana w [`DEMO.md`](./DEMO.md).

## Uruchomienie lokalne

Wymaga [Docker Desktop](https://www.docker.com/products/docker-desktop/) (lokalny Supabase uruchamia się w kontenerach) — na Windows wymaga też WSL2 (`wsl --install --no-distribution`, potem restart).

```bash
npm install
npx supabase start                 # startuje lokalny Supabase (Postgres, Auth, Studio) i aplikuje migracje z repo
```

`supabase start` wypisuje `API_URL`, `PUBLISHABLE_KEY` i `SECRET_KEY` lokalnej instancji — wpisz je do `.env.local`:

```bash
cp .env.local.example .env.local   # uzupełnić wartościami wypisanymi przez supabase start
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

Lokalna instancja Auth jest pusta i niezależna od demo/produkcji — konto do logowania trzeba założyć raz, ręcznie (nie ma tu ekranu rejestracji ani „Auto Confirm User" z panelu chmurowego):

```bash
curl -X POST 'http://127.0.0.1:54321/auth/v1/admin/users' \
  -H "apikey: <SECRET_KEY ze `supabase start`>" \
  -H "Authorization: Bearer <SECRET_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@localhost.test","password":"...","email_confirm":true}'
```

Lokalny Supabase Studio (podgląd bazy): http://127.0.0.1:54323. `npx supabase stop` zatrzymuje kontenery.

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
- [`DEMO.md`](./DEMO.md) — procedura odtwarzania danych na instancji demo po nadpisaniu przez odwiedzającego.
- [`CLAUDE.md`](./CLAUDE.md) — instrukcje dla Claude Code (zasady twarde projektu, stack, konwencje).
