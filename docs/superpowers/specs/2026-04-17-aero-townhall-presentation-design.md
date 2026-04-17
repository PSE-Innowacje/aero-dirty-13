# AERO Hackathon Town Hall Presentation — Design Spec

**Data:** 2026-04-17
**Autorzy:** Mariusz Kędziora (SSDLC/cyber) · Mariusz Szustka (endpoint mgmt/IAM)  
**Mały smaczek:** obaj prezenterzy mają na imię Mariusz — to nie pomyłka, to team skład.
**Artefakt docelowy:** `docs/AERO_Hackathon_Presentation.html`
**Kontekst:** Firmowy townhall. Prezentacja o tym jak dwóch non-developerów z IT zbudowało aplikację AERO w 2-dniowym hackatonie używając LLM + vibecodingu.

---

## 1. Cel i kontekst

### Problem / motywacja
Firma organizuje townhall po hackatonie. Zespół **Mariusz Kędziora + Mariusz Szustka** dostarczył w 48h działającą, produkcyjną aplikację AERO (zarządzanie operacjami lotniczymi helikopterami do inspekcji linii 400kV). Reszta firmy chce wiedzieć: **jak to w ogóle było możliwe bez developerów w zespole**, i **jakimi narzędziami** to zrobiliśmy. Prezentacja ma odpowiedzieć na te pytania i zostawić słuchacza z poczuciem "ja też mogę".

### Meta-punkt
Hackathon był o vibecodingu. Więc i prezentacja powstaje metodą vibecoding — plan, spec, copywriting i implementacja robione wspólnie z LLM. To eat-your-own-dogfood.

### Takeaway (kompas)
> **"Każdy z IT może. A oto jak."**
>
> (motywacja: demokratyzacja budowania oprogramowania. + praktyczny przewodnik: konkretne narzędzia i workflow, które czytelnik może zastosować już w poniedziałek.)

### Success criteria
- Po prezentacji co najmniej 1-2 osoby z sali pytają "jak zacząć?" / "który tool jako pierwszy?"
- Prezenterzy mieszczą się w 15 min bez cięć na głos.
- Screencast demo odpala się bez awarii (pre-recorded → zero live-ryzyka).
- Feedback jakościowy: "autentyczne", "inspirujące", "praktyczne" — nie "przechwałki".

---

## 2. Parametry

| Wymiar | Wartość |
|---|---|
| Publiczność | Mix tech + biznes + middle management. **Bez zarządu.** Ton dostępny, narzędzia wymienione bez deep-dive. |
| Długość | 15 min + Q&A. 6 slajdów. |
| Prezenterzy | **MK** — Mariusz Kędziora (SSDLC/cyber) + **MS** — Mariusz Szustka (endpoint mgmt/IAM). Obaj non-dev, obaj Mariusze. |
| Format | Single-page HTML presentation (offline, bez dependencies oprócz Google Fonts). |
| Nawigacja | Strzałki ← →, navigation dots, kliknięcie dot, klawisze Home/End, ew. swipe na touch. |
| Język | Polski (główny). |
| Aspekt | 16:9. Responsive: projektor 1920×1080 i laptop prezentera 1440×900. |

---

## 3. Architektura narracyjna

**Podejście C — Sytuacja → Magia → Dowód → Kuchnia → CTA** (TED-talk hybryda)

```
[1. Tytuł]  →  [2. Sytuacja]  →  [3. Magia]  →  [4. Dowód]  →  [5. Kuchnia]  →  [6. CTA]
  hook        napięcie         rozwiązanie      ulga/szok     autentyczność    akcja
  (razem)     (MK)             (MK)             (MS)          (MS)             (razem)
```

**Rytm emocjonalny:**
1. **Hook** (Tytuł) — zaintrygować w 15 sekund
2. **Napięcie** (Sytuacja) — "jak to w ogóle miało się udać?"
3. **Rozwiązanie** (Magia) — "oto co uruchomiliśmy"
4. **Dowód** (Dowód) — "i oto efekt" (najbardziej efektowny slajd, prowadzi go Mariusz Szustka — nie gra drugich skrzypiec)
5. **Autentyczność** (Kuchnia) — "ale nie wszystko było różowe"
6. **Akcja** (CTA) — "twój ruch"

**Podział prezenterów:**
- **Razem:** slajdy 1 i 6 (otwarcie + zamknięcie)
- **Mariusz Kędziora (MK):** slajdy 2-3 (kontekst + stack, security background daje wiarygodność przy CI/quality)
- **Mariusz Szustka (MS):** slajdy 4-5 (dowód + lekcje — najbardziej emocjonalne slajdy, IAM background daje ironiczne komentarze przy RBAC)

