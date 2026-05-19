# Načrt razvoja projekta: Program lojalnosti Maestro

Glede na zahtevan časovni okvir enega leta (približno 52 tednov) in ekipo petih razvijalcev, je predlagana uporaba **dotedenskih (2-tedenskih) sprintov**, kar pomeni skupno **26 sprintov**. Projekt je razdeljen na pet smiselnih faz, kjer vsaka oddaja (mejnik) predstavlja zaključen in testiran sklop funkcionalnosti.

## 1. Razporeditev ekipe (5 razvijalcev)

Za optimalno delo in pokritost vseh sistemskih zahtev je predvidena naslednja delitev vlog:
* **2x Zaledni (Backend) razvijalec / Podatkovne baze:** Skrbita za integracijo z Oracle podatkovno bazo, implementacijo poslovne logike statusov (osnovni, bronasti, srebrni, zlati) in točkovanja ter integracijo s poslovnim IS.
* **2x Čelni (Frontend) razvijalec:** Osredotočena na odziven uporabniški vmesnik za portal in administracijo z obvezno podporo za slovenščino in angleščino.
* **1x Vodja / Arhitekt / DevOps:** Skrbi za arhitekturo sistema, varnost (HTTPS/TLS in GDPR) in pripravo infrastrukture za visoko obremenjenost oziroma podporo najmanj 500.000 aktivnim članom.

---

## 2. Načrt razvoja po sprintih (26 sprintov = 52 tednov)

### 1. Oddaja: Postavitev arhitekture in varna registracija (Sprinti 1 - 5)
**Cilj:** Vzpostavitev temeljev, relacijske podatkovne baze in varnega sistema uporabniških računov.
* **Sprint 1-2:** Analiza in načrtovanje arhitekture. Vzpostavitev primarne podatkovne baze Oracle Database.
* **Sprint 3-4:** Razvoj zalednega sistema za varno registracijo strank z "double opt-in" preverjanjem e-maila ter implementacija mehanizmov za GDPR skladnost (upravljanje soglasij, izbris podatkov). Vzpostavitev ločevanja vlog (član in administrator).
* **Sprint 5:** Izdelava osnovnega grafičnega vmesnika za prijavo/registracijo. Ob registraciji se stranki dodeli status »Osnovni«. Implementacija integracije s sistemom za tisk za pošiljanje fizične kartice lojalnosti ob registraciji.
> **Oddaja 1:** Delujoč varen proces registracije, avtentikacije in osnovni skelet baze.

### 2. Oddaja: Jedro sistema in integracija s poslovnim IS (Sprinti 6 - 10)
**Cilj:** Povezava z zalednim sistemom in implementacija ključne poslovne logike programa lojalnosti.
* **Sprint 6-7:** Razvoj vmesnika za samodejni mesečni uvoz podatkov o zneskih nakupov iz zunanjega poslovnega informacijskega sistema (ERP).
* **Sprint 8-9:** Implementacija avtomatiziranega mesečnega preračuna statusov. Razvoj logike za napredovanje, ohranjanje in znižanje statusov (na podlagi mej 50 EUR, 200 EUR, 499 EUR in 500 EUR). Zmogljivost obdelave mora delovati v ozadju brez vpliva na portal.
* **Sprint 10:** Implementacija izračuna in dodeljevanja točk zvestobe po točkovalni tabeli, vedno šele po preračunu statusa.
> **Oddaja 2:** Avtomatiziran motor, ki uspešno prevzema nakupe, preračunava statuse in pravilno dodeljuje točke zvestobe.

### 3. Oddaja: Spletni portal za stranke (Sprinti 11 - 16)
**Cilj:** Strankam omogočiti intuitiven vpogled v njihove podatke in koriščenje ugodnosti.
* **Sprint 11-12:** Čelni razvoj portala za uporabnike. Stranka lahko pregleduje trenutno stanje točk, zgodovino točk in pregleduje zgodovino zneskov nakupov, razčlenjeno po mesecih.
* **Sprint 13-14:** Razvoj modula za pregled kataloga nagrad in uveljavitev točk za nagrade iz nakupnega programa.
* **Sprint 15-16:** Lokalizacija celotnega portala v slovenščino in angleščino ter testiranje odzivnega časa (nalaganje mora biti hitrejše od 2 sekund).
> **Oddaja 3:** Popolnoma delujoč uporabniški spletni portal z odlično uporabniško izkušnjo na namiznih in mobilnih napravah.

### 4. Oddaja: Administracijski vmesnik (Sprinti 17 - 21)
**Cilj:** Orodja za administratorje za nadzor, upravljanje pravil in poročanje.
* **Sprint 17-18:** Razvoj administratorskega pregledovalnika baze članov s filtriranjem po statusih in obdobjih. Implementacija krovne statistike za poslovne analize.
* **Sprint 19:** Razvoj vmesnika za upravljanje kataloga nagrad (dodajanje, urejanje, deaktivacija nagrad in določanje vrednosti v točkah).
* **Sprint 20:** Implementacija modula za dinamično spreminjanje pravil (meje statusov in točkovanje) brez poseganja v izvorno kodo. Integracija sistema za pošiljanje obvestil članom ob ključnih dogodkih.
* **Sprint 21:** Razvoj vmesnika za izvajanje neposrednih SQL poizvedb za napredno analitiko in vzpostavitev beleženja revizijske sledi o vseh spremembah.
> **Oddaja 4:** Funkcionalen in varen zaledni portal za upravljanje celotnega programa.

### 5. Oddaja: Testiranje, optimizacija in produkcija (Sprinti 22 - 26)
**Cilj:** Priprava sistema na visoko obremenjenost in zagon.
* **Sprint 22-23:** Skalabilnostno in obremenitveno testiranje, da sistem podpre vsaj 500.000 aktivnih članov. Vzpostavitev mehanizmov za varnostno kopiranje in obnovo baze.
* **Sprint 24:** Varnostni pregledi in penetracijski testi. Preverjanje varnosti sej, HTTPS komunikacije in dostopnih pravic.
* **Sprint 25:** Odpravljanje hroščev in zadnji popravki na podlagi QA testiranj. Končna priprava dokumentacije.
* **Sprint 26:** "Go-live" faza. Namestitev v produkcijsko okolje in predaja sistema, ki mora zagotavljati 99,5 % razpoložljivost.
> **Oddaja 5:** Uspešen zagon produkcijskega sistema.

---

## Časovni načrt projekta (Gantogram)

Za lažjo predstavitev in sledenje napredku je celoten enoletni razvojni cikel (26 sprintov) razdeljen na 5 glavnih mejnikov (oddaj).
<img width="954" height="562" alt="image" src="https://github.com/user-attachments/assets/8066a25a-f7fc-4c5e-8927-c9329b4eb353" />
