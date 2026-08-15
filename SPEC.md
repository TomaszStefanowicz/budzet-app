# SPEC.md — specyfikacja aplikacji budżetowo-raportowej

**Status:** wersja 1.0, na start implementacji
**Rola dokumentu:** źródło prawdy dla logiki biznesowej. Kod ma być zgodny z tym dokumentem; jeśli kod i dokument się rozjeżdżają, poprawia się jedno albo drugie — nigdy nie zostawia się rozbieżności.

Fragmenty oznaczone **[UZUPEŁNIENIE]** zostały dodane lub zmienione względem pierwotnego opisu projektu. Ich lista jest w sekcji VII.

---

## I. Kontekst

1. Informacja, że dane dotyczące liczby klientów wykorzystywane są w raportach dla funduszy, jest uproszczeniem. Wykorzystywane są również w informacjach dla obsługi klienta, sprzedawców oraz przy podejmowaniu decyzji. Obowiązki raportowe z umowy inwestycyjnej wymuszają tylko ich strukturyzowanie i prezentowanie w określonej formie.

2. Fundusze nie są problematycznym odbiorcą — współpraca trwa 5 lat:
   - **Fundusz główny** — zespół około czterdziestolatków ze środkami z PFR. Zaangażowani, ale nie finansiści i nie księgowi. Do analizy danych przywiązują niezbyt dużą wagę; bazują na rozmowach w trakcie comiesięcznych spotkań, a w razie potrzeby dzwonią, zamiast prosić o dodatkowy raport. Ich głównym partnerem w rozmowach jest wspólnik odpowiadający za sprzedaż i marketing. Istnieje uzasadnione przypuszczenie, że części z 14 obowiązkowych sprawozdań (2 miesięczne, 1 kwartalne, 1 roczne) nie czytają.
   - **Fundusz wspierający** — doświadczony przedsiębiorca, który zbudował i sprzedał dużą firmę (wcześniej klienta spółki), a środki ze sprzedaży zainwestował m.in. w spółkę. Koncentruje się na strategii. Sprawozdań miesięcznych nie czyta. Uczestniczy w pracach nad budżetem i weryfikuje sprawozdania kwartalne, ale istotne dla niego są ogólne trendy.

3. Dochodzą do tego odpowiedzi na pytania potencjalnych inwestorów kolejnej rundy.

4. **Głównym użytkownikiem danych jest właściciel projektu.** Struktura danych sprzedażowych nie ulegnie przypadkowej zmianie (budżet przyjmowany uchwałą wspólników, zasady rachunkowości uchwałą zarządu w porozumieniu z biurem księgowym), natomiast zakres „wyciąganych" danych będzie się zmieniał. Rozszerzanie zestawień ma być możliwe bez przebudowy aplikacji.

5. **Aplikacja jest narzędziem raportowym, nie źródłem prawdy.** Źródłem prawdy pozostają księgi (dane z KSeF, biuro księgowe), narzędziem kontrolnym budżet. Dane trafiają do aplikacji WYŁĄCZNIE przez import pliku przygotowanego z arkusza „Sprzedaż" — aplikacja nie posiada funkcji ręcznego wprowadzania ani edycji danych rozliczeniowych. Korekty danych wykonuje się zawsze w pliku źródłowym i importuje ponownie.

---

## II. Układ pliku źródłowego (arkusza „Sprzedaż")

W uproszczeniu, po odrzuceniu dodatkowych zbędnych wersów i kolumn.

### 1. Wersy

Po wersach nagłówkowych każdy kolejny wers oznacza kolejną pozycję przychodową. Jedna faktura może zajmować kilka wersów, jeżeli pozycje z faktury rozliczane są w różnych miesiącach. Przykładowo na jednej fakturze mogą znaleźć się w dwóch odrębnych pozycjach: prace developerskie z terminem wykonania w jednym konkretnym miesiącu oraz roczny dostęp do platformy rozliczany przez 12 lub 13 miesięcy (np. od 10 dnia w pierwszym miesiącu do 9 dnia w ostatnim).

### 2. Kolumny

| Kolumna | Zawartość |
|---|---|
| A | liczba porządkowa |
| B | nazwa klienta |
| C | NIP (dla podmiotów zagranicznych bez polskiego NIP: numer VAT UE) |
| D | numer dokumentu w formacie `TYP/rrrr/mm/nnnn` |
| E | wartość netto rozliczanej pozycji |
| F | flaga: klient nowy |
| G | flaga: klient przedłuża |
| H | flaga: klient dokupuje |
| I | flaga: zakup incydentalny |
| J i dalsze | przychody w kolejnych miesiącach, od stycznia 2024 (kolumna J); zakres rośnie w czasie, aplikacja wykrywa go dynamicznie |

**Kolumna D — typy dokumentów:**
- `FVS` — faktura sprzedaży (standard)
- `FKS` — faktura korygująca
- `FVZ` — faktura zaliczkowa
- `FVZK` — faktura zaliczkowa końcowa

`rrrr/mm/nnnn` to rok (4 cyfry), miesiąc (2 cyfry) i numer w miesiącu (4 cyfry). **Miesiąc sprzedaży ustala się wyłącznie na podstawie segmentu `rrrr/mm` numeru dokumentu** (usługę uznajemy za sprzedaną z chwilą opłacenia = wystawienia faktury).

