# Program lojalnosti Maestro

Ta repozitorij vsebuje specifikacijo zahtev, analizo in spremljajočo dokumentacijo za informacijski sistem programa lojalnosti Maestro.

## Sistemske zahteve

Dokument s sistemskimi zahtevami celovito opisuje projekt in vsebuje naslednje ključne sklope:

* **Zgodovina različic**
* **Kratek opis sistema**
* **Funkcionalne zahteve**
* **Nefunkcionalne zahteve**
* **Zunanji vmesniki**
* **Slovar izrazov**
* **Diagram primerov uporabe**

---

## Struktura in datoteke repozitorija

Poleg sistemskih zahtev projekt vsebuje še naslednje datoteke in mape z arhitekturnimi ter uporabniškimi specifikacijami:

* **`podatkovniModelMaestro`**: Predstavlja konceptualni podatkovni model sistema (entitete in njihove relacije).

* **`funkcionalnaDekompozicija`**: Predstavlja hierarhično razčlenitev glavnih modulov in funkcionalnosti sistema.

* **`tabelaAnaliza`**: Datoteka vsebuje zbirno tabelo sledljivosti zahtev. V njej so zbrani ID-ji zahtev, opisi zahtev, zaslonske maske in pripadajoče podatkovne tabele, ki jih posamezna zahteva uporablja oz. nanje vpliva.

* **`primeriUporabe`**: Vsebuje podrobne primere uporabe (PU-01 do PU-04) s tokovi dogodkov, predpogoji, popogoji in sprejemnimi testi za ključne funkcionalnosti sistema (registracija, prijava, koriščenje točk, upravljanje pravil).

* **`endpoints`**: Tehnična specifikacija REST API končnih točk za komunikacijo med portalom, zalednim sistemom in zunanjimi integracijami (ERP, e-pošta, tisk kartic). Vključuje primere JSON odgovorov in obravnavo napak.

* **`nacrtRazvoja`**: Razvojni načrt projekta razdeljen na 26 dvotedenskih sprintov (52 tednov) za ekipo petih razvijalcev. Vsebuje razporeditev po fazah, mejnike oddaj in Gantogram.

* **Mapa `maske/`**: Vsebuje 13 zaslonskih mask (prototipov uporabniškega vmesnika), razdeljenih na dva sklopa:
  * **Maske 0–5**: Namenjene uporabnikom (strankam na portalu) — izbira prijave, prijava, registracija, nadzorna plošča, zgodovina nakupov, katalog nagrad.
  * **Maske 6–12**: Namenjene administratorjem sistema v zalednem vmesniku — admin prijava, admin nadzorna plošča, pregled strank, upravljanje nagrad, upravljanje pravil, SQL poizvedbe, revizijska sled.

---

## Interaktivni prototip (Demo)

Interaktivni prototip uporabniškega vmesnika je dostopen na spodnjem naslovu. Prototip pokriva vse ključne zaslonske maske članske in administrativne strani portala.

🔗 **[Odpri interaktivni demo →](https://www.figma.com/make/OsBHKweYZUuR0npez80TCW/Maestro-Loyalty-Program-Screens?code-node-id=0-9&p=f&fullscreen=1)**

> Prototip je bil ustvarjen z orodjem **Figma AI (Make Designs)** na podlagi podrobnih specifikacij zaslonskih mask.

---

*Opomba: Pri snovanju, pripravi dokumentacije in analizi zahtev sta bila v pomoč uporabljena jezikovna modela Gemini in Claude. Interaktivni prototip je bil generiran s pomočjo Figma AI.*