---

## 4. Design 6 slajdów

### Slide 1 — Tytuł

**Czas:** ~30 sek. **Prezenter:** Obaj razem.

**Cel:** Hook. Zaintrygować w pierwszych 15 sekundach.

**Układ wizualny:**
- Fullscreen hero. Centrowane.
- Wielkie "AERO" (duże, ~clamp(80px, 12vw, 180px)) z gradient fill lub glow.
- Subtitle pod spodem: "Jak dwóch non-developerów zbudowało aplikację w 2 dni"
- Tagline: "Hackathon · LLM · Vibecoding — historia z kuchni"
- Linia separująca (animowana)
- Imiona prezenterów + role (SSDLC | IAM) drobnym fontem na dole
- Tło: reuse animated gradient + particles z `docs/AERO_Presentation.html`
- **Vibecode akcent:** mruga kursor terminala po "AERO" przez ~2 sek na starcie

**Copy:**
```
AERO
Jak dwóch non-developerów zbudowało aplikację w 2 dni

Hackathon · LLM · Vibecoding — historia z kuchni
Mariusz Kędziora (SSDLC) · Mariusz Szustka (IAM)
[Data townhallu]
```

**Speaker script (skrót):**
- MK: "Cześć, jestem Mariusz Kędziora — zajmuję się SSDLC i cyberbezpieczeństwem."
- MS: "A ja jestem Mariusz Szustka — zarządzanie komputerami i uprawnieniami. Tak, obaj Mariuszowie. Ten detal jeszcze wróci."
- MK: "Żaden z nas nie jest developerem."
- MS: "A 2 tygodnie temu, przez 2 dni hackatonu, zbudowaliśmy aplikację która działa."
- MK: "Dzisiaj opowiemy jak."
- [transition to slide 2]

---

### Slide 2 — Sytuacja

**Czas:** ~2.5 min. **Prezenter:** Mariusz Kędziora (MK).

**Cel:** Zbudować napięcie. Widownia ma poczuć "ci ludzie naprawdę nie wyglądają na devów, a zadanie jest mocne".

**Układ wizualny:**
- Split-screen dwukolumnowy.
- **Lewa (40%):** "Kim jesteśmy" — 2 karty glass z avatarami/zdjęciami, imię, rola IT, 1-liner codziennej pracy. Pod spodem wspólna plakietka: **"Linii kodu napisanych w codziennej pracy: 0"**.
- **Prawa (60%):** "Co dostaliśmy" — stylizowany brief. Nagłówek: **"Brief hackatonu — 2 dni"**. Treść:
  - System do zarządzania operacjami lotniczymi helikopterami
  - Inspekcje linii przesyłowych 400 kV
  - 4 role użytkowników z RBAC
  - Mapy, trasy KML, workflow akceptacji
  - Deadline: 48 godzin
- W rogu prawej kolumny: licznik **48:00:00** tykający w tle (sub-count-down).
- **Vibecode akcent:** brief w monospace, ramka jak terminal.

**Copy kluczowe:**
> "Dostaliśmy brief. System wart tygodni dev-time. Mieliśmy 48 godzin. Pierwsza myśl: *jak to w ogóle zacząć?*"

**Speaker script (skrót):**
- MK: "Tu Mariusz Kędziora — pierwszy Mariusz w zespole. Chcę zbudować kontekst."
- [kliknięcie — pojawia się brief]
- "Brief był poważny: system który u normalnego software house zajmie 2-3 sprinty. 48h. Zero wcześniejszego doświadczenia w pisaniu aplikacji."
- [pauza]
- "Pierwsza myśl? Panika. Druga myśl: spróbujmy. Co najwyżej się nie uda."
- [transition] "I tu pojawiła się **magia** — pod tą magią kryją się cztery konkretne narzędzia. Pokażę."

---

### Slide 3 — Magia / Stack

**Czas:** ~2.5 min. **Prezenter:** Mariusz Kędziora (MK).

**Cel:** Pokazać **konkretnie czym** się posłużyliśmy. Każde narzędzie dostaje swoje "dlaczego to".

**Układ wizualny:**
- Nagłówek: **"Cztery narzędzia. Zero frameworka 'no-code'."**
- Cztery filary w układzie grid 2×2 (kafelki glass):

