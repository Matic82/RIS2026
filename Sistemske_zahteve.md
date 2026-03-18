# Specifikacija zahtev za program lojalnosti Maestro

**Avtor:** Mattia Lauzana
**Predmet:** Razvoj informacijskih sistemov

### Zgodovina različic
| Različica | Datum | Avtor | Opis sprememb |
| :--- | :--- | :--- | :--- |
| 1.0 | 18. 03. 2026 | Mattia Lauzana | [cite_start]Začetni osnutek specifikacije zahtev za razvoj rešitve [cite: 71] |

---

## 1. Kratek opis sistema
[cite_start]V trgovski verigi Maestro bi želeli vpeljati program lojalnosti[cite: 4]. [cite_start]Z njim želimo motivirati stranke, da čim več kupijo v naši trgovski verigi[cite: 4]. [cite_start]Portal si predstavljamo kot spletno aplikacijo, prek katere lahko nekdo, ki je član programa, pregleduje svoje točke zvestobe ter jih koristi[cite: 13]. 

## 2. Funkcionalne zahteve

### Registracija in upravljanje uporabnikov
* [cite_start]Vsaka stranka bo lahko kadarkoli zaprosila za vključitev v program[cite: 8].
* [cite_start]Strankam bi želeli ponuditi možnost, da se v program registrirajo prek spleta[cite: 9].
* [cite_start]Prek spleta bi podali svoje osebne podatke in se registrirali[cite: 10].
* [cite_start]To mora biti narejeno tako, da bo varno, v smislu, da se ne more nekdo registrirati z elektronskim naslovom, ki ni njegov[cite: 11].
* [cite_start]Ob registraciji bi moral vsak uporabnik dobiti svoj uporabniški račun, ki ga bo lahko kasneje koristil za identifikacijo ob vstopu na portal[cite: 12].
* [cite_start]Dobila bo kartico lojalnosti [cite: 8][cite_start], ki bi jo strankam poslali po navadni pošti[cite: 12].

### Upravljanje statusov strank
* [cite_start]Imeli bi radi več nivojev lojalnosti, in sicer: osnovni, bronasti, srebrni in zlati[cite: 6].
* [cite_start]Ob včlanitvi ima stranka status osnovni[cite: 45].
* [cite_start]Ko z nakupi preteklega meseca prvič preseže 499 EUR, dobi status srebrni[cite: 46].
* [cite_start]Če še dvakrat preseže tak znesek (>500), pride v status zlati[cite: 47].
* [cite_start]Da stranka ohranja status srebrni, mora njen znesek nakupa znašati vsaj 200 EUR, za ohranjanje statusa zlati pa vsaj 500 EUR[cite: 48].
* [cite_start]Če stranka nima pogojev za ohranitev statusa zlati, pridobi status srebrni[cite: 50].
* [cite_start]Če stranka nima pogojev za ohranitev statusa srebrni in sicer dva meseca zapored, dobi status bronasti in v njem ostane, vse dokler dva zaporedna meseca ne opravi najmanj za 200 EUR nakupov oziroma, če opravi nakup pod 50 EUR, pride nazaj v osnovni status[cite: 51].

### Izračun in dodeljevanje točk zvestobe
* [cite_start]Točke zvestobe bi računali enkrat na mesec za pretekli mesec[cite: 15].
* [cite_start]Ko stranki dodeljujemo točke zvestobe, ji najprej spremenimo status, v kolikor izpolnjuje pogoje in šele potem dodelimo ustrezno število točk[cite: 52].
* [cite_start]Več kot bi znašali njeni nakupi, več točk bi stranka dobila[cite: 17].
* [cite_start]Radi pa bi imeli možnost, da ta pravila še kasneje sami spreminjamo[cite: 18].

### Spletni portal za stranke
[cite_start]Spletna aplikacija oziroma portal bo strankam omogočal vsaj naslednje možnosti[cite: 53]:
* [cite_start]pregled zbranih točk zvestobe [cite: 54]
* [cite_start]koriščenje točk [cite: 55]
* [cite_start]pregled nakupnega programa [cite: 56]
* [cite_start]pregled zneskov nakupov [cite: 57]

### Administracijski vmesnik
[cite_start]Portal naj omogoča tudi administracijo, pod čemer si predstavljamo vsaj naslednje možnosti[cite: 58]:
* [cite_start]pregled statusov strank za poljubno obdobje [cite: 59]
* [cite_start]pregled statistike nakupov [cite: 60]
* [cite_start]poljubne poizvedbe po podatkovni bazi [cite: 61]
* [cite_start]upravljanje s programom, ki je na voljo kot nagrada za točke zvestobe [cite: 62]
* [cite_start]upravljanje pravil v zvezi s prehajanjem med statusi ter nagrajevanjem [cite: 63]

## 3. Tehnične zahteve
* [cite_start]**Skalabilnost in obseg:** Pričakujemo, da bo v program vključenih vsaj 70% naših strank, kar pomeni dobri 500.000 oseb[cite: 64]. [cite_start]Informacijsko podporo bi želeli tržiti tudi izven Slovenije, zato naj bo narejena tako, da bo omogočala tudi bistveno večje število uporabnikov[cite: 65].
* [cite_start]**Jezikovna podpora:** Vsa informacijska podpora naj bo narejena tako, da bo podpirala dva jezika, slovenščino in angleščino[cite: 66].
* [cite_start]**Baza podatkov:** V podjetju imamo podatkovno bazo Oracle ter licence zanjo[cite: 67]. [cite_start]Želeli bi jo uporabiti tudi za potrebe IS za podporo programu lojalnosti[cite: 68].
* [cite_start]**Uporabniški vmesnik:** Naj bo narejen tako, da bo čim bolj intuitiven[cite: 69]. [cite_start]Uporabljene naj bodo sodobne tehnologije[cite: 69].

## 4. Vmesniki
* [cite_start]**Poslovni IS:** Podatek o znesku opravljenih nakupov bo moč dobiti iz poslovnega IS, ki ga trgovska veriga uporablja[cite: 16].

## 5. Slovar izrazov
* [cite_start]**Program lojalnosti:** Sistem motiviranja strank, da čim več kupijo v trgovski verigi[cite: 4].
* [cite_start]**Točke zvestobe:** Točke, ki jih stranka zbira z nakupi[cite: 14].
* [cite_start]**Poslovni IS:** Sistem, ki ga trgovska veriga uporablja in iz katerega se pridobiva podatek o znesku nakupov[cite: 16].