**Znaczenie flag:**
- **F (nowy)** — pierwsza faktura wystawiona przez spółkę dla tego klienta za podstawowy dostęp do platformy: pierwsza w historii klienta albo pierwsza po przerwie dłuższej niż 12 miesięcy od wygaśnięcia poprzedniego dostępu.
- **G (przedłużenie)** — kolejna (inna niż pierwsza) faktura za podstawowy dostęp do platformy.
- **H (dokupienie)** — faktura za dodatkowy dostęp do platformy: najczęściej dodatkowe konta (np. klient miał 200 kont, rozszerza do 250), ale też dodatkowy moduł (np. moduł ankiet).
- **I (incydentalny)** — zakup jednorazowy rozliczany w jednym miesiącu, nie generujący stałego strumienia przychodów: usługi developerskie, kręcenie filmów szkoleniowych, szkolenia tradycyjne.

### 3. Reguły flag F/G/H/I

a) Każdy wers ma **dokładnie jedną** flagę. Wyjątek: wers korekty (`FKS`) nie ma żadnej flagi.

b) Wers bez flagi (poza `FKS`) lub z więcej niż jedną flagą to **błąd danych** — import musi go zgłosić do poprawy w pliku źródłowym.

c) Pakiety miesięczne oznaczane są zawsze jako zakup incydentalny (I), ponieważ nie tworzą stałego strumienia przychodów. Flagi F/G dotyczą wyłącznie pakietów długoterminowych (kwartalnych, rocznych, dwuletnich — co najmniej 2 miesiące rozliczeń).

d) Wers incydentalny pozostaje incydentalny (I) również wtedy, gdy znajduje się na pierwszej fakturze klienta.

e) Faktura zaliczkowa (`FVZ`) otrzymuje flagę według schematu standardowego. Faktura zaliczkowa końcowa (`FVZK`) otrzymuje flagę H albo I.

f) Wers `FKS`: kolumny F–I puste, kolumna E zawiera ujemną wartość z faktury korygującej, kolumny miesięcy zawierają wartości ujemne niwelujące korygowany przychód.

g) **Walidacja flagi nowego klienta.** Import zgłasza błąd, jeżeli wers oznaczony jako:
   1. **nowy klient (F)** — należy do klienta (per NIP), którego wcześniejszy dostęp wygasł w okresie 12 miesięcy przed rozpoczęciem rozliczeń tego wersu;
   2. **klient przedłużający (G)** — należy do klienta (per NIP), którego poprzedni dostęp wygasł wcześniej niż 12 miesięcy przed rozpoczęciem rozliczeń tego wersu;
   3. reguły (i)–(ii) stosuje się z uwzględnieniem **horyzontu danych**: wers z flagą G bez widocznego wcześniejszego dostępu nie jest błędem, jeżeli jego rozliczenia rozpoczynają się w okresie 12 miesięcy od pierwszego miesiąca danych (poprzedni dostęp mógł wygasnąć przed horyzontem). Po tym okresie brak widocznej historii przy fladze G jest błędem.

h) Dokument o typie innym niż `FVS`/`FKS`/`FVZ`/`FVZK` jest błędem danych — **import zostaje odrzucony w całości** z raportem wskazującym wers i wartość. Poprawa następuje w pliku źródłowym.

i) **[UZUPEŁNIENIE] Klasyfikacja błędów.** Wszystkie błędy z pkt II.3 (brak flagi, wiele flag, nieznany typ dokumentu, niespójna flaga F/G, błędny format numeru dokumentu, błędny układ kolumn, niepoprawny format kwoty) są **błędami blokującymi: import zostaje odrzucony w całości.** Nie istnieje import częściowy. Uzasadnienie: import całościowy zastępuje stan bazy, więc przyjęcie pliku z pominiętymi wersami trwale zafałszowałoby wszystkie zestawienia. Raport błędów wskazuje wszystkie wykryte problemy jednocześnie (nie tylko pierwszy), aby użytkownik mógł poprawić plik w jednym przejściu.

### 4. Plik importowy

Do aplikacji importowany jest zawsze osobny plik przygotowany metodą kopiuj-wklej (tylko wartości, bez formuł) z arkusza „Sprzedaż", o sztywnym układzie:
- dokładnie jeden wiersz nagłówkowy nad danymi,
- kolumny A–I zgodnie z pkt II.2,
- kolumny miesięcy od kolumny J (styczeń 2024), kolejne miesiące w kolejnych kolumnach bez przerw,
- liczba kolumn miesięcy jest zmienna i rośnie w czasie — **aplikacja wykrywa zakres miesięcy dynamicznie, nie zakłada ostatniej kolumny**,
- kwoty: PLN netto, format liczbowy 0,00.

**[UZUPEŁNIENIE] Format pliku:** `.xlsx` (nie CSV). Uzasadnienie: eliminuje problem polskiego separatora dziesiętnego i kodowania znaków, oraz skraca ścieżkę użytkownika o krok konwersji. Puste komórki w kolumnach miesięcy traktowane są jako 0.

