# Primeri uporabe — IS za program lojalnosti Maestro

## PU-01: Registracija novega člana

### PU-01.1 Kratek opis

Neregistriran obiskovalec portala izpolni spletni registracijski obrazec in se včlani v program lojalnosti Maestro. Sistem preveri veljavnost e-poštnega naslova z mehanizmom double opt-in, ustvari uporabniški račun, dodeli status »Osnovni« ter sproži zaledni proces za pošiljanje fizične kartice lojalnosti po pošti. Ta primer uporabe obvezno vključuje primer uporabe Verifikacija e-poštnega naslova (`<<include>>`).

### PU-01.2 Tok dogodkov

#### PU-01.2.1 Osnovni tok dogodkov

1. Neregistriran uporabnik odpre portal in klikne povezavo »Registriraj se«.
2. Sistem prikaže registracijski obrazec (Maska 2).
3. Uporabnik izpolni vsa obvezna polja: ime, priimek, e-poštni naslov, geslo, poštni naslov ter potrdi soglasje s pogoji uporabe (GDPR).
4. Uporabnik klikne gumb »Ustvari račun«.
5. Sistem validira vnesene podatke — preveri format e-pošte, ustreznost gesla in unikatnost e-poštnega naslova v bazi.
6. Sistem ustvari neaktiven uporabniški račun in izvede primer uporabe **Verifikacija e-poštnega naslova**: generira verifikacijski žeton in pošlje potrditveno e-sporočilo na vneseni naslov.
7. Sistem prikaže sporočilo: *»Preverite svojo e-pošto in kliknite potrditveno povezavo za aktivacijo računa.«*
8. Uporabnik odpre e-sporočilo in klikne potrditveno povezavo.
9. Sistem validira žeton, aktivira uporabniški račun in dodeli začetni status »Osnovni«.
10. Sistem evidentira zahtevek za tisk in pošiljanje fizične kartice lojalnosti.
11. Sistem preusmeri uporabnika na stran za prijavo (Maska 1) s sporočilom: *»Vaš račun je bil uspešno aktiviran. Prijavite se.«*

#### PU-01.2.2 Alternativni tokovi dogodkov

**PU-01.2.2.1 — E-poštni naslov je že registriran**
Če sistem v koraku 5 ugotovi, da vneseni e-poštni naslov že obstaja v bazi, obrazca ne sprejme. Prikaže se sporočilo: *»Račun s tem e-poštnim naslovom že obstaja. Prijavite se ali ponastavite geslo.«* Tok se zaključi.

**PU-01.2.2.2 — Nepopolno izpolnjen obrazec**
Če uporabnik v koraku 4 ni izpolnil vseh obveznih polj, sistem oddaje ne sprejme. Obvezna polja so vizualno označena z rdečim opozorilom in opisnim sporočilom o napaki. Uporabnik dopolni manjkajoče podatke in ponovi korak 4.

**PU-01.2.2.3 — Verifikacijska povezava je potekla**
Če uporabnik klikne potrditveno povezavo po preteku veljavnosti žetona (npr. po 24 urah), sistem prikaže sporočilo o poteku in ponudi možnost ponovnega pošiljanja verifikacijskega e-sporočila. Tok se nadaljuje od koraka 6.

**PU-01.2.2.4 — Napaka pri pošiljanju e-pošte**
Če v koraku 6 pride do napake pri komunikaciji z e-poštnim sistemom, sistem zabeleži napako in obvesti administratorja. Uporabniku prikaže sporočilo: *»Verifikacijskega e-sporočila ni bilo mogoče poslati. Poskusite znova čez nekaj minut.«* Račun ostane neaktiven.

### PU-01.3 Predpogoji

- Uporabnik še nima registriranega računa v sistemu.
- E-poštni sistem (SMTP/API) je dosegljiv in deluje.
- Portal je dostopen prek spleta.

### PU-01.4 Popogoji

**Uspešen zaključek:**
- Uporabniški račun je aktiven in shranjen v sistemu.
- Članu je dodeljen začetni status »Osnovni«.
- Evidentiran je zahtevek za pošiljanje kartice lojalnosti.
- Uporabnik se lahko prijavi v portal.