| 🤖 **Claude Code** | 🔧 **GitHub** |
|---|---|
| CLI agent od Anthropic. Pisze kod, my opisujemy *co* i *dlaczego*. Sonnet 4.6 + Opus 4.6. | Issues jako backlog · branch per feature · PR + CI jako **quality gate**. Zero wyjątków. |

| 📋 **GSD workflow** | 🐳 **Docker Compose** |
|---|---|
| Struktura planowania: milestone → slice → phase → task. Trzyma w ryzach gdy tempo zabija. | 5 serwisów, 1 polecenie. Środowisko prezentera = środowisko produkcji. |

- Pod gridem: mini-diagram flow:
```
[Wymagania PL] → [Claude Code agent] → [kod + testy] → [commit + PR] → [CI green] → [merge]
```
- **Vibecode akcent:** każdy kafel ma dyskretny monospace snippet pod opisem (np. `claude code --plan`, `gh pr create`, `gsd plan-phase`, `docker compose up`).

**Copy kluczowe:**
> "To nie jest magia. To jest stos czterech narzędzi — każde z nich istnieje od lat, każde jest darmowe lub tanie, każde może być uruchomione przez **każdą osobę w tej sali**."

**Speaker script (skrót):**
- "Cztery filary. Pokażę po kolei."
- [Claude Code] "To agent CLI od Anthropic. My piszemy wymagania po polsku, on pisze kod. Brzmi prosto — i takie właśnie jest."
- [GitHub] "Issues to nasz backlog, PR-y to quality gate. Testy w CI leciały na każdy PR. Jako SSDLC-owiec — tu mam łaskę: nic nie lądowało bez green checka."
- [GSD] "To meta-workflow. Wymusza myślenie zanim każesz agentowi pisać. Bez tego 48h by się rozjechało."
- [Docker] "Pięć serwisów — baza, backend, frontend, nginx z TLS, init. Jedno polecenie i stoi."
- [transition] "A jak wygląda efekt? Drugi Mariusz ma mikrofon."

---

### Slide 4 — Dowód

**Czas:** ~3 min. **Prezenter:** Mariusz Szustka (MS).

**Cel:** Najbardziej efektowny slajd. Pokazać że to nie jest prototyp — to jest aplikacja.

**Układ wizualny:**
- Nagłówek: **"To nie jest prototyp."**
- Dwie kolumny:
- **Lewa (55%):** screencast/GIF w ramce (mockup laptopa lub czysta ramka z drop-shadow). Loop ~30 sek:
  1. Ekran logowania → login jako Pilot (1-2 sek)
  2. Dashboard → przejście do listy operacji (2-3 sek)
  3. Otwórcie operacji → mapa Leaflet z trasą KML (3-4 sek)
  4. Upload pliku KML → trasa aktualizuje się na mapie (4-5 sek)
  5. Przejście do zleceń → akceptacja statusu (3-4 sek)
  6. Powrót do listy → widoczna zmiana statusu (2 sek)
  - Total: ~25-30 sek. Format GIF (≤2 MB) lub MP4 `loop muted autoplay`.
- **Prawa (45%):** liczby w dużym formacie, każda z mini-labelem:

| 113 | 44 | 166 | 63 |
|---|---|---|---|
| commitów | endpointów API | testów backend | testów E2E Playwright |

| 5 | 4 | 2 | 48h |
|---|---|---|---|
| serwisów Docker | role RBAC | języki (PL/EN) | czas |

- Pod liczbami: mini-diagram 4 ról RBAC z ikonami (Planujący 📝 / Nadzorujący ✅ / Pilot 🚁 / Admin ⚙️) — każda z jedno-linerem uprawnień.

**Copy kluczowe:**
> "113 commitów. 44 endpointy API. 229 testów razem. 5 kontenerów produkcyjnych. W 48 godzin."
>
> "I — powiem to jako specjalista IAM — **RBAC który tu wyszedł jest porządny**. Nie bawił się tym człowiek, który nie wie co to zasada najmniejszych uprawnień."