**[UZUPEŁNIENIE] Liczba wierszy nagłówkowych: zawsze dokładnie jeden.** Arkusz źródłowy „Sprzedaż" ma nad kolumnami miesięcy dwa scalone wiersze nagłówkowe (rok, potem miesiąc). Przy przygotowywaniu pliku importowego (kopiuj-wklej) redukowane są one zawsze do jednego prostego wiersza z nazwami kolumn — nigdy zera, nigdy dwóch. Uzasadnienie: przypisanie kolumn miesięcy do konkretnych miesięcy jest i tak wyłącznie pozycyjne (kolumna J = styczeń 2024, dalej kolejno bez przerw) — treść nagłówka nad kolumnami miesięcy nigdy nie jest parsowana programowo, służy wyłącznie człowiekowi. Liczba wierszy nagłówkowych musi być jednak stała, żeby parser mógł deterministycznie pominąć wiersz nagłówkowy przed odczytem danych, bez zgadywania.

### 5. [UZUPEŁNIENIE] Walidacja strukturalna pól (PLAN.md 1.2)

Każdy wers podlega poniższym regułom kształtu danych, niezależnie od walidacji typów dokumentów i reguł semantycznych flag opisanych w pkt II.3 (decyzja V.26 precyzuje rozstrzygnięcia podjęte przy tym zadaniu):

a) Kolumny A–E nie mogą być puste.
b) **Kolumna A (liczba porządkowa):** liczba całkowita, rosnąca kolejno o dokładnie 1 względem poprzedniego wersu. Wartość startowa dowolna — plik importowy bywa wycinkiem z większego arkusza, nie musi zaczynać się od 1.
c) **Kolumna B (nazwa klienta):** minimum 3 znaki po przycięciu białych znaków.
d) **Kolumna C (NIP / numer VAT UE):** polski NIP — dokładnie 10 cyfr z poprawną sumą kontrolną (wagi 6,5,7,2,3,4,5,6,7, modulo 11); numer VAT UE — dwie litery kodu kraju + od 2 do 12 cyfr, bez sprawdzania sumy kontrolnej per kraj. Myślniki i spacje w zapisie są przy sprawdzaniu ignorowane.
e) **Kolumna D (numer dokumentu):** kształt `TYP/rrrr/mm/nnnn` (rok 4 cyfry, miesiąc 01–12, numer 4 cyfry). Sama poprawność `TYP` względem listy znanych typów to osobna reguła (pkt II.3.h, zadanie PLAN.md 1.3).
f) **Kolumna E (wartość netto):** musi być liczbą, różną od zera. Wartość ujemna dozwolona wyłącznie gdy typ dokumentu (z kolumny D) to `FKS`.
g) **Kolumny F–I (flagi):** dokładnie jedna z czterech kolumn musi zawierać liczbę `1` (inna niepusta wartość to błąd formatu), pozostałe muszą być puste. Wers `FKS` nie może mieć ustawionej żadnej z flag (zgodnie z II.3.f).
h) **Kolumny miesięczne (J i dalej):** puste komórki = 0 (II.4). Każdy wers musi mieć przynajmniej jedną kolumnę miesięczną różną od zera — wers bez żadnego przychodu jest błędem.
i) **Układ pliku:** plik musi zawierać co najmniej 9 kolumn (A–I) oraz co najmniej jedną kolumnę miesięczną — w przeciwnym razie plik jest odrzucany jednym błędem układu kolumn, bez dalszej walidacji poszczególnych wersów.

Wszystkie powyższe błędy są blokujące (zgodnie z II.3.i) i zgłaszane jednocześnie, każdy z numerem wersu źródłowego.

---

## III. Zestawienia

### III.A. Zestawienia proste (dotychczas uzyskiwane formułami w Excelu)

1. **Liczba klientów, którzy zapłacili w danym miesiącu** — liczba wersów z pozycjami rozliczeniowymi w danym miesiącu minus powtarzający się klienci (per NIP). Klient liczony jest w zestawieniu tylko wtedy, gdy suma kolumn od F do I jego dokumentów z danego miesiąca > 0.
2. **Wartość sprzedaży w miesiącu** — suma wartości netto dla faktur wystawionych w danym miesiącu.
3. **Wartość sprzedaży w miesiącu — klienci nowi** — jak wyżej, dla wersów z flagą F.
4. **Wartość sprzedaży w miesiącu — klienci przedłużający** — jak wyżej, dla wersów z flagą G.
5. **Wartość sprzedaży w miesiącu — dokupienia** — jak wyżej, dla wersów z flagą H.
6. **Wartość sprzedaży w miesiącu — zakupy incydentalne** — jak wyżej, dla wersów z flagą I.
7. **Wartość przychodów w miesiącu** — suma wartości w kolumnie odpowiedniego miesiąca.
8. **Wartość przychodów w miesiącu — klienci nowi** — jak wyżej, dla wersów z flagą F.
9. **Wartość przychodów w miesiącu — klienci przedłużający** — jak wyżej, dla wersów z flagą G.
10. **Wartość przychodów w miesiącu — dokupienia** — jak wyżej, dla wersów z flagą H.
11. **Wartość przychodów w miesiącu — zakupy incydentalne** — jak wyżej, dla wersów z flagą I.

### III.B. Zestawienia złożone (dotychczas wymagające ręcznej obróbki)

#### 11a. Zasada agregacji

