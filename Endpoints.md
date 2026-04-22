### Tehnična specifikacija: API in Zaledni procesi

#### 1. API Specifikacija (REST Endpoints)
Vse končne točke so zasnovane po načelih REST in ne uporabljajo predpone `/api`. Večina točk zahteva ustrezno avtentikacijo prek veljavnega JWT žetona.

| Sklop | Metoda | Končna točka | Opis | Dostop |
| :--- | :--- | :--- | :--- | :--- |
| **Avtentikacija** | `POST` | `/auth/register` | Registracija nove stranke in proženje izdaje kartice. | Javno |
| | `POST` | `/auth/login` | Prijava stranke v portal. | Javno |
| | `POST` | `/auth/admin/login` | Prijava administratorja. | Javno |
| **Portal za stranke** | `GET` | `/users/me/dashboard` | Pridobitev trenutnega števila točk in statusa. | Stranka |
| | `GET` | `/users/me/purchases` | Pregled zgodovine nakupov in zneskov. | Stranka |
| | `GET` | `/rewards` | Pregled kataloga nagrad (nakupni program). | Stranka |
| | `POST` | `/users/me/redeem` | Koriščenje zbranih točk za izbrano nagrado. | Stranka |
| **Administracija** | `GET` | `/admin/statistics` | Pregled statistike nakupov in uspešnosti programa. | Administrator |
| | `GET` | `/admin/customers` | Pregled in filtriranje statusov vseh strank. | Administrator |
| | `GET` | `/admin/customers/{id}` | Podrobni vpogled v podatke posamezne stranke. | Administrator |
| | `POST` | `/admin/rewards` | Dodajanje novih nagrad v sistem. | Administrator |
| | `PUT` | `/admin/rewards/{id}` | Posodobitev podatkov o nagradi (točke, opis). | Administrator |
| | `DELETE`| `/admin/rewards/{id}` | Odstranitev nagrade iz kataloga. | Administrator |
| | `GET` | `/admin/rules` | Pregled trenutnih pravil za statuse in točkovanje. | Administrator |
| | `PUT` | `/admin/rules` | Upravljanje in spreminjanje pravil (vrednosti pragov). | Administrator |
| | `POST` | `/admin/queries` | Izvajanje poljubnih SQL poizvedb po podatkovni bazi Oracle. | Administrator |

**Vloge dostopa:**
* **Javno:** Dostopno vsem uporabnikom brez predhodne prijave.
* **Stranka:** Dostopno samo prijavljenim članom programa za vpogled v lastne podatke.
* **Administrator:** Zavarovan dostop, namenjen izključno zaposlenim za upravljanje celotnega sistema.

---

#### 2. Sistemski / Zaledni procesi (Cron jobi)

Zaledni sistem izvaja avtomatizirane procese, ki skrbijo za celovitost podatkov in pravilno nagrajevanje brez ročnega posega.