**Speaker script (skrót):**
- MS: "Tu Mariusz Szustka — zapowiadany drugi Mariusz. Pokażę co jest po drugiej stronie tych 48h."
- [play screencast — komentarz na żywo] "Login Pilot, przechodzi do listy operacji, otwiera mapę… uwaga teraz: upload pliku KML i trasa pojawia się na mapie automatycznie. Parsowanie KML, walidacja, wizualizacja — to wszystko napisał agent w ciągu jednej sesji."
- [pauza, przejście do liczb]
- "A teraz liczby. 113 commitów. [wskazuje] 44 endpointy. [wskazuje] 166 testów backend plus 63 Playwright E2E — 229 razem. Deploy? Docker compose up. Pięć serwisów stoi w 40 sekund."
- [ironia RBAC] "I jeszcze jedna rzecz. Na co dzień zajmuję się uprawnieniami. Patrzę na ten RBAC — cztery role, każda widzi dokładnie to co powinna, każdy endpoint chroniony. Nie mam się do czego przyczepić. Od agenta."
- [transition] "Ale nie wszystko było różowe. Pokażę kuchnię."

---

### Slide 5 — Kuchnia / Lekcje

**Czas:** ~3 min. **Prezenter:** Mariusz Szustka (MS).

**Cel:** Autentyczność. Pokazać że vibecoding ma swoje bolączki. Wzmocnić wiarygodność poprzez szczerość.

**Układ wizualny:**
- Nagłówek: **"Kuchnia — trzy lekcje"**
- Trzy karty glass w rzędzie, każda z emoji i 3-częściową strukturą (**Sytuacja** / **Co się stało** / **Wniosek**):

**Karta 1 — ✅ CO DZIAŁAŁO**
> **Sytuacja:** Agent miał napisać moduł walidacji zleceń. Pięć warunków bezpieczeństwa.
> **Co się stało:** Poza kodem walidacji sam napisał 40+ testów pokrywających wszystkie warianty. Bez proszenia.
> **Wniosek:** *Pisanie wymagań po polsku → szybsze niż pisanie kodu. 229 testów zrobionych bez zamawiania.*

**Karta 2 — 😱 CO ZASKOCZYŁO**
> **Sytuacja:** Wgrywamy pierwszy plik KML z trasą w Polsce. Klik "Pokaż na mapie".
> **Co się stało:** Trasa pojawiła się 90° obok — na środku Oceanu Indyjskiego. Godzina debugowania.
> **Wniosek:** *KML przechowuje `(lon, lat)`, Leaflet oczekuje `[lat, lon]`. Agent znalazł, naprawił, zapisał w knowledge base. Już nie popełni tego błędu.*

**Karta 3 — 🧠 GDZIE CZŁOWIEK**
> **Sytuacja:** Pierwsza wersja miała hardcoded tokeny w testach i zero rotacji.
> **Co się stało:** Agent napisałby tak jak mu kazaliśmy. To **my** musieliśmy zauważyć że to wpadka bezpieczeństwa.
> **Wniosek:** *Decyzje architektoniczne, security, UX — człowiek nadal w pętli. Vibecoding to pilot, nie autopilot.*

- **Vibecode akcent:** każda karta ma dyskretny nagłówek "komputer" w monospace (np. `// lesson-01.md`).

**Copy kluczowe:**
> "Trzy lekcje z 48h."
>
> "Nauczyliśmy się czego od agenta. Nauczyliśmy się, gdzie agent potrzebuje nas. I nauczyliśmy się czego agent nie zrobi za nas — i dobrze, że nie robi."

**Speaker script (skrót):**
- "Trzy historie z kuchni. Pierwsza — co zadziałało."
- [lekcja 1] "Poprosiłem o moduł walidacji. Dostałem moduł + 40 testów. Bez proszenia. Pomyślcie: my, zajmujący się kontrolą dostępu, dostajemy **darmowy** test suite."
- [lekcja 2] "Druga — KML. Godzina walki z mapą. Trasy w Polsce pokazywały się w Oceanie Indyjskim. Okazało się: format KML trzyma współrzędne jako (długość, szerokość), biblioteka mapy chce (szerokość, długość). Agent sam to znalazł i od tego momentu pamięta."
- [lekcja 3] "Trzecia — i najważniejsza. Agent napisałby hardcoded tokeny w testach. Bo tak mu kazaliśmy. **My** musieliśmy powiedzieć: stop, rotacja, sekrety w vault. Vibecoding to **pilot**, nie autopilot. Człowiek nadal patrzy na instrumenty."
- [transition] "Co to znaczy dla Was?"

**⚠️ Do uzupełnienia przez prezenterów:** treść 3 lekcji powyżej to strawman zbudowany z `.gsd/KNOWLEDGE.md`. Realna treść może być lepsza — prezenterzy **muszą** potwierdzić lub wymienić na własne autentyczne momenty z hackatonu przed finalizacją slajdu.

---

### Slide 6 — Wasz ruch