Zestawienia 12–15 obliczane są na **miesięcznych seriach przychodów zsumowanych per klient (per NIP)**, nie na wersach.

- Zestawienie 12 obejmuje **wszystkie** wersy.
- Serie zestawień 13–15 obejmują wersy z flagami F/G/H oraz wersy `FKS`; **wersy z flagą I nie wchodzą** do tych serii.
- Klient jest wykazywany w miesiącu wyłącznie wtedy, gdy jego zagregowany przychód miesiąca jest **większy od zera**.

#### 12. Liczba i lista klientów generujących przychody w danym miesiącu

a) **Definicja:** liczba klientów (per NIP) z przychodami w danym miesiącu, po wykluczeniu klientów powtarzających się.

b) **Procedura referencyjna (dotychczasowa, ręczna):**
   1. kopiowanie wszystkich danych do odrębnego arkusza z usunięciem formuł (tylko dane),
   2. usunięcie zbędnych kolumn,
   3. wysortowanie wszystkich wersów, w których w danym miesiącu występuje przychód,
   4. usunięcie zbędnych wersów,
   5. wyszukanie powtarzających się numerów NIP i usunięcie odpowiednich wersów, przy czym na tym etapie:
      - sumowane są wszystkie przychody danego klienta występujące w danym miesiącu,
      - sumowana jest wartość faktur odpowiadających przychodom, a ich numery przenoszone do jednej kolumny (żeby można było zweryfikować, czego dotyczą).

c) **[UZUPEŁNIENIE] Wynik w aplikacji:** liczba klientów + lista pozycji zawierająca: NIP, nazwę klienta, zagregowany przychód miesiąca, sumę wartości odpowiadających faktur, listę numerów faktur.

#### 13. Liczba i lista klientów, których umowy wygasają w danym miesiącu oraz trzech kolejnych miesiącach

Miesięcznie sporządzane jest zestawienie dla jednego miesiąca przypadającego za 3 miesiące od bieżącego (dla wcześniejszych miesięcy zestawienia już istnieją).

a) **Definicja:** liczba klientów (per NIP) z przychodami rozliczanymi międzyokresowo, wygasającymi w odpowiednim miesiącu, po wykluczeniu klientów powtarzających się.

b) **Procedura referencyjna (dotychczasowa, ręczna):**
   1. kopiowanie wszystkich danych do odrębnego arkusza z usunięciem formuł,
   2. usunięcie zbędnych kolumn,
   3. wysortowanie wszystkich wersów, w których w danym miesiącu oraz miesiącu poprzedzającym występuje przychód, a w kolejnym już nie,
   4. usunięcie zbędnych wersów,
   5. wyszukanie powtarzających się numerów NIP i usunięcie odpowiednich wersów, przy czym na tym etapie:
      - sumowane są wszystkie przychody danego klienta występujące w **POPRZEDNIM** miesiącu (istotna jest wartość przychodów, które można utracić, a w miesiącu wygaśnięcia umowy mogą to być przychody dotyczące kilku dni, a nie całego miesiąca),
      - sumowana jest wartość faktur odpowiadających przychodom, a ich numery przenoszone do jednej kolumny.

c) Zestawienie obejmuje wszystkie pakiety rozliczane międzyokresowo (kwartalne, roczne, dwuletnie). Pakiety miesięczne (I) nie podlegają zestawieniom 13–15.

d) **[UZUPEŁNIENIE — reguła horyzontu danych]** Kryterium „przychód w miesiącu M oraz M−1, brak przychodu w M+1" wymaga istnienia w danych miesięcy M−1 oraz M+1. Zestawienie 13 liczone jest zatem **wyłącznie dla miesięcy M spełniających jednocześnie:**
   - M−1 ≥ pierwszy miesiąc danych,
   - M+1 ≤ ostatni miesiąc danych (ostatnia wykryta kolumna miesięczna pliku).

   Dla ostatniego miesiąca danych zestawienie **nie jest generowane** — brak kolumny M+1 sprawiłby, że każdy aktywny pakiet zostałby błędnie zaklasyfikowany jako wygasający. Aplikacja jawnie komunikuje zakres miesięcy, dla których zestawienie jest dostępne.

   *Uzasadnienie:* to reguła lustrzana do reguły horyzontu z pkt II.3.g.iii — tam chroni przed fałszywym błędem walidacji na początku danych, tu przed fałszywym wygaśnięciem na końcu danych.

   *Uwaga praktyczna:* plik źródłowy zawiera kolumny miesięcy wybiegające w przyszłość (obecnie do grudnia 2027), więc realne okno raportowania (bieżący miesiąc + 3) mieści się z zapasem w horyzoncie danych.

e) **[UZUPEŁNIENIE]** Klient, którego seria przychodów obejmuje tylko miesiąc M (brak przychodu w M−1), nie jest wykazywany jako wygasający. W praktyce dotyczy to wyłącznie pakietów jednomiesięcznych, które i tak są wyłączone z serii jako flaga I.

#### 14. Liczba i lista nowych klientów, których realizacja umów rozpoczyna się w danym miesiącu

a) **Definicja:** liczba klientów (per NIP) z przychodami rozliczanymi międzyokresowo, rozpoczynającymi się w odpowiednim miesiącu, z flagą F, po wykluczeniu klientów powtarzających się.