**Mesečni preračun lojalnosti (Z3 in Z4)**
* **Urnik (Trigger):** Vsakega 1. v mesecu ob 00:00 (Cron: `0 0 1 * *`).
* **Vir podatkov:** Poslovni informacijski sistem (IS) trgovske verige Maestro.
* **Potek procesa:**
    1.  **Pridobivanje podatkov:** Sistem iz poslovnega IS prebere skupne zneske opravljenih nakupov za vse člane za pretekli koledarski mesec.
    2.  **Preverjanje statusov (Z3):** Na podlagi mesečnih zneskov se izvede prehajanje med statusi v skladu s pravili (npr. prehod v *Srebrni* ob nakupu nad 499 EUR, padci ob nezadostnih nakupih).
    3.  **Dodeljevanje točk (Z4):** Ko je status posodobljen, sistem stranki dodeli točke zvestobe glede na veljaven točkovnik za njen nivo in dosežen znesek nakupov.
    4.  **Posodobitev baze:** Končni statusi in novo stanje točk se zapišejo v Oracle podatkovno bazo.
    5.  **Logging:** Vsak preračun se sistemsko zabeleži za potrebe revizije in administracijskega pregleda.

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
```

*Nadzorna plošča stranke (GET /users/me/dashboard)*
Vsebuje trenutno stanje točk in informacijo o napredku do naslednjega nivoja.

```json
{
  "status": "success",
  "data": {
    "zbrane_tocke": 145.5,
    "trenutni_status": {
      "id": 3,
      "naziv": "Srebrni"
    },
    "naslednji_status": {
      "naziv": "Zlati",
      "manjkajoči_znesek": 350.00
    }
  }
}
```

*Zgodovina nakupov (GET /users/me/purchases)*
Seznam transakcij, pridobljen iz poslovnega IS.

```JSON
{
  "status": "success",
  "data": [
    {
      "id": 8593,
      "znesek": 120.50,
      "datum_nakupa": "2026-03-15T14:30:00Z"
    },
    {
      "id": 8421,
      "znesek": 450.00,
      "datum_nakupa": "2026-02-28T09:15:00Z"
    }
  ]
}
```

*Pravila točkovanja (GET /admin/rules)*
Struktura, ki jo administrator uporablja za urejanje točkovnika.

```JSON
{
  "status": "success",
  "data": [
    {
      "status_id": 1,
      "status_naziv": "Osnovni",
      "znesek_od": 0.00,
      "znesek_do": 200.00,
      "dodeljene_tocke": 5.0
    },
    {
      "status_id": 4,
      "status_naziv": "Zlati",
      "znesek_od": 1000.01,
      "znesek_do": null,
      "dodeljene_tocke": 40.0
    }
  ]
}
```

**Obravnava napak (Error Handling)**

V primeru napake sistem vrne ustrezen HTTP status in opisno sporočilo o napaki v polju message.

*Standardna struktura napake:*

```JSON
{
  "status": "error",
  "code": "STATUS_KODA",
  "message": "Opis napake v izbranem jeziku."
}

```
**Pogoste kode napak:**

* **400 Bad Request:** Neveljavni vhodni podatki (npr. napačna oblika e-pošte).
* **401 Unauthorized:** Manjkajoč ali neveljaven avtentikacijski žeton.
* **403 Forbidden:** Uporabnik nima pravic za dostop (npr. stranka želi v admin vmesnik).
* **404 Not Found:** Vir ne obstaja (npr. neobstoječa nagrada).
* **422 Unprocessable Entity:** Logična napaka (npr. premalo točk za koriščenje nagrade).
* **500 Internal Server Error:** Nepričakovana napaka na strežniku ali težava z Oracle bazo.

## 9. Primeri uporabe (Use Cases)

### PU-01: Koriščenje zbranih točk za nagrado
| Element | Opis |
| :--- | :--- |
| **Povezava na zahteve:** | Z5 (Pregled in koriščenje točk) |
| **Glavni akter:** | Stranka (Prijavljen uporabnik portala) |
| **Kratek opis:** | Stranka pregleduje katalog nagrad, izbere želeno ugodnost in zanjo unovči svoje zbrane točke zvestobe. |
| **Predpogoji:** | Stranka je prijavljena in ima na računu pozitivno stanje točk zvestobe. |
| **Popogoji:** | Stranki je odšteto ustrezno število točk. V podatkovni bazi je ustvarjen nov zapis o uspešni transakciji. |

#### Glavni scenarij uspeha (Happy Path)
1. Stranka se v portalu pomakne na zavihek **"Katalog"** (Maska 5).
2. Sistem pridobi seznam vseh aktivnih nagrad prek klica `GET /rewards`.
3. Stranka si ogleda nagrade in klikne gumb **"Koristi točke"** (Maska 6).
4. Čelni del prikaže potrditveno okno o odštevanju točk. Stranka potrdi izbiro.
5. Čelni del pošlje zahtevek na `POST /users/me/redeem`.
6. Zaledni sistem preveri točke, zapiše transakcijo in vrne uspešen odgovor (`200 OK`).
7. Sistem prikaže obvestilo *"Nagrada uspešno koriščena"* in osveži stanje točk.

#### Alternativni scenariji (Napake)
* **A1 - Nezadostno stanje točk:** Če zaledni sistem ugotovi, da stranka nima dovolj točk za nagrado, vrne napako `422 Unprocessable Entity`. Sistem prikaže opozorilo: *"Na vašem računu ni dovolj točk."*
* **A2 - Seja je potekla:** Če je žeton stranke potekel, API vrne napako `401 Unauthorized`. Sistem stranko preusmeri na prijavni zaslon.