**Czas:** ~1.5 min. **Prezenter:** Obaj razem.

**Cel:** Zamknąć emocjonalnie. Dać słuchaczom **konkretny** pierwszy krok.

**Układ wizualny:**
- Minimalistyczny. Mniej wszystkiego.
- Centrowany hero statement:
  > **"Nie musisz być developerem, żeby budować oprogramowanie.**
  > **Musisz umieć myśleć."**
- Pod spodem trzy CTA w kafelkach:

| 1️⃣ Spróbuj | 2️⃣ Zmień nawyk | 3️⃣ Porozmawiajmy |
|---|---|---|
| Weź jeden drobny problem z Twojej pracy. Otwórz Claude Code. Opisz po polsku. Zobacz co się stanie. | Ucz się pisać **wymagania**, nie kod. To nowa kompetencja — i jest deficytowa. | Jesteśmy w kontakcie: [slack/email]. Zapraszamy do wspólnych warsztatów. |

- Na dole: "Pytania?" (duża czcionka) + QR code do slajdów / repo (opt-in).

**Copy kluczowe:**
> "Jedna rzecz do zabrania: **myślenie to nowy kod**."

**Speaker script (skrót):**
- MK: "Podsumujmy."
- MS: "Nie musisz być developerem, żeby budować oprogramowanie."
- MK: "Musisz umieć myśleć."
- [pauza]
- MK: "Trzy rzeczy do zrobienia w poniedziałek:"
- MK: "Jeden — weź drobny problem. Małe narzędzie, automat, skrypt. Odpal Claude Code. Opisz po polsku."
- MS: "Dwa — ucz się pisać wymagania. Jasne, precyzyjne, testowalne. To twoja nowa kompetencja."
- MS: "Trzy — porozmawiaj z nami. Obaj Mariuszowie — ten wysoki i ten drugi. Slack, korytarz, kawa."
- [razem] "Pytania?"

---

## 5. Visual style guide

### Podstawa (reuse z `docs/AERO_Presentation.html`)
- **Background:** `#000a1a` z animated gradient + floating particles + ambient glow orbs
- **Typography:** Inter 300/400/500/600/700/800/900 (Google Fonts, już preloaded)
- **Glass cards:** `background: rgba(255,255,255,0.03)`, `backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.08)`, `border-radius: 16px`
- **Accent:** niebieski `#48a2ce` (RGB 72,162,206) — paski, dots, borders
- **Grid overlay:** subtelny `rgba(72,162,206,0.04)` grid co 60px z animowanym float
- **Animations:** `anim-fade-up`, `anim-fade`, `anim-slide-left/right`, `anim-scale` z delay stepping `delay-1` do `delay-10`

### Vibecode akcenty (dodajemy)
1. **Monospace font** — **JetBrains Mono** (Google Fonts, wagi 400/500/700) dla snippetów, briefu i "komputer" nagłówków
2. **Typing animation** — na slajdzie 1 (cursor pod AERO) i slajdzie 3 (pojawianie się snippetów CLI)
3. **Terminal-framed elements** — brief na slajdzie 2 i snippety na slajdzie 3 dostają ciemniejszy background + górny pasek kropek (🔴🟡🟢) stylizowany na okno terminala
4. **Prompt decorations** — w tle slajdu 3 bardzo subtelne (opacity 0.05) fragmenty realnych promptów z hackatonu ("Dodaj endpoint POST /api/orders…", "Walidacja: crew_weight ≤ helicopter.max_payload…") jako tapeta

### Kolor mapping dla emocji
- Slajd 2 (napięcie) — dodatkowy akcent czerwony/pomarańczowy (`#ff6b35`) w liczniku 48h
- Slajd 4 (dowód) — akcent zielony sukcesu (`#3fc37a`) przy liczbach testów
- Slajd 5 (kuchnia) — trzy karty z różnymi accent colors: ✅ zielony / 😱 pomarańczowy / 🧠 niebieski

### Navigation
- Dot navigation u dołu (6 kropek, active state niebieski, hover label tooltip "Tytuł", "Sytuacja", "Magia", "Dowód", "Kuchnia", "Wasz ruch")
- Arrow keys ← →, Home/End, Page Up/Down
- Slide counter "X / 6" w rogu
- Swipe gestures na touch (bonus)
- Progress bar (thin line na górze pokazujący postęp)

---

## 6. Content inputs — wymagane od prezenterów