b) **Procedura referencyjna (dotychczasowa, ręczna):**
   1. kopiowanie danych do odrębnego arkusza z usunięciem formuł,
   2. usunięcie zbędnych kolumn,
   3. wysortowanie wszystkich wersów z flagą F,
   4. usunięcie zbędnych wersów,
   5. wysortowanie wszystkich wersów, w których w danym miesiącu oraz kolejnym występuje przychód, ale nie występował on w miesiącu poprzedzającym,
   6. usunięcie zbędnych wersów,
   7. wyszukanie powtarzających się numerów NIP i usunięcie odpowiednich wersów.

c) **[UZUPEŁNIENIE]** Analogicznie do pkt 13.d obowiązuje reguła horyzontu: kryterium wymaga istnienia miesięcy M−1 i M+1, więc zestawienie liczone jest dla M od drugiego do przedostatniego miesiąca danych.

#### 15. Liczba i lista klientów przedłużających, których realizacja przedłużeń rozpoczyna się w danym miesiącu

a) **Definicja:** jak w pkt 14, z flagą G zamiast F.

b) **Procedura referencyjna:** jak w pkt 14.b, z flagą G w kroku (iii).

c) **[UZUPEŁNIENIE]** Obowiązuje reguła horyzontu jak w pkt 14.c.

#### 16. Liczba banków będących klientami

a) **Definicja:** liczba klientów generujących przychody w danym miesiącu (wg pkt 12), którzy w słowniku klientów mają atrybut typu „bank" lub „SKOK".

b) **Sposób uzyskania:** atrybut typu klienta przypisywany jest jednorazowo w słowniku klientów aplikacji (z możliwością edycji), a nie wykrywany z nazwy.

c) **[UZUPEŁNIENIE]** Klient pojawiający się w imporcie po raz pierwszy otrzymuje w słowniku typ domyślny „nieokreślony". Aplikacja pokazuje listę klientów z typem nieokreślonym po każdym imporcie, żeby uzupełnienie słownika nie zostało przeoczone.

---

## IV. Zarys konstrukcji

1. **Przepływ danych:** upload pliku importowego → walidacja struktury i reguł (układ kolumn, format numerów dokumentów, reguły flag, format kwot) → raport błędów do poprawy w źródle **LUB** przyjęcie importu → aktualizacja bazy → generowanie zestawień.

2. **Import odbywa się zawsze w trybie „cały plik zastępuje poprzedni stan"** (plik źródłowy prowadzony jest narastająco, więc każdy import zawiera pełną historię). Baza przechowuje dodatkowo metryki importów (data, liczba wersów, wynik walidacji).

3. **Baza danych przechowuje:** słownik klientów (NIP, nazwa, typ), pozycje rozliczeniowe z importu, archiwum wygenerowanych zestawień (co, kiedy, z którego importu).

4. **Zestawienia są nakładką na bazę**; ich zakres będzie rozszerzany (raporty miesięczne, kwartalne, roczne, doraźne).

5. **[UZUPEŁNIENIE] Model danych (zarys):**
   - `clients` — NIP (klucz naturalny), nazwa, typ (bank / SKOK / inny / nieokreślony)
   - `imports` — data importu, nazwa pliku, liczba wersów, wynik walidacji, zakres wykrytych miesięcy
   - `revenue_items` — pozycje rozliczeniowe: powiązanie z importem, NIP, numer dokumentu, typ dokumentu, miesiąc sprzedaży, wartość netto, flaga, numer wersu w pliku źródłowym
   - `revenue_months` — przychody miesięczne pozycji (pozycja, miesiąc, kwota)
   - `report_archive` — archiwum wygenerowanych zestawień

   Przy imporcie całościowym pozycje poprzedniego importu przestają być aktywne; historia importów pozostaje.

---

## V. Rejestr decyzji projektowych

1. **Import zamiast ręcznego wprowadzania** — aplikacja nie może stać się trzecim miejscem wprowadzania danych (obok ksiąg i budżetu); eliminacja ryzyka rozjazdu.

2. **Import całościowy** (plik zastępuje stan bazy), nie przyrostowy — plik źródłowy jest narastający i podlega korektom wstecz; import przyrostowy nie wykryłby zmian w historii.

3. **Tożsamość klienta po NIP, nie po nazwie** — nazwy są niespójne (literówki, interpunkcja, formy prawne).

4. **Typ klienta (bank/SKOK) jako atrybut słownika**, nie wyszukiwanie w nazwie — odporność na nazwy nietypowe.

5. **Walidacja struktury pliku przy każdym imporcie jest elementem MVP, nie dodatkiem** — chroni przed scenariuszem „policzy błędnie, ale wiarygodnie".

6. **Pakiety miesięczne = incydentalne (I)**; zestawienia 13–15 dotyczą wyłącznie pakietów ≥ 2 miesiące.

7. **NIP z zamówienia/umowy jako rozstrzygnięcie tożsamości klienta** (pośrednicy → NIP użytkownika końcowego; zagraniczni → VAT UE) — reguła zakotwiczona w dokumencie źródłowym.

8. **Zestawienia liczone na agregatach per klient, nie na wersach** — odporność na korekty (FKS) i eliminacja ręcznej deduplikacji.

