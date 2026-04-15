### Tehnična specifikacija: API in Zaledni procesi

#### 1. API Specifikacija (REST Endpoints)
Vse končne točke so zasnovane po načelih REST in ne uporabljajo predpone `/api`. Večina točk zahteva ustrezno avtentikacijo (veljaven JWT žeton).

| Sklop | Metoda | Končna točka | Opis |
| :--- | :--- | :--- | :--- |
| **Avtentikacija** | `POST` | `/auth/register` | Registracija nove stranke in proženje izdaje kartice. |
| | `POST` | `/auth/login` | Prijava stranke v portal. |
| | `POST` | `/auth/admin/login` | Prijava administratorja. |
| **Portal za stranke** | `GET` | `/users/me/dashboard` | Pridobitev trenutnega števila točk in statusa. |
| | `GET` | `/users/me/purchases` | Pregled zgodovine nakupov in zneskov. |
| | `GET` | `/rewards` | Pregled kataloga nagrad (nakupni program). |
| | `POST` | `/users/me/redeem` | Koriščenje zbranih točk za izbrano nagrado. |
| **Administracija** | `GET` | `/admin/statistics` | Pregled statistike nakupov in uspešnosti programa. |
| | `GET` | `/admin/customers` | Pregled in filtriranje statusov vseh strank. |
| | `GET` | `/admin/customers/{id}` | Podrobni vpogled v podatke posamezne stranke. |
| | `POST` | `/admin/rewards` | Dodajanje novih nagrad v sistem. |
| | `PUT` | `/admin/rewards/{id}` | Posodobitev podatkov o nagradi (točke, opis). |
| | `DELETE`| `/admin/rewards/{id}` | Odstranitev nagrade iz kataloga. |
| | `GET` | `/admin/rules` | Pregled trenutnih pravil za statuse in točkovanje. |
| | `PUT` | `/admin/rules` | Upravljanje in spreminjanje pravil (vrednosti pragov). |
| | `POST` | `/admin/queries` | Izvajanje poljubnih SQL poizvedb po podatkovni bazi Oracle. |

---

#### 2. Sistemski / Zaledni procesi (Cron jobi)

Zaledni sistem izvaja kritične avtomatizirane procese, ki skrbijo za celovitost podatkov in pravilno nagrajevanje strank brez ročnega posega.

**Mesečni preračun lojalnosti (Z3 in Z4)**
* **Urnik (Trigger):** Vsakega 1. v mesecu ob 00:00 (Cron: `0 0 1 * *`).
* **Vir podatkov:** Poslovni informacijski sistem (IS) trgovske verige Maestro.
* **Potek procesa:**
    1.  **Pridobivanje podatkov:** Sistem iz poslovnega IS prebere skupne zneske opravljenih nakupov za vse člane za pretekli koledarski mesec.
    2.  **Preverjanje statusov (Z3):** Na podlagi mesečnih zneskov se izvede prehajanje med statusi v skladu s pravili (npr. prehod iz *Osnovnega* v *Srebrni* ob nakupu nad 499 EUR, padci ob nezadostnih nakupih).
    3.  **Dodeljevanje točk (Z4):** Ko je status uspešno posodobljen, sistem stranki dodeli točke zvestobe glede na veljaven točkovnik za njen nivo in dosežen znesek nakupov.
    4.  **Posodobitev baze:** Končni statusi in novo stanje točk se zapišejo v Oracle podatkovno bazo.
    5.  **Dnevniški zapis (Logging):** Vsak preračun se sistemsko zabeleži za potrebe revizije, odprave napak in administracijskega pregleda.

---

#### 3. Primeri JSON odgovorov in obravnava napak

Vsi odgovori sistema sledijo enotni strukturi, kjer polje `status` pove uspeh operacije, polje `data` pa vsebuje dejanske podatke.

**Uspešni odgovori (Success Responses)**

*Prijava uporabnika (`POST /auth/login`)*
Vrne JWT žeton in osnovne podatke o prijavljeni osebi.
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "user": {
      "id": 1042,
      "ime": "Janez",
      "priimek": "Novak",
      "email": "janez.novak@example.com",
      "status_naziv": "Srebrni"
    }
  }
}