**Neuspešen zaključek:**
- Račun ni bil ustvarjen oziroma je ostal neaktiven.
- Sistem je ohranil morebitne že vnesene podatke za ponovni poskus.
- Uporabnik je bil obveščen o vzroku neuspeha.

### PU-01.5 Prioriteta

**Must have** — Registracija je vstopna točka v program lojalnosti. Brez nje nobena druga funkcionalnost ni dostopna. Verifikacija e-poštnega naslova je hkrati varnostna in zakonska zahteva (GDPR), ki preprečuje zlorabo tujih e-poštnih naslovov.

### PU-01.6 Sprejemni testi

| ID testa | Opis testa | Pričakovan rezultat |
|:---|:---|:---|
| ST-01-01 | Registracija z veljavnimi podatki in potrditev e-pošte | Račun je aktiven, status »Osnovni« je dodeljen, evidentiran je zahtevek za kartico |
| ST-01-02 | Registracija z že obstoječim e-poštnim naslovom | Sistem prikaže ustrezno napako, račun ni ustvarjen |
| ST-01-03 | Oddaja obrazca z manjkajočimi obveznimi polji | Sistem označi manjkajoča polja, oddaja je zavrnjena |
| ST-01-04 | Klik na poteklo verifikacijsko povezavo | Sistem ponudi možnost ponovnega pošiljanja e-sporočila |
| ST-01-05 | Registracija z neveljavnim formatom e-pošte (npr. »test@«) | Sistem prikaže validacijsko napako pri polju e-pošte |

## PU-02: Prijava v portal

### PU-02.1 Kratek opis

Registriran in aktiviran član programa se prijavi v spletni portal z e-poštnim naslovom in geslom. Sistem preveri poverilnice, ustvari avtenticirano sejo ter uporabnika preusmeri na nadzorno ploščo.

### PU-02.2 Tok dogodkov

#### PU-02.2.1 Osnovni tok dogodkov

1. Uporabnik odpre prijavno stran portala (Maska 1).
2. Sistem prikaže prijavni obrazec z vnosnimi polji za e-poštni naslov in geslo.
3. Uporabnik vnese e-poštni naslov in geslo ter klikne gumb »Prijava«.
4. Sistem validira format vnesenih podatkov.
5. Sistem preveri poverilnice v bazi — primerja vneseno geslo z zgoščeno vrednostjo (hash) v tabeli `UPORABNISK_RACUN`.
6. Sistem generira JWT žeton z veljavnostjo 3600 sekund in ga shrani v sejo brskalnika.
7. Sistem zabeleži čas zadnje prijave za tega uporabnika.
8. Sistem preusmeri uporabnika na Nadzorno ploščo (Maska 3) in prikaže pozdravno sporočilo z imenom člana ter trenutnim statusom lojalnosti.

#### PU-02.2.2 Alternativni tokovi dogodkov

**PU-02.2.2.1 — Napačne poverilnice**
Če sistem v koraku 5 ugotovi, da kombinacija e-pošte in gesla ni veljavna, prijave ne sprejme. Prikaže se generično sporočilo: *»E-poštni naslov ali geslo ni pravilno.«* (sistem ne razkrije, kateri podatek je napačen). Števec neuspelih poskusov se poveča za 1.

**PU-02.2.2.2 — Zaklenjen račun**
Če je račun zaklenjen po prekoračitvi števila neuspelih poskusov (npr. 5-krat zapored), sistem prijave ne dovoli. Prikaže sporočilo: *»Vaš račun je začasno zaklenjen. Preverite svojo e-pošto za navodila za odklep.«*

**PU-02.2.2.3 — Neaktiviran račun**
Če e-poštni naslov obstaja v sistemu, vendar račun še ni bil aktiviran prek verifikacijske e-pošte, sistem prijave ne dovoli. Prikaže se sporočilo: *»Vaš račun še ni aktiviran. Preverite svojo e-pošto ali zahtevajte novo verifikacijsko sporočilo.«*

**PU-02.2.2.4 — Seja je potekla med uporabo**
Če JWT žeton poteče med aktivno sejo, sistem ob naslednjem zahtevku vrne napako `401 Unauthorized` in uporabnika preusmeri na prijavno stran z obvestilom: *»Vaša seja je potekla. Prijavite se znova.«*