9. **Wycofano podział zestawienia 13 na przedłużone/nieprzedłużone oraz regułę 6 miesięcy** — o statusie nowy/przedłużający decydują wyłącznie flagi w pliku źródłowym, a ich spójność pilnowana jest walidacją importu (okno 12 miesięcy), nie interpretacją aplikacji.

10. **Korekty (FKS) prezentowane są w zestawieniach jako odrębna pozycja „korekty"** — sumy kategorii flagowych plus korekty równają się sumie całkowitej.

11. **Klient o zagregowanym przychodzie ≤ 0 w miesiącu nie jest wykazywany jako płacący** (zgodność z dotychczasową praktyką ręczną).

12. **Definicja nowego klienta:** powrót po przerwie dłuższej niż 12 miesięcy od wygaśnięcia = nowy klient (uzasadnienie biznesowe: po ponad rocznej przerwie sprzedaż ma charakter nowego pozyskania).

13. **Serie zestawień 13–15:** wersy F/G/H + wszystkie FKS, z wyłączeniem I. Świadomie zaakceptowano rzadkie zaburzenia (FKS do zakupu incydentalnego; zakup incydentalny nie maskuje wygaśnięcia pakietu, bo nie wchodzi do serii).

14. **Rozważono i odrzucono** usunięcie obsługi FKS oraz interaktywne pomijanie nieznanych dokumentów przy imporcie — pominięcie wersów zawyżałoby przychody trwale (import całościowy przywraca je przy każdym wczytaniu), a decyzje interaktywne odbierają importowi deterministyczność i odtwarzalność. Przyjęto: twarda walidacja typów dokumentów (II.3.h), uproszczona obsługa FKS w seriach (11a).

15. **[UZUPEŁNIENIE] Reguła horyzontu danych stosowana symetrycznie** — na początku danych chroni przed fałszywym błędem walidacji flagi G (II.3.g.iii), na końcu danych przed fałszywym wygaśnięciem umowy (13.d). Bez reguły końcowej każdy aktywny pakiet byłby raportowany jako wygasający w ostatnim miesiącu danych.

16. **[UZUPEŁNIENIE] Wszystkie błędy walidacji są blokujące, import jest odrzucany w całości** — konsekwencja importu całościowego (decyzja 2). Import częściowy trwale fałszowałby przychody.

17. **[UZUPEŁNIENIE] Hosting publiczny wymaga autoryzacji jako elementu MVP** — aplikacja przetwarza dane finansowe; brak logowania byłby błędem konstrukcyjnym, nie brakiem funkcji.

18. **[UZUPEŁNIENIE] Rozdział instancji demo i produkcyjnej** — instancja udostępniana organizatorom kursu pracuje wyłącznie na danych syntetycznych. Uzasadnienie: prostota rozdziału i brak potrzeby publicznego ujawniania rzeczywistych wyników sprzedażowych — niezależnie od tego, czy dany klient jest objęty poufnością (patrz decyzja 27, która precyzuje, że poufność per klient to osobna, węższa sprawa).

19. **[UZUPEŁNIENIE] Format pliku importowego .xlsx, nie CSV** — eliminuje problem separatora dziesiętnego i kodowania, skraca ścieżkę użytkownika.

20. **[UZUPEŁNIENIE] Obliczenia na liczbach całkowitych (grosze), nie na float** — narzędzie raportujące dla funduszy nie może generować błędów zaokrągleń.

21. **[UZUPEŁNIENIE] Schemat bazy w plikach migracji SQL w repozytorium**, nie klikany w panelu Supabase — struktura bazy musi być odtwarzalna i objęta historią zmian.

22. **[UZUPEŁNIENIE] Z Supabase wykorzystywane są wyłącznie: Postgres, Auth, panel podglądu** — świadome ograniczenie zakresu przy dwutygodniowym terminie.

23. **[UZUPEŁNIENIE] Plik importowy ma zawsze dokładnie jeden wiersz nagłówkowy** — arkusz źródłowy „Sprzedaż" ma nad kolumnami miesięcy dwa scalone wiersze nagłówkowe (rok, potem miesiąc), a liczba wierszy nagłówkowych w pliku przygotowywanym do importu (kopiuj-wklej) zależała dotąd od decyzji osoby przygotowującej plik (0, 1 lub 2). Ustalono sztywno: zawsze jeden. Przypisanie kolumn do miesięcy jest i tak wyłącznie pozycyjne (II.4), więc treść nagłówka nad kolumnami miesięcy nie ma znaczenia dla obliczeń — ale jego liczba musi być stała, żeby import pozostał deterministyczny. Rozstrzyga otwarte pytanie P2 z `PLAN.md`.

24. **[UZUPEŁNIENIE] Generator danych syntetycznych generuje dwa warianty pliku** (`--clean` do demo, `--with-errors` do testów walidacji) — szczegóły w VI.9. Golden file (z celowymi błędami) i dane demo (w całości poprawne) to dwa różne pliki, nie jeden — import całościowy (decyzja 2) odrzuciłby plik z błędami w całości, więc nie dałoby się nim zasilić instancji demo.

