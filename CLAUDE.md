# CLAUDE.md — instrukcje dla Claude Code

Ten plik jest wczytywany automatycznie na starcie każdej sesji. Przeczytaj go w całości przed pierwszą zmianą w kodzie.

---

## 1. Czym jest ten projekt

Aplikacja webowa do raportowania danych sprzedażowych i przychodowych spółki (SaaS B2B, klienci m.in. banki i SKOK-i). Dane wchodzą **wyłącznie przez import pliku .xlsx** przygotowanego z arkusza „Sprzedaż". Aplikacja waliduje plik, zapisuje pozycje do bazy i generuje 16 zestawień.

**Aplikacja jest narzędziem raportowym, nie źródłem prawdy.** Źródłem prawdy pozostają księgi rachunkowe. Z tego wynika najważniejsze ograniczenie funkcjonalne: **aplikacja nie ma i nie będzie miała funkcji ręcznego wprowadzania ani edycji danych rozliczeniowych.** Korekty robi się w pliku źródłowym i importuje ponownie. Jedyne dane edytowalne w aplikacji to atrybut typu klienta w słowniku (bank / SKOK / inny).

Projekt realizowany jest jako praca zaliczeniowa kursu vibe codingu, z terminem 14 dni. Priorytetem jest działająca, poprawnie licząca aplikacja dostępna publicznie pod linkiem — nie kompletność funkcji.

---

## 2. Dokumenty projektu

| Plik | Rola | Kiedy czytać |
|---|---|---|
| `SPEC.md` | **Źródło prawdy dla logiki biznesowej.** Reguły walidacji, definicje wszystkich 16 zestawień, rejestr decyzji projektowych z uzasadnieniami. | **Obowiązkowo** przed implementacją lub zmianą importu, walidacji i zestawień. Czytaj konkretne sekcje, nie z pamięci. |
| `PLAN.md` | Etapy i zadania rozpisane pod sesje. Zawiera też listę pytań otwartych. | Na starcie sesji — ustal, które zadanie realizujesz. Odhaczaj ukończone. |
| `README.md` | Wizytówka repozytorium dla człowieka. Powstaje w Etapie 4. | — |

---

## 3. Stack — ustalony, nie zmieniaj bez pytania

- **Język:** TypeScript
- **Framework:** Next.js (App Router) — frontend i API w jednym projekcie
- **Baza:** Supabase (Postgres)
- **Autoryzacja:** Supabase Auth (email + hasło)
- **Klient bazy:** `supabase-js`
- **Parsowanie .xlsx:** SheetJS (`xlsx`)
- **Hosting:** Vercel, automatyczny deploy z gałęzi `main`
- **Repozytorium:** GitHub
- **Testy:** Vitest

Jeżeli uważasz, że zadanie wymaga dodatkowej biblioteki — **zapytaj, zanim ją dodasz**, i uzasadnij. Każda zależność to koszt utrzymania i ryzyko przy deployu.

---

## 4. Zasady twarde

**Logika biznesowa**
1. **Nie wymyślaj reguł biznesowych.** Jeśli `SPEC.md` czegoś nie precyzuje lub jest niejednoznaczny — zatrzymaj się i zapytaj. Nie wybieraj „rozsądnej" interpretacji po cichu.
2. Każde nowe rozstrzygnięcie merytoryczne dopisz do rejestru decyzji w `SPEC.md` (sekcja V) razem z uzasadnieniem.
3. Nie upraszczaj reguł walidacji, żeby test przeszedł. Jeśli test nie przechodzi, problem jest w kodzie albo w specyfikacji — nie w regule.

**Supabase**
4. Używamy **wyłącznie trzech elementów**: Postgres, Auth, panel podglądu danych. **Nie wprowadzaj** Edge Functions, Realtime, Storage, ani rozbudowanych polityk RLS. Aplikacja ma jednego użytkownika-właściciela danych; dostęp odcinany jest na poziomie Auth i warstwy API.
5. **Schemat bazy tylko przez pliki migracji SQL** w `supabase/migrations/`. Nigdy nie instruuj zmiany schematu klikaniem w panelu — struktura bazy musi być odtwarzalna z repozytorium.
6. Klucz `service_role` używany jest wyłącznie w kodzie serwerowym. Nigdy nie może trafić do kodu klienta ani do repozytorium.