### PU-02.3 Predpogoji

- Uporabnik ima registriran in aktiviran račun v sistemu.
- Portal je dostopen prek spleta prek varnega protokola HTTPS.

### PU-02.4 Popogoji

**Uspešen zaključek:**
- Uporabnik ima aktivno avtenticirano sejo (JWT žeton).
- Uporabnik je preusmerjen na Nadzorno ploščo (Maska 3).
- Zabeležen je čas zadnje prijave.

**Neuspešen zaključek:**
- Seja ni bila ustvarjena.
- Sistem je ohranil število neuspelih poskusov prijave.
- Uporabnik je bil obveščen o vzroku neuspeha.

### PU-02.5 Prioriteta

**Must have** — Prijava je predpogoj za dostop do vseh zaščitenih funkcionalnosti portala. Brez varnega prijavnega mehanizma sistem ne more zagotoviti ločevanja podatkov med člani in zaščite osebnih podatkov skladno z GDPR.

### PU-02.6 Sprejemni testi

| ID testa | Opis testa | Pričakovan rezultat |
|:---|:---|:---|
| ST-02-01 | Prijava z veljavnimi poverilnicami aktiviranega računa | Seja je ustvarjena, uporabnik preusmerjen na Maska 3 |
| ST-02-02 | Prijava z napačnim geslom | Sistem prikaže generično napako, seja ni ustvarjena |
| ST-02-03 | Prijava z neobstoječim e-poštnim naslovom | Sistem prikaže generično napako (ne razkrije, da naslov ne obstaja) |
| ST-02-04 | Prijava z neaktiviranim računom | Sistem prikaže obvestilo o neaktiviranju z možnostjo ponovne verifikacije |
| ST-02-05 | 5 zaporednih neuspelih prijav | Račun se zaklene, uporabnik prejme e-pošto z navodili |
| ST-02-06 | Dostop do zaščitene strani brez veljavne seje | Sistem preusmeri na prijavno stran |

## PU-03: Koriščenje zbranih točk za nagrado

### PU-03.1 Kratek opis

Prijavljen član programa pregleduje katalog nagrad, izbere želeno ugodnost in zanjo unovči zbrane točke zvestobe. Sistem preveri zadostnost točk, izvede odbitek in zabeleži transakcijo.

### PU-03.2 Tok dogodkov

#### PU-03.2.1 Osnovni tok dogodkov

1. Prijavljeni član se v portalu pomakne na zavihek **»Katalog nagrad«** (Maska 5).
2. Sistem pridobi seznam aktivnih nagrad prek klica `GET /rewards` in ga prikaže v obliki kartičnega pregleda.
3. Sistem vizualno označi nagrade, za katere ima član dovolj točk (aktivni gumb »Koristi«), in nagrade z nezadostnim stanjem točk (sivo, z oznako »Premalo točk«).
4. Član izbere nagrado in klikne gumb **»Koristi točke«**.
5. Sistem prikaže potrditveni modal z imenom nagrade, številom točk, ki bodo odštete, in preostankom točk po uveljavitvi.
6. Član potrdi uveljavitev s klikom na **»Potrdi«**.
7. Sistem pošlje zahtevek `POST /users/me/redeem` na zaledni sistem.
8. Zaledni sistem rezervira točke, preveri zadostnost stanja, izvede odbitek točk in zabeleži transakcijo v tabeli `UVELJAVITEV_NAGRADE` in `TOCKE_TRANSAKCIJA`.
9. Sistem vrne uspešen odgovor (`200 OK`).
10. Portal prikaže obvestilo o uspešni uveljavitvi: *»Nagrada uspešno koriščena!«* in osveži prikaz stanja točk na nadzorni plošči.

#### PU-03.2.2 Alternativni tokovi dogodkov

**PU-03.2.2.1 — Nezadostno stanje točk**
Če zaledni sistem v koraku 8 ugotovi, da član nima dovolj točk (npr. med prikazom in potrditvijo je prišlo do spremembe stanja), vrne napako `422 Unprocessable Entity`. Portal prikaže opozorilo: *»Na vašem računu ni dovolj točk za to nagrado.«* Rezervirane točke se sprostijo. Tok se zaključi.

