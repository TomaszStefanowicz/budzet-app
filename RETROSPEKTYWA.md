# Retrospektywa — budzet-app

Podsumowanie procesu tworzenia projektu (zadanie 4.5 z `PLAN.md`). Nie jest wymagane do zaliczenia — to zapis dla mnie samego (i ewentualnie materiał do prezentacji): jak wyglądała praca z Claude Code, co wynikło ze specyfikacji napisanej z góry, i jakie decyzje zmieniły się w trakcie.

## 1. Punkt wyjścia: specyfikacja jako źródło prawdy

Projekt zaczął się od `SPEC.md` — dokumentu opisującego logikę biznesową (format pliku importowego, reguły walidacji, definicje 16 zestawień) napisanego przed pierwszą linią kodu. `CLAUDE.md` narzucał twardą zasadę: Claude nie wymyśla reguł biznesowych, tylko pyta, gdy specyfikacja jest niejednoznaczna, a każde nowe rozstrzygnięcie merytoryczne trafia do rejestru decyzji w `SPEC.md` V wraz z uzasadnieniem.

W praktyce ten rejestr urósł do **46 pozycji**. To najważniejsza obserwacja z całego procesu: specyfikacja napisana z góry, nawet dopracowana, nie przewidziała rzeczywistości danych. Prawie każde zetknięcie kodu z prawdziwym plikiem sprzedażowym (`local-data/Sprzedaz.xlsx`) ujawniało coś, czego dokument nie doprecyzował albo doprecyzował błędnie:

- reguła „flagi F/G wymagają ≥2 miesięcy rozliczenia" nie zgadzała się z rzeczywistą praktyką (V.29),
- reguła „brak historii = błąd, jeśli w pierwszych 12 miesiącach danych" była fałszywa, bo rzeczywista historia projektu sięga poza początek pliku importowego w sposób niemożliwy do oszacowania (V.31),
- definicja zestawienia 13 („brak przychodu w M+1 = wygasł i nie przedłużył") myliła klientów z jednomiesięczną, świadomą przerwą w dostępie z klientami, którzy faktycznie nie przedłużyli (V.43).

Wzorzec, który się powtarzał: **test na danych syntetycznych weryfikuje zgodność kodu z regułą; test na danych rzeczywistych weryfikuje, czy reguła jest poprawna.** Oba były potrzebne, do różnych rzeczy.

## 2. Jak wyglądała współpraca z Claude Code

**Sesje krok po kroku, nie jeden wielki prompt.** Praca była rozbita na zadania z `PLAN.md` (Etapy 0–4), każde małe i testowalne, z commitem po każdym działającym kroku. To pozwoliło wychwytywać problemy blisko miejsca ich powstania — np. złamanie `next build` przez rozszerzenia `.ts` w importach (zadanie 2.1) zostało znalezione i naprawione w tej samej sesji, nie kilka zadań później.

**Rola pytań zadawanych w prozie.** Przy pytaniach czysto biznesowych/domenowych (np. rozstrzygnięcie P5 o formacie eksportu, czy poufność danych obejmuje wszystkich klientów) odpowiedzi w swobodnym tekście działały lepiej niż wybór z listy opcji — użytkownik znał odpowiedź od razu i nie musiał jej tłumaczyć na z góry ustalone kategorie.

**Krytyczna weryfikacja, nie wykonywanie na ślepo.** Kilka razy propozycja (moja albo z `DESIGN_SPEC.md`) została zweryfikowana względem faktycznego stanu kodu przed przyjęciem szacunku czasu czy zakresu — np. przy 3.6–3.9 okazało się, że `ClientReportTable` już jest komponentem współdzielonym, więc jedna zmiana starczała na cztery raporty naraz.

**Auto mode jako druga linia obrony, nie przeszkoda.** Przy zadaniu 4.2 (uzupełnienie słownika klientów) automatyczny klasyfikator zablokował jedną pętlę wykonującą masowy zapis na współdzielonej instancji produkcyjnej. Słusznie — to był zapis na dane, do których dostęp mają realni użytkownicy. Rozwiązanie: te same zmiany w kilku mniejszych, jawnych krokach.

## 3. Incydenty i co z nich wynikło

Dwa incydenty bezpieczeństwa/prywatności, oba naprawione, oba pouczające:

1. **16.08 — realne dane trafiły na instancję demo.** Pomyłkowy upload `local-data/Sprzedaz.xlsx` (plik do lokalnego backtestu) na współdzieloną instancję pod publicznym linkiem. Naprawa: `TRUNCATE` czterech tabel i reimport danych syntetycznych. Wniosek zapisany jako decyzja V.41: backtest na danych rzeczywistych może się odbywać na tej instancji tylko w jawnie ograniczonym czasowo oknie, zamykanym przed jakimkolwiek dostępem osób trzecich.

2. **19.08 — zrzuty ekranu z danymi produkcyjnymi w publicznym repo.** `git add -A` bez przeglądu listy plików wciągnął folder ze zrzutami zawierającymi prawdziwe dane klientów. Naprawa: repo na private, `.gitignore`, `git filter-branch` na 87 commitach, force push. Ryzyko finalnie niskie (dane niepoufne), ale procedura — i przede wszystkim zasada **zawsze przeglądać `git status` po `git add -A`** — została zapisana na przyszłość.

Trzeci, mniej dramatyczny: utrata dostępu do konta właściciela na starcie projektu (Site URL w Supabase Auth wskazywał na `localhost`, reset hasła prowadził donikąd) — naprawione konfiguracją i nowym kontem.

Wspólny mianownik wszystkich trzech: żaden nie wynikał z logiki biznesowej aplikacji. Wszystkie były operacyjne — obchodzenie się z jedyną, współdzieloną instancją produkcyjnej/demo bazy danych. To najbardziej dotkliwe ograniczenie architektury dwutygodniowego projektu: brak osobnego środowiska stagingowego oznaczał, że każdy test na realnych danych był testem *na produkcji*.

## 4. Co się zmieniło względem pierwotnego zakresu

- **Zestawienia 13–15** (najbardziej złożone, oparte o reguły horyzontu) świadomie odłożone w Etapie 2 jako cel rozszerzony (V.37), potem zrealizowane w całości, gdy tempo pracy w Etapie 1 i 3 okazało się szybsze niż szacowano.
- **Archiwum zestawień** (4.1) miało być zapisem bez podglądu — użytkownik poprosił o przeglądarkę migawek (`/archive`, 4.1a) i to trafiło do zakresu.
- **Konto dla organizatorów kursu** (4.3) — zaplanowane, ale finalnie niepotrzebne: dokumentacja szkolenia wymagała tylko podania danych logowania do istniejącego konta właściciela w prezentacji, nie osobnego konta. README zostało dostosowane tak, by hasło nigdy nie trafiło do publicznego repozytorium.
- **Zestawienie 13** — świadomie pozostawione jako jedna definicja („wygasł i nie przedłużył"), z zapisanym pytaniem otwartym (P7) o rozbicie na dwa osobne zestawienia po zaliczeniu.
- **Import przyrostowy** — rozważony jako rozwiązanie problemu niewidocznej historii klientów (V.31) i odrzucony: złamałby fundamentalną zasadę importu całościowego przy 14-dniowym terminie. Zanotowany jako dobry kandydat na rozszerzenie po zaliczeniu.

## 5. Liczby

- 46 decyzji w rejestrze `SPEC.md` V, z czego około 10 to korekty pierwotnej specyfikacji po konfrontacji z danymi rzeczywistymi, resztę uzupełnienia.
- 3 pliki syntetyczne wygenerowane deterministycznie (seed stały), 2 warianty (czysty / z celowymi błędami), 500 klientów masowych + 11 zaszytych przypadków brzegowych.
- 2 incydenty bezpieczeństwa/prywatności, oba naprawione tego samego dnia wykrycia.
- 16 zestawień, wszystkie zrealizowane (nie tylko zredukowany zakres 1–12+16 pierwotnie planowany na wypadek braku czasu).
- Projekt oddany 2026-08-21, dwa dni przed terminem (2026-08-23).
