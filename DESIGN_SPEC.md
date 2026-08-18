# DESIGN_SPEC.md — specyfikacja wizualna i UX

> Dokument uzupełniający `SPEC.md`. Dotyczy wyłącznie warstwy prezentacji — logika biznesowa,
> import, walidacja i struktura raportów pozostają bez zmian.

## Kontekst i odbiorca

Aplikacja to **narzędzie wewnętrzne** do codziennej pracy analitycznej, nie interfejs
prezentowany klientom zewnętrznym (bankom/SKOK-om — one są tematem raportów, nie użytkownikami).

Odbiorcy: obecnie właściciel firmy, docelowo także sprzedawcy i dział obsługi klienta.
Priorytet: **gęstość informacji i szybkość skanowania wzrokiem** nad minimalistycznym
"powietrzem" typowym dla prezentacyjnych UI. Styl referencyjny: wewnętrzne dashboardy
analityczne (Linear, Metabase, Retool) — zwarte, czytelne, bez ozdobników.

---

## 1. Tokeny wizualne (zastosować globalnie, raz)

- **Typografia**: wyraźna skala — nagłówek sekcji / etykieta kolumny / dane. Obecnie wszystko
  ma tę samą wagę (patrz ekran importu: "Historia importów" == treść tabeli). Nagłówki sekcji
  (`H2`/`H3`) muszą być jednoznacznie cięższe/większe niż zawartość kart.
- **Pasek górny (topbar)**: obniżyć wagę wizualną adresu e-mail zalogowanego użytkownika
  (najmniej istotna informacja, zajmuje najwięcej miejsca) na rzecz linków nawigacyjnych.
- **Tabele**:
  - liczby wyrównane do prawej,
  - naprzemienne subtelne tło wierszy (zebra) lub wyraźniejszy separator wierszy,
  - nagłówek kolumny przyklejony (`sticky`) przy przewijaniu długich list.
- **Statusy (sukces / błąd)**: obecnie rozróżnione wyłącznie słowem, ten sam kolor tekstu.
  Wprowadzić plakietkę (badge) z tłem — błąd musi rzucać się w oczy natychmiast, bez czytania.
- **Input pliku** (ekran importu): input plikowy przeglądarki wygląda nieostylowany na tle
  reszty UI — potrzebuje spójnej otoczki wizualnej z przyciskiem "Wczytaj".
- **Puste przestrzenie w kartach**: karty na ekranie startowym są szersze niż potrzebuje treść —
  przy narzędziu do codziennej pracy lepiej wykorzystać przestrzeń na więcej danych niż zostawiać
  pustą.

---

## 2. Priorytety zmian (wg kosztu/efektu, z myślą o pozostałym czasie do deadline'u)

### P0 — szybkie, czysto kosmetyczne (CSS/tokeny, bez zmian struktury komponentów)
- Hierarchia typograficzna nagłówków sekcji.
- Plakietki statusu sukces/błąd w tabeli historii importów.
- Stylowanie inputu pliku + spójność z przyciskiem "Wczytaj".
- Wyrównanie liczb do prawej we wszystkich tabelach.
- Zmniejszenie nadmiarowego paddingu w kartach na ekranie startowym.

### P1 — strukturalne, ale ograniczone do jednego miejsca w kodzie (opłacalne)
- **Selektor okresu**: zamiana jednej rozwijanej listy "rrrr/mm" (kilkanaście pozycji) na
  dwa niezależne selektory: rok (dropdown) + miesiąc (dropdown lub 12 przycisków). Rozwiązuje
  problem funkcjonalny (przewijanie długiej listy), nie tylko wizualny.
- **Wyszukiwanie i sortowanie na tabelach klientów (raporty 12–15)**: dane są już wczytane
  po stronie klienta (max kilkaset wierszy), więc to filtr `filter()`/`sort()` w komponencie
  tabeli — bez zapytań do bazy. Napisane raz jako współdzielony komponent tabeli, działa
  we wszystkich czterech raportach naraz. Niski koszt, wysoki zysk użytkowy.
- **Kolumna "Dokumenty"**: przy kilku numerach faktur w jednej komórce tabela się rozjeżdża.
  Pokazywać liczbę dokumentów + rozwinięcie pełnej listy na hover/klik (tooltip lub popover)
  zamiast wypisywania wszystkich numerów inline.