**PU-03.2.2.2 — Nagrada ni več na voljo**
Če je nagrada med postopkom uveljavitve postala neaktivna ali je zaloga padla na 0, sistem vrne napako `404 Not Found`. Portal prikaže sporočilo: *»Izbrana nagrada trenutno ni na voljo.«* Katalog se osveži. Tok se zaključi.

**PU-03.2.2.3 — Seja je potekla**
Če JWT žeton poteče med postopkom uveljavitve, sistem vrne napako `401 Unauthorized`. Portal obvesti člana in ga preusmeri na prijavno stran. Rezervirane točke se samodejno sprostijo.

**PU-03.2.2.4 — Član prekliče uveljavitev**
Če član v koraku 6 klikne »Prekliči«, sistem zapre potrditveni modal brez izvedbe kakršnega koli odbitka. Tok se zaključi brez sprememb v podatkovni bazi.

### PU-03.3 Predpogoji

- Član je prijavljen v portal z veljavno sejo.
- Član ima na računu pozitivno stanje točk zvestobe.
- V katalogu obstaja vsaj ena aktivna nagrada z razpoložljivo zalogo.

### PU-03.4 Popogoji

**Uspešen zaključek:**
- Točke so odštete z računa člana.
- Transakcija je zabeležena v tabelah `UVELJAVITEV_NAGRADE` in `TOCKE_TRANSAKCIJA`.
- Zaloga nagrade je zmanjšana za 1.
- Stanje točk na nadzorni plošči je osveženo.

**Neuspešen zaključek:**
- Točke niso bile odštete.
- Morebitne rezervirane točke so bile sproščene.
- Član je bil obveščen o vzroku neuspeha.

### PU-03.5 Prioriteta

**Must have** — Koriščenje točk je osrednja vrednost programa lojalnosti za člane. Brez te funkcionalnosti zbrane točke nimajo praktičnega pomena, kar bi negativno vplivalo na motivacijo za sodelovanje v programu.

### PU-03.6 Sprejemni testi

| ID testa | Opis testa | Pričakovan rezultat |
|:---|:---|:---|
| ST-03-01 | Koriščenje nagrade z zadostnim stanjem točk | Točke so odštete, transakcija je zabeležena, stanje osveženo |
| ST-03-02 | Koriščenje nagrade z nezadostnim stanjem točk | Sistem prikaže napako `422`, točke niso odštete |
| ST-03-03 | Koriščenje nagrade, ki je med postopkom postala neaktivna | Sistem prikaže napako `404`, katalog se osveži |
| ST-03-04 — | Preklic uveljavitve v potrditvenem modalu | Modal se zapre, točke niso odštete, baza ni spremenjena |
| ST-03-05 | Hkratno koriščenje iste nagrade z zadnjo enoto zaloge s strani dveh članov | Samo ena uveljavitev uspe, druga prejme napako o nedostopnosti |

## PU-04: Upravljanje pravil točkovanja in statusov

### PU-04.1 Kratek opis

Pooblaščeni administrator prek administrativnega vmesnika dinamično spreminja vrednosti pravil za dodeljevanje točk zvestobe in pragove za prehajanje med statusi lojalnosti — brez kakršnih koli posegov v izvorno kodo sistema. Spremembe začnejo veljati pri naslednjem mesečnem obračunu.

### PU-04.2 Tok dogodkov

#### PU-04.2.1 Osnovni tok

