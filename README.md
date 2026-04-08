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

## Struktura in datoteke repozitorija
Poleg sistemskih zahtev projekt vsebuje še naslednje datoteke in mape z arhitekturnimi ter uporabniškimi specifikacijami:

* **`podatkovniModelMaestro`**: Predstavlja konceptualni podatkovni model sistema (entitete in njihove relacije).
* **`funkcionalna dekompozicija`**: Predstavlja hierarhično razčlenitev glavnih modulov in funkcionalnosti sistema.
* **`tabelaAnaliza`**: Datoteka vsebuje zbirno tabelo sledljivosti zahtev. V njej so zbrani ID-ji zahtev, opisi zahtev, zaslonske maske in pripadajoče podatkovne tabele, ki jih posamezna zahteva uporablja oz. nanje vpliva.
* **Mapa `maske/`**: Vsebuje 12 zaslonskih mask (prototipov uporabniškega vmesnika), ki so razdeljene na dva sklopa:
  * **Maske 1–6**: Namenjene uporabnikom (strankam na portalu).
  * **Maske 7–12**: Namenjene administratorjem sistema v zalednem vmesniku.

---
*Opomba: Pri snovanju, pripravi dokumentacije in analizi zahtev sta bila v pomoč uporabljena jezikovna modela Gemini in Claude.*