26. **[UZUPEŁNIENIE] Zakres walidacji strukturalnej (zadanie 1.2) doprecyzowany z użytkownikiem** — szczegóły w II.5. Kluczowe rozstrzygnięcia: (a) flaga incydentalna (I) podlega tej samej regule „dokładnie jedna z F/G/H/I", co pozostałe trzy — nie jest wyjątkiem, mimo że pierwotne sformułowanie zadania wspominało tylko kolumny F–H; (b) w kolumnach flag akceptowana jest wyłącznie wartość liczbowa `1` — każda inna niepusta wartość to błąd formatu (ściślej niż uproszczone odczytanie `!= null` w `parseSalesRows`, które pozostaje bez zmian, bo działa już tylko na plikach, które przeszły tę walidację); (c) liczba porządkowa (kolumna A) nie musi zaczynać się od konkretnej wartości — wymagana jest wyłącznie ciągłość (+1 bez przerw), bo plik bywa wycinkiem większego arkusza; (d) NIP polski walidowany sumą kontrolną, VAT UE tylko kształtem (2 litery + 2–12 cyfr), bez sumy kontrolnej per kraj — pełna walidacja formatów VAT UE per kraj uznana za nadmiarową na tym etapie.

27. **[UZUPEŁNIENIE] Rzeczywisty zakres poufności danych sprzedażowych jest wąski** — dotyczy tylko 3 konkretnych klientów objętych dodatkowymi umowami o poufności, nie całego zbioru danych. Poprzednia wersja decyzji 18 sugerowała poufność wszystkich danych sprzedażowych — to było zawyżone. **Konsekwencja dla pliku do backtestu (zadanie 0.8, lokalny, nigdy niecommitowany):** dane tych 3 klientów podmieniane są na dane innych firm (technika już stosowana przy prezentacji budżetów innym funduszom), pozostali klienci mogą pozostać niezmienieni. Nie zmienia to decyzji 18 dla instancji demo — tam powodem pełnej syntetyczności jest brak potrzeby publicznego ujawniania wyników, nie tylko poufność per klient.

---

## VI. [UZUPEŁNIENIE] Wymagania niefunkcjonalne

### 1. Architektura i hosting

- Aplikacja webowa Next.js (App Router), frontend i API w jednym projekcie, TypeScript.
- Hosting: Vercel, automatyczny deploy z gałęzi `main` repozytorium GitHub.
- Baza: Supabase (Postgres), podpięta przez integrację Vercel.
- **Deploy działa od pierwszego dnia projektu.** Zasada: nie budujemy dwóch tygodni lokalnie, żeby na końcu „tylko wrzucić na serwer". Problemy integracyjne wychodzą wtedy, gdy są małe.

### 2. Autoryzacja i dostęp

- Supabase Auth, logowanie email + hasło.
- Rejestracja samodzielna wyłączona — konta zakłada właściciel projektu.
- Wszystkie ścieżki aplikacji poza stroną logowania wymagają uwierzytelnienia (middleware Next.js).
- Na potrzeby zaliczenia zakładane jest konto dla organizatorów kursu (dostęp do instancji demo).
- Poza zakresem MVP: role i uprawnienia (aplikacja ma jednego właściciela danych).

### 3. Rozdział instancji demo i produkcyjnej

| | Instancja demo | Instancja produkcyjna |
|---|---|---|
| Odbiorca | organizatorzy kursu | właściciel projektu |
| Dane | wyłącznie syntetyczne | rzeczywiste |
| Termin | do zaliczenia (14 dni) | po zaliczeniu |

Instancja produkcyjna to osobny projekt Vercel + osobny projekt Supabase, ten sam kod. Rzeczywiste dane nigdy nie trafiają do instancji demo.

### 4. Import

- Format: `.xlsx`. Maksymalny rozmiar pliku: 10 MB.
- Wykrywanie zakresu kolumn miesięcznych: dynamiczne, na podstawie wersu nagłówkowego.
- Wynik importu: przyjęcie w całości albo odrzucenie w całości z raportem błędów.
- Raport błędów: lista wszystkich wykrytych problemów jednocześnie, każdy z numerem wersu w pliku źródłowym, wartością i przyczyną. Możliwość pobrania raportu.
- Import jest **idempotentny i deterministyczny**: ten sam plik wczytany dwukrotnie daje ten sam stan bazy i te same zestawienia.

### 5. Wyjście i eksport

- Zestawienia prezentowane na ekranie w formie tabel, z wyborem miesiąca / zakresu.
- Eksport zestawień do `.xlsx` — dane z aplikacji trafiają do sprawozdań dla funduszy o określonej formie, więc format kopiowalny jest wymagany.
- Zestawienia 12–16 zawierają zarówno liczbę, jak i listę klientów (NIP, nazwa, kwoty, numery faktur).

### 6. Precyzja liczbowa

- Kwoty w bazie: `NUMERIC(14,2)`, waluta PLN netto.
- Obliczenia na liczbach całkowitych (grosze). Zakaz używania typu float w logice finansowej.
- Zaokrąglenie wyłącznie na etapie prezentacji.

### 7. Wolumen i wydajność