**Dane i liczby**
7. **Kwoty:** w bazie `NUMERIC(14,2)`. W obliczeniach **nigdy nie używaj typu float** — operuj na liczbach całkowitych (grosze) i zaokrąglaj wyłącznie na wyjściu. Błędy zaokrągleń w narzędziu raportującym dla funduszy są niedopuszczalne.
8. **Tożsamość klienta wyłącznie po NIP / numerze VAT UE**, nigdy po nazwie.
9. **Dane demo są wyłącznie syntetyczne.** Nigdy nie generuj, nie zapisuj i nie commituj danych przypominających rzeczywistych klientów spółki. Generator danych testowych musi produkować oczywiście fikcyjne nazwy.
10. Miesiąc sprzedaży ustalany jest **wyłącznie z segmentu `rrrr/mm` numeru dokumentu**, nigdy z daty pliku ani z kolumn miesięcznych.
11. Zakres kolumn miesięcznych jest **wykrywany dynamicznie**. Nie zakładaj żadnej ostatniej kolumny (dziś dane sięgają grudnia 2027, ale to się zmienia).

**Praca z repozytorium**
12. **Commit po każdym działającym kroku.** Komunikaty commitów po polsku, zwięzłe, w trybie oznajmującym („dodaje walidacje flag F/G/H/I").
13. Nie refaktoryzuj kodu poza zakresem aktualnego zadania. Jeśli widzisz coś do poprawy — zgłoś, nie rób.
14. Sekrety tylko w `.env.local`, który jest w `.gitignore`. Zmienne produkcyjne ustawiane w panelu Vercela.
15. Przed zakończeniem zadania uruchom `npm run build` i `npm test`. Zadanie, które nie buduje się lokalnie, nie jest ukończone.

**Testy**
16. Każda reguła walidacji z `SPEC.md` II.3 i każde zestawienie z `SPEC.md` III ma mieć test jednostkowy. Specyfikacja przekłada się na testy niemal 1:1 — korzystaj z tego.
17. Fixture testowy to plik „golden file" z danymi syntetycznymi zawierający wszystkie przypadki brzegowe (patrz `PLAN.md`, Etap 0).

---

## 5. Komendy

```bash
npm run dev        # serwer developerski
npm run build      # build produkcyjny — uruchom przed zakończeniem zadania
npm test           # testy jednostkowe
npm run lint       # lint
```

Deploy: `git push` na `main` → automatyczny deploy na Vercel. Nie ma osobnej komendy deployu.

---

## 6. Konwencje

- **Komunikacja ze mną: po polsku.** Identyfikatory w kodzie, nazwy tabel i kolumn: po angielsku. Teksty widoczne w interfejsie i komunikaty błędów walidacji: po polsku.
- Komunikat błędu walidacji musi zawsze wskazywać **numer wersu w pliku źródłowym i przyczynę** — użytkownik poprawia dane w Excelu, więc bez numeru wersu komunikat jest bezwartościowy.
- Warstwa logiki biznesowej (walidacja, agregacje, zestawienia) w `lib/` jako **czyste funkcje bez dostępu do bazy** — dzięki temu są testowalne bez Supabase. Dostęp do bazy tylko w warstwie API.

---

## 7. Czego nie robić

- Nie dodawaj ręcznego CRUD-a na danych rozliczeniowych.
- Nie dodawaj importu przyrostowego. Import jest zawsze całościowy: plik zastępuje poprzedni stan.
- Nie dodawaj interaktywnych decyzji w trakcie importu („pominąć ten wers?"). Import musi być deterministyczny i odtwarzalny.
- Nie wnioskuj statusu nowy/przedłużający z danych. Decydują wyłącznie flagi w pliku źródłowym; ich spójności pilnuje walidacja.
- Nie próbuj wykrywać typu klienta (bank/SKOK) z nazwy. To atrybut słownika.
- Nie dodawaj funkcji „na przyszłość". Zakres MVP jest w `PLAN.md`; wszystko poza nim czeka.