| # | Input | Status | Deadline |
|---|---|---|---|
| 1 | **Treść 3 lekcji** (Slajd 5) — potwierdzenie strawmana lub własne historie | **TBD** | Przed implementacją HTML |
| 2 | **Screencast** 25-30 sek: login → operacje → mapa → upload KML → akceptacja | **TBD** | Przed finalnym buildem |
| 3 | **Hasło finałowe** — "Nie musisz być developerem. Musisz umieć myśleć." | Proponowane, do zatwierdzenia | Review spec |
| 4 | **Zdjęcia obu Mariuszów** (slajd 1 i 2) — zwykłe headshoty lub avatary | **TBD** | Przed implementacją |
| 5 | **Data townhallu** | **TBD** | Slajd 1 |
| 6 | **Kontakt CTA** (slajd 6): slack channel / email / teams | **TBD** | Slajd 6 |
| 7 | **Potwierdzenie liczb** (slajd 4) — 113 commitów / 44 endpointy / 166+63 testów / 5 serwisów / 4 role / 2 języki / 48h | Zweryfikowane z repo, do re-checku tuż przed townhallem | Przed townhallem |

---

## 7. Technical implementation

### Plik docelowy
`docs/AERO_Hackathon_Presentation.html` — **nowy** plik, niezależny od istniejącego `docs/AERO_Presentation.html` (tamten pozostaje jako prezentacja produktowa).

### Struktura pliku
Single self-contained HTML (jak istniejąca prezentacja):
- `<head>`: meta, fonts preconnect, inline CSS
- `<body>`: bg-layer (gradient+particles+grid), slides-container z 6 `<section class="slide">`, navigation dots, counter, progress bar
- `<script>`: slide navigation, keyboard handlers, swipe support, screencast autoplay, number counter animations (slajd 4)

### External dependencies
- Google Fonts: Inter + JetBrains Mono (preconnect + stylesheet)
- Screencast: embedded `.gif` lub `.mp4` (file://) — **offline-friendly**, zero network calls during prezentacji
- Żadnych bibliotek JS — czysty vanilla (AERO_Presentation.html już tak robi)

### Cross-browser
- Chrome + Firefox (mandatory)
- Safari (best effort)
- Edge (best effort)

### File size target
- HTML: ≤100 KB
- Screencast MP4: ≤3 MB (preferowane nad GIF dla jakości/rozmiaru)

---

## 8. Verification plan

1. **Content accuracy** — fakty i liczby ze slajdu 4 muszą być prawdziwe w dniu townhallu. Re-run:
   - `git rev-list --count HEAD` (commity)
   - `grep -rE "@router\.(get|post|put|delete|patch)" backend/app/api/ | wc -l` (endpointy — z korektą na multi-line decorators)
   - `find backend/tests -name "test_*.py" -exec grep -cE "^\s*(async )?def test_" {} + | awk -F: '{s+=$NF} END {print s}'` (testy backend)
   - `grep -rE "^\s*test\(" frontend/e2e/ | wc -l` (testy E2E)

2. **Visual regression** — otworzyć `docs/AERO_Hackathon_Presentation.html` w Chrome/Firefox:
   - Wszystkie 6 slajdów renderują się w 16:9
   - Animacje płynne (60fps, GPU-accelerated transforms)
   - Navigation ← →, dots, swipe działa
   - Slide counter updatuje się
   - Responsywny dla 1920×1080 i 1440×900

3. **Screencast** — loop płynny, autoplay muted działa, czas ≤30 sek

4. **Timing rehearsal** — prezenterzy czytają speaker notes na głos z timerem:
   - Target: 30 + 150 + 150 + 180 + 180 + 90 = **780 sek = 13 min** + 2 min transitions/buffer = 15 min

5. **Two-presenter flow** — sprawdzić transitions między prezenterami (slajdy 3→4 i 5→6 to punkty zmiany), ćwiczyć "przekazanie mikrofonu"

6. **Content review** — SSDLC/security perspektywa: czy żaden slajd nie pokazuje sekretów, realnych URL, danych osobowych?

---

## 9. Out of scope

- **Tłumaczenie na angielski** — nie w tej wersji (PL audience)
- **PDF export** — nie priorytet, HTML wystarczy
- **Speaker view z notatkami** — speaker notes w tym spec, nie w UI prezentacji
- **Live demo backup** — świadomie pomijamy (decyzja: tylko screencast)
- **Modyfikacja istniejącej** `docs/AERO_Presentation.html` — zostaje w spokoju
- **Deployment na serwer** — prezentacja uruchamiana lokalnie z pliku HTML