- Skala danych: rzędu tysięcy wersów, kilkudziesięciu kolumn miesięcznych, kilkuset klientów.
- Oczekiwany czas importu z walidacją: poniżej 30 sekund (limit funkcji serverless na Vercelu).
- Generowanie zestawienia: poniżej 3 sekund.
- **Ograniczenie planu darmowego Supabase:** projekt jest pauzowany po około tygodniu bezczynności. Instancję demo należy odpauzować dzień przed udostępnieniem organizatorom.

### 8. Bezpieczeństwo

- Sekrety wyłącznie w zmiennych środowiskowych (`.env.local` lokalnie, panel Vercela produkcyjnie). Nigdy w repozytorium.
- Klucz `service_role` Supabase używany wyłącznie w kodzie serwerowym.
- Repozytorium może być publiczne — pod warunkiem, że nie zawiera sekretów ani danych rzeczywistych.

### 9. Jakość

- Testy jednostkowe (Vitest) dla każdej reguły walidacji z pkt II.3 i każdego zestawienia z pkt III.
- Fixture testowy: syntetyczny plik „golden file" zawierający wszystkie przypadki brzegowe (FKS, FVZK, wers bez flagi, wers z dwiema flagami, nieznany typ dokumentu, klient wracający po 13 miesiącach, klient wracający po 11 miesiącach, pakiet na granicy horyzontu danych).
- **[UZUPEŁNIENIE] Generator danych syntetycznych ma dwa tryby wyjścia:** `--clean` (domyślny) — same poprawne przypadki brzegowe, plik importowalny w całości, używany do zasilenia instancji demo (zadanie 4.2); `--with-errors` — to samo plus celowo błędne wersy (brak flagi, dwie flagi, nieznany typ dokumentu, błędnie oznaczony powrót po 11/13 miesiącach), plik **nigdy nie importowany** do żadnej instancji, wyłącznie golden file do testów jednostkowych walidacji. Uzasadnienie: import jest całościowy (decyzja 2) — plik z celowymi błędami zostałby odrzucony w całości i nie dałoby się nim zasilić demo.
- **Backtest przed zaliczeniem:** wyniki aplikacji porównane z dotychczasowymi ręcznymi zestawieniami za co najmniej 3 miesiące. Każda rozbieżność wyjaśniona — jako błąd aplikacji albo błąd procedury ręcznej.

### 10. Poza zakresem MVP

Świadomie odłożone: budżet i porównanie wykonania z budżetem, raporty kwartalne i roczne jako gotowe formatki, wykresy i trendy, role użytkowników, powiadomienia, integracja z KSeF, wielowalutowość.

---

## VII. [UZUPEŁNIENIE] Wykaz zmian względem pierwotnego opisu projektu

**Zmiany merytoryczne (wymagają świadomej akceptacji):**

1. **II.3.i** — dodano jawną klasyfikację błędów walidacji jako blokujących, z uzasadnieniem wynikającym z importu całościowego. W pierwotnym opisie było to jednoznaczne tylko dla nieznanych typów dokumentów (II.3.h).
2. **13.d** — **poprawka luki logicznej.** Pierwotna definicja („przychód w M i M−1, brak w M+1") powodowałaby, że w ostatnim miesiącu danych każdy aktywny pakiet zostałby zaklasyfikowany jako wygasający. Dodano regułę horyzontu, lustrzaną do istniejącej reguły II.3.g.iii.
3. **13.e, 14.c, 15.c** — konsekwencje reguły horyzontu dla zestawień 14 i 15 oraz rozstrzygnięcie przypadku serii jednomiesięcznej.
4. **16.c** — dodano typ domyślny „nieokreślony" dla nowych klientów i wymóg sygnalizowania nieuzupełnionych typów po imporcie. Bez tego zestawienie 16 po cichu zaniżałoby liczbę banków.

**Uzupełnienia warstwy technicznej (nieobecne w pierwotnym opisie):**

5. **II.4** — format pliku importowego: `.xlsx`.
6. **IV.5** — zarys modelu danych.
7. **Sekcja VI** — całość wymagań niefunkcjonalnych: hosting, autoryzacja, rozdział instancji demo/produkcyjnej, eksport, precyzja liczbowa, wydajność, bezpieczeństwo, jakość, zakres poza MVP.
8. **II.4** — liczba wierszy nagłówkowych pliku importowego (zawsze dokładnie jeden), rozstrzygnięcie otwartego pytania `PLAN.md` P2.
9. **VI.9** — generator danych syntetycznych w dwóch trybach (`--clean` / `--with-errors`), rozdzielenie golden file od danych demo.
10. **V.18 (korekta)** — zawężenie zakresu poufności danych sprzedażowych do 3 konkretnych klientów objętych NDA, zamiast całego zbioru danych; patrz nowa decyzja 27.
11. **V.15–27** — decyzje projektowe wynikające z powyższych uzupełnień.
12. **II.5, V.26** — szczegółowe reguły walidacji strukturalnej pól (zadanie `PLAN.md` 1.2): ciągłość liczby porządkowej, minimalna długość nazwy klienta, suma kontrolna NIP / kształt VAT UE, wymóg dokładnie jednej flagi F–I z wartością `1`, wymóg niezerowego przychodu w co najmniej jednym miesiącu.

**Redakcja:** treść merytoryczna sekcji I–V zachowana; ujednolicono formatowanie, poprawiono literówki, ponumerowano procedury referencyjne.
