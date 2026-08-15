# PLAN.md — plan realizacji

**Termin:** 14 dni. **Deadline:** 2026-08-23.

Zadania odhaczamy w trakcie pracy (`[x]`). Każda sesja z Claude Code zaczyna się od: *„przeczytaj PLAN.md, realizujemy zadanie X"*.

**Zasada nadrzędna:** kończymy etap dopiero wtedy, gdy jego kryterium ukończenia jest spełnione i zmiany są w `main` (czyli na produkcji). Nie przechodzimy dalej z „prawie działającym" etapem — przy imporcie i zestawieniach dług techniczny mści się natychmiast.

---

## Etap 0 — Fundament (dni 1–2)

Cel: działający publiczny link i wszystko, co potrzebne, żeby dalej pisać już tylko logikę.

- [x] **0.1** Repozytorium na GitHubie, pierwszy commit z `CLAUDE.md`, `SPEC.md`, `PLAN.md`.
- [x] **0.2** Szkielet Next.js + TypeScript, konfiguracja Vitest, `.gitignore` z `.env.local`.
- [x] **0.3** Projekt Supabase, podpięcie do Vercela, zmienne środowiskowe.
**[UZUPEŁNIENIE] Zadanie 0.4 rozbite na mniejsze kroki (podejście „chodzący szkielet")** — zamiast jednej migracji ze wszystkimi tabelami z `SPEC.md` IV.5 na raz, budujemy jedną cienką, ale kompletną ścieżkę (baza → logowanie → ekran podglądu) i dopiero sprawdzoną rozszerzamy. Pozostałe tabele (`clients`, `revenue_items`, `revenue_months`) powstają w Etapie 1, gdy import faktycznie ich potrzebuje; `report_archive` — w Etapie 4.

- [x] **0.4a** Migracja SQL: tabela `imports` (metryki importu — data, nazwa pliku, liczba wersów, wynik walidacji, zakres wykrytych miesięcy). Struktura bazy powstaje z pliku, nie z panelu.
- [x] **0.5** Deploy na Vercel z gałęzi `main`. **Publiczny link musi działać.** → https://budzet-app-sigma.vercel.app
- [x] **0.6** Supabase Auth: strona logowania, middleware blokujący wszystkie pozostałe ścieżki, rejestracja samodzielna wyłączona. Konto właściciela.
- [x] **0.4b** Prosty ekran podglądu (po zalogowaniu) czytający z tabeli `imports` — potwierdzenie, że przeglądarka → API → baza działają razem, zanim dołożymy kolejne tabele.
- [x] **0.7** **Generator danych syntetycznych** (`scripts/generate-synthetic-data.ts`) produkujący plik `.xlsx` zgodny z `SPEC.md` II — dane oczywiście fikcyjne, z wszystkimi przypadkami brzegowymi z `SPEC.md` VI.9. Dwa tryby: `npm run generate:data` (czyste dane, do demo) i `npm run generate:data -- --with-errors` (golden file z celowymi błędami, do testów). Wyniki w `test-data/`.
- [x] **0.8** Plik testowy z prawdziwej struktury: rzeczywisty wycinek danych, z podmienionymi danymi 3 klientów objętych NDA (`SPEC.md` V.25) — **do użytku wyłącznie lokalnego**, w `local-data/` (gitignored), nigdy commitowany. Potrzebny do backtestu w Etapie 2. → `local-data/Sprzedaz.xlsx`

**Kryterium ukończenia:** wchodzę na publiczny link, loguję się, widzę ekran podglądu importów (na razie pusty). `npm test` przechodzi. Mam plik syntetyczny i plik do backtestu.

---

## Etap 1 — Import i walidacja (dni 3–5)

Cel: serce aplikacji. To tu kryje się największe ryzyko z decyzji V.5 — „policzy błędnie, ale wiarygodnie".

**[UZUPEŁNIENIE] Kolejność zadań — chodzący szkielet, potem warstwy walidacji.** Zamiast całej logiki najpierw i ekranu na końcu (jak w pierwotnym rozpisaniu), najpierw budujemy minimalny, ale kompletny szkielet uploadu (1.1) — testowalny ręcznie od razu plikiem syntetycznym — a dopiero na nim dokładamy kolejne warstwy walidacji, każdą z automatycznymi testami i widoczną natychmiast na ekranie.

- [x] **1.0** Migracja SQL: tabele `clients`, `revenue_items`, `revenue_months` (`SPEC.md` IV.5) — dokładane teraz, bo import ich potrzebuje.
- [x] **1.1** Minimalny endpoint API + ekran uploadu: przyjmuje plik `.xlsx`, parsuje strukturalnie (SheetJS) — odczyt kolumn A–I, **dynamiczne wykrywanie zakresu kolumn miesięcznych** (`SPEC.md` II.2, II.4) — **bez walidacji reguł biznesowych na tym etapie**. Ekran pokazuje liczbę odczytanych wersów i wykryty zakres miesięcy. Parser jako czysta funkcja w `lib/`, bez dostępu do bazy. Testy. **Testowalne ręcznie od razu.** → zweryfikowane ręcznie na obu plikach syntetycznych (1127 / 1134 wersów, zakres 2024/01–2027/12).
- [x] **1.2** Walidacja struktury: układ kolumn, format numeru dokumentu `TYP/rrrr/mm/nnnn`, format kwot, puste komórki miesięcy jako 0. Testy do każdej reguły. Błędy widoczne na ekranie uploadu. → zweryfikowane ręcznie lokalnie: plik syntetyczny czysty przechodzi bez błędów, plik z celowymi błędami odrzucony w całości z czytelnym raportem (numer wersu + przyczyna). Doprecyzowania zakresu (flaga I, wartość flagi =1, ciągłość lp, format NIP/VAT UE) zapisane w `SPEC.md` V.25.
- [x] **1.3** Walidacja typów dokumentów (`SPEC.md` II.3.h) i reguł flag (II.3.a–f): dokładnie jedna flaga, FKS bez flag, FVZK tylko H lub I, FKS z wartościami ujemnymi. Testy. → zweryfikowane ręcznie lokalnie: plik syntetyczny czysty przechodzi bez błędów, plik z celowymi błędami wykrywa dodatkowo nieznany typ dokumentu (NIP 1000000087). Reguła długości pakietu (F/G ≥ 2 miesiące, I dokładnie 1 miesiąc, H bez ograniczeń) zaimplementowana i opisana w `SPEC.md` V.27. Powroty po 11/13 miesiącach z błędną flagą — poza zakresem, to zadanie 1.4.
- [ ] **1.4** Walidacja spójności flag F/G — okno 12 miesięcy per NIP z regułą horyzontu (`SPEC.md` II.3.g). **Najtrudniejsza reguła w projekcie.** Osobna sesja, testy dla obu stron granicy: powrót po 11 miesiącach (błąd) i po 13 (poprawne), oraz flaga G na początku horyzontu (poprawne).
- [ ] **1.5** Ujednolicenie raportu błędów: wszystkie problemy jednocześnie, każdy z numerem wersu i przyczyną, komunikaty po polsku (`SPEC.md` VI.4).
- [ ] **1.6** Zapis do bazy: import całościowy zastępujący stan, metryki importu, aktualizacja słownika klientów (nowi klienci z typem „nieokreślony").
- [ ] **1.7** Domknięcie ekranu uploadu: historia importów, pełny raport błędów, integracja z ekranem z zadania 0.4b. Test end-to-end: plik syntetyczny wchodzi, plik z błędami jest odrzucany z czytelnym raportem.

**Kryterium ukończenia:** na produkcji importuję plik syntetyczny i widzę dane w panelu Supabase. Importuję plik z błędami i dostaję listę wszystkich błędów z numerami wersów. Import tego samego pliku dwukrotnie daje identyczny stan bazy.

---

## Etap 2 — Silnik zestawień (dni 6–8)

- [ ] **2.1** Warstwa agregacji per klient (`SPEC.md` 11a): miesięczne serie przychodów per NIP, z regułą „przychód > 0" i podziałem na serie dla zestawień 12 oraz 13–15. Czyste funkcje, testy.
- [ ] **2.2** Zestawienia 1–11 (`SPEC.md` III.A) + wyodrębniona pozycja „korekty" (decyzja V.10). Test kontrolny: sumy kategorii flagowych + korekty = suma całkowita.
- [ ] **2.3** Zestawienie 12 — liczba i lista klientów z przychodami, z sumą faktur i numerami dokumentów.
- [ ] **2.4** Zestawienie 13 — wygasające umowy, **z regułą horyzontu `SPEC.md` 13.d** i kwotą przychodów z miesiąca POPRZEDNIEGO (13.b.v). Testy obu warunków granicznych.
- [ ] **2.5** Zestawienia 14 i 15 — startujące umowy nowe i przedłużenia, z regułą horyzontu.
- [ ] **2.6** Zestawienie 16 — banki i SKOK-i na podstawie słownika.
- [ ] **2.7** **BACKTEST.** Na pliku z zadania 0.8, lokalnie: porównanie wyników aplikacji z dotychczasowymi ręcznymi zestawieniami za minimum 3 miesiące. Każda rozbieżność wyjaśniona i zapisana. Rozbieżność może oznaczać błąd aplikacji **albo błąd procedury ręcznej** — oba warto wiedzieć.

**Kryterium ukończenia:** wszystkie 16 zestawień liczy się poprawnie, backtest zamknięty, rozbieżności wyjaśnione.

---

## Etap 3 — Interfejs (dni 9–11)

- [ ] **3.1** Ekran importu: upload, historia importów z metrykami, czytelny raport błędów.
- [ ] **3.2** Słownik klientów: lista, edycja typu (bank / SKOK / inny), **wyróżnienie klientów z typem „nieokreślony"**.
- [ ] **3.3** Widoki zestawień: wybór miesiąca, tabele, listy klientów w zestawieniach 12–16.
- [ ] **3.4** Eksport zestawień do `.xlsx` (`SPEC.md` VI.5).
- [ ] **3.5** Nawigacja, komunikaty stanu, obsługa błędów w interfejsie.

**Kryterium ukończenia:** przechodzę pełną ścieżkę w przeglądarce na produkcji: logowanie → import → uzupełnienie słownika → przegląd zestawień → eksport.

---

## Etap 4 — Domknięcie i bufor (dni 12–14)

- [ ] **4.1** Archiwum wygenerowanych zestawień (`SPEC.md` IV.3), w tym migracja SQL dla tabeli `report_archive`.
- [ ] **4.2** Instancja demo: zasilenie danymi syntetycznymi, uzupełniony słownik, wygenerowane zestawienia — organizator po zalogowaniu widzi działający produkt, nie pustą bazę.
- [ ] **4.3** Konto dla organizatorów kursu.
- [ ] **4.4** `README.md`: co to jest, link do aplikacji, dane logowania demo, stack, jak uruchomić lokalnie, uwaga o danych syntetycznych.
- [ ] **4.5** Dokumentacja procesu na zaliczenie: jak wyglądała praca z Claude Code, co wynikło ze specyfikacji, jakie decyzje zmieniły się w trakcie.
- [ ] **4.6** Odpauzowanie Supabase i sprawdzenie linku **dzień przed** oddaniem (`SPEC.md` VI.7).
- [ ] **4.7** Bufor na poprawki. **Nienegocjowalny — coś zawsze się przesunie.**

---

## Pytania otwarte

Do rozstrzygnięcia w trakcie; każde rozstrzygnięcie dopisujemy do rejestru decyzji w `SPEC.md`.

- [ ] **P1** Czy zestawienia mają być liczone na żądanie, czy zapisywane do archiwum przy imporcie? (Wpływa na 4.1. Rekomendacja: liczone na żądanie, archiwum jako zapis migawki.)
- [x] **P2** Czy pierwszy wers pliku to zawsze nagłówek z nazwami miesięcy w formacie rozpoznawalnym maszynowo? Jeśli nie — zakres miesięcy trzeba wykrywać po pozycji kolumny J = styczeń 2024 i liczyć w przód. → **Rozstrzygnięte:** plik importowy ma zawsze dokładnie jeden wiersz nagłówkowy; zakres miesięcy wykrywany wyłącznie pozycyjnie (patrz `SPEC.md` V.23).
- [ ] **P3** Co z klientem, który zmienił NIP (przekształcenie spółki)? Dziś: dwaj różni klienci. Czy to akceptowalne?
- [ ] **P4** Czy w zestawieniu 13 interesują Cię tylko wygaśnięcia w oknie „bieżący miesiąc + 3", czy dowolny miesiąc historyczny do analizy?
- [ ] **P5** Czy eksport `.xlsx` ma odwzorowywać układ dotychczasowych sprawozdań dla funduszy, czy wystarczy surowa tabela?

---

## Dziennik projektu

Krótkie notatki po każdej sesji: co zrobione, co zaskoczyło, co wymagało poprawki. Materiał na dokumentację z zadania 4.5.

| Dzień | Etap / zadanie | Notatka |
|---|---|---|
| 2026-08-15 | 1.2 | Utrata dostępu do konta właściciela (zgubione hasło, Site URL w Supabase Auth wskazywał na localhost — reset hasła prowadził donikąd). Naprawiono ustawienie Site URL, stare konto usunięto, założono nowe. Przy okazji implementacji walidacji struktury dopisano do SPEC.md (II.5, V.25) reguły doprecyzowane z użytkownikiem (m.in. suma kontrolna NIP, wymóg wartości `1` we fladze). Test ujawnił błąd we własnej regule walidacji VAT UE (akceptowała czyste litery zamiast wymagać cyfr) — poprawiono przed pushem. |
| 2026-08-15 | 1.3 | Osobny moduł (`validateFlagRules.ts`) na typ dokumentu i spójność flaga↔liczba miesięcy — reguła flagi H (SPEC.md V.27) doprecyzowana z użytkownikiem: brak ograniczenia liczby miesięcy, w przeciwieństwie do F/G (≥2) i I (dokładnie 1). Wynik obu walidatorów (1.2 + 1.3) połączony w jeden raport błędów w `/api/import`, zgodnie z zasadą "wszystkie błędy naraz" (II.3.i). Przy tej samej edycji poprawiono lukę w numeracji rejestru decyzji SPEC.md (przypadkowo pominięty numer 25 z poprzedniej sesji). |