1. Administrator se prijavi v administrativni portal (Maska 6) in se pomakne na razdelek **»Upravljanje pravil«** (Maska 10).
2. Sistem prikaže dve sekciji: **Tabela točkovanja** (vrednosti točk glede na status in znesek nakupa) ter **Pravila prehajanja statusov** (pragovi in pogoji za napredovanje, ohranjanje in znižanje).
3. Administrator pregleda trenutne vrednosti in klikne **»Uredi«** pri željeni vrstici ali celici.
4. Sistem aktivira vnosna polja za urejanje izbrane vrednosti (inline urejanje ali modal).
5. Administrator vnese novo vrednost (npr. sprememba praga za status »Srebrni« iz 499 EUR na 599 EUR).
6. Administrator klikne **»Shrani spremembe«**.
7. Sistem prikaže potrditveni dialog: *»Sprememba pravil bo vplivala na naslednji mesečni obračun. Ste prepričani?«*
8. Administrator potrdi spremembo.
9. Sistem validira vnesene vrednosti (pozitivna števila, logična doslednost pragov).
10. Sistem shrani posodobljena pravila v tabeli `PRAVILO_TOCKOVANJA` oz. `PRAVILO_STATUSA`.
11. Sistem zabeleži spremembo v revizijsko sled: timestamp, administrator, polje, stara vrednost → nova vrednost.
12. Sistem prikaže obvestilo o uspešni shranitvi: *»Pravila so bila uspešno posodobljena in bodo upoštevana pri naslednjem mesečnem obračunu.«*

#### PU-04.2.2 Alternativni tokovi dogodkov

**PU-04.2.2.1 — Neveljavna vrednost**
Če administrator v koraku 5 vnese neveljavno vrednost (negativno število, besedilo v numeričnem polju, logično neskladje med pragovi), sistem shranjevanja ne sprejme. Prikaže se opisno opozorilo pri prizadetem polju. Tok se nadaljuje od koraka 5.

**PU-04.2.2.2 — Logično neskladje pragov**
Če administrator nastavi prag za »Zlati« status nižje od praga za »Srebrni« status, sistem prikaže opozorilo: *»Prag za višji status mora biti večji od praga za nižji status.«* Shranjevanje je zavrnjeno do odprave neskladja.

**PU-04.2.2.3 — Administrator prekliče spremembo**
Če administrator v koraku 7 (potrditveni dialog) klikne »Prekliči«, sistem zavrže vse neshranjene spremembe in obnovi prikaz prejšnjih vrednosti. Revizijska sled se ne zabeleži.

### PU-04.3 Predpogoji

- Administrator je prijavljen v administrativni portal z vlogo »Administrator«.
- V sistemu obstajajo veljavna aktivna pravila za točkovanje in statuse.

### PU-04.4 Popogoji

**Uspešen zaključek:**
- Posodobljena pravila so shranjena v podatkovni bazi.
- Sprememba je zabeležena v revizijski sledi z vsemi metapodatki.
- Novi obračun bo upošteval posodobljene vrednosti.

**Neuspešen zaključek:**
- Pravila niso bila spremenjena.
- Sistem je prikazal vzrok zavrnitve spremembe.
- Revizijska sled ni bila spremenjena.

### PU-04.5 Prioriteta

**Must have** — Konfigurabilnost poslovnih pravil brez posegov v kodo je eksplicitna zahteva naročnika (FZ-11). Naročnik si pridržuje pravico do prilagajanja pragov in vrednosti točk skladno s tržnimi potrebami, ne da bi pri tem potreboval razvijalca.

### PU-04.6 Sprejemni testi

| ID testa | Opis testa | Pričakovan rezultat |
|:---|:---|:---|
| ST-04-01 | Sprememba vrednosti točk za status »Zlati«, znesek nad 1.000 EUR iz 40 na 50 točk | Nova vrednost je shranjena, zabeležena v revizijski sledi |
| ST-04-02 | Vnos negativne vrednosti v polje točk | Sistem prikaže validacijsko napako, shranjevanje je zavrnjeno |
| ST-04-03 | Nastavitev praga »Zlati« nižje od praga »Srebrni« | Sistem prikaže opozorilo o logičnem neskladju, shranjevanje je zavrnjeno |
| ST-04-04 | Preklic spremembe v potrditvenem dialogu | Vrednosti se povrnejo na prejšnje stanje, revizijska sled ni spremenjena |
| ST-04-05 | Preverba da naslednji mesečni obračun upošteva nova pravila | Obračun uporabi posodobljene vrednosti iz baze |
| ST-04-06 | Dostop do strani za upravljanje pravil brez administratorske vloge | Sistem vrne napako `403 Forbidden`, stran ni dostopna |