### P1 — Słownik klientów (priorytet wysoki: blokuje praktyczne użycie przy 460 rekordach)
- **Wyszukiwanie substringowe** po nazwie/NIP: dopasowanie musi działać dla ciągu znaków
  w DOWOLNYM miejscu nazwy, nie tylko na początku (np. "Bank" ma znaleźć zarówno "Bank
  Spółdzielczy…", jak i "Nadwiślański Bank Spółdzielczy"). Implementacyjnie: `includes()`,
  nie `startsWith()`. Filtr po stronie klienta (dane już wczytane), więc koszt niski.
- **Sortowanie** kolumn NIP / Nazwa / Typ (rosnąco/malejąco).
- **Operacje zbiorcze**: checkbox przy każdym wierszu + "zaznacz wszystkie" (uwzględniające
  aktualny filtr wyszukiwania), następnie akcja "ustaw typ dla zaznaczonych" jednym kliknięciem.
  Przy 460 nieskategoryzowanych klientach ręczne ustawianie typu pojedynczo w 460 dropdownach
  jest niepraktyczne — to najbardziej opłacalna zmiana na tym ekranie, ważniejsza niż wygląd.
- **Wskaźnik "nieokreślony"**: obecnie całe wiersze bez typu podświetlone na żółto — działa
  dobrze, gdy większość listy jest już skategoryzowana (rzuca się w oczy, co zostało). Utrzymać
  to zachowanie: podświetlenie znika automatycznie, gdy tylko typ zostanie ustawiony, więc lista
  z czasem "oczyszcza się" wizualnie w miarę uzupełniania.

### P2 — strukturalne, większy zakres (rozważyć świadomie, zależnie od czasu)
- **Nawigacja między 16 raportami**: zamiast jednego długiego scrolla — zakładki lub boczne
  menu grupujące raporty tematycznie, np.:
  - grupa A: Sprzedaż i przychody (raporty 1–11, 16),
  - grupa B: Klienci — szczegóły (raporty 12–15).

  Kliknięcie = przejście od razu do właściwego raportu bez przewijania przez poprzednie.
- **Zwijane sekcje (accordion) dla długich list** (raport 12 — do ok. 208 wierszy, raport 13 —
  kilkanaście): domyślnie pokazać np. pierwsze 10 wierszy + przycisk "pokaż wszystkie", albo
  całą sekcję zwiniętą z licznikiem w nagłówku (już częściowo obecnym, np. "12. Klienci z
  przychodem w miesiącu (208)").

  Uwaga: P2 dotyka struktury komponentów (routing/stan UI), nie tylko CSS — wycenić czas
  osobno i ewentualnie zrobić w węższym zakresie (np. tylko grupowanie zakładkami, bez
  accordionów) jeśli czas jest ograniczony.

### Poza zakresem tego sprintu (do `PLAN.md` → „poza zakresem”)
- Przeprojektowanie ekranu startowego na dashboard z kluczowymi danymi z ostatniego raportu
  i skrótami do innych stron. To zmiana funkcjonalna/architektury informacji, nie kosmetyczna —
  wymaga osobnej decyzji o zakresie i czasie, niezależnie od reszty tego dokumentu.
- Eksport do `.xlsx` — bieżąca wersja oceniona jako wystarczająca, brak zgłoszonych problemów.

---

## 3. Kolejność wdrożenia sugerowana dla Claude Code

1. Tokeny globalne (P0) — jeden przelot na współdzielonych stylach/komponentach bazowych.
2. Selektor okresu (P1) — izolowana zmiana, niski koszt.
3. Współdzielony komponent tabeli z wyszukiwaniem/sortowaniem (P1) — zastosować do raportów
   12–15 jednocześnie.
4. Słownik klientów (P1, priorytet wysoki): wyszukiwanie substringowe, sortowanie, operacje
   zbiorcze. Jeśli komponent tabeli z kroku 3 jest reużywalny, rozważyć wspólną bazę dla
   obu (tabela raportów + tabela słownika), doprecyzować z Claude Code przed implementacją.
5. Nawigacja między raportami (P2) — jeśli czas pozwala; w przeciwnym razie odłożyć do
   `PLAN.md` jako zadanie po deadline'ie kursu.

Zgodnie z przyjętą dyscypliną projektu: każda zmiana strukturalna (P1/P2) powinna być
odnotowana w `SPEC.md`/`PLAN.md` przed implementacją, nie w trakcie kodowania.
