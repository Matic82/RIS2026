# Tehnična specifikacija: API in zaledni procesi

---

## 1. API specifikacija (REST endpoints)

Vse končne točke so zasnovane po načelih REST in ne uporabljajo predpone `/api`. Večina točk zahteva ustrezno avtentikacijo prek veljavnega JWT žetona.

### 1.1 Avtentikacija

| Metoda | Končna točka | Opis | Dostop |
|:---|:---|:---|:---|
| `POST` | `/auth/register` | Registracija nove stranke in proženje izdaje kartice. | Javno |
| `POST` | `/auth/verify-email` | Potrditev e-poštnega naslova prek verifikacijskega žetona (double opt-in). | Javno |
| `POST` | `/auth/login` | Prijava stranke v portal. | Javno |
| `POST` | `/auth/logout` | Odjava in razveljavitev JWT žetona. | Stranka |
| `POST` | `/auth/password/reset-request` | Zahteva za ponastavitev gesla — pošlje e-pošto z resetom. | Javno |
| `POST` | `/auth/password/reset` | Potrditev nove gesla z veljavnim reset žetonom. | Javno |
| `POST` | `/auth/admin/login` | Prijava administratorja. | Javno |

### 1.2 Portal za člane

| Metoda | Končna točka | Opis | Dostop |
|:---|:---|:---|:---|
| `GET` | `/users/me/dashboard` | Pridobitev trenutnega števila točk, statusa in napredka do naslednjega nivoja. | Stranka |
| `GET` | `/users/me/purchases` | Pregled zgodovine nakupov in mesečnih zneskov. | Stranka |
| `GET` | `/users/me/points/history` | Kronološka zgodovina zbiranja in koriščenja točk. | Stranka |
| `GET` | `/users/me/profile` | Pregled osebnih podatkov člana. | Stranka |
| `PUT` | `/users/me/profile` | Posodobitev osebnih podatkov člana. | Stranka |
| `GET` | `/rewards` | Pregled kataloga nagrad (nakupni program). | Stranka |
| `GET` | `/rewards/{id}` | Podrobnosti posamezne nagrade. | Stranka |
| `POST` | `/users/me/redeem` | Koriščenje zbranih točk za izbrano nagrado. | Stranka |
| `DELETE` | `/users/me/account` | Zahteva za izbris računa in osebnih podatkov (GDPR). | Stranka |

### 1.3 Administracija — stranke in statistika

| Metoda | Končna točka | Opis | Dostop |
|:---|:---|:---|:---|
| `GET` | `/admin/customers` | Pregled in filtriranje vseh članov (po statusu, obdobju, imenu). | Administrator |
| `GET` | `/admin/customers/{id}` | Podrobni vpogled v podatke posamezne stranke. | Administrator |
| `GET` | `/admin/customers/{id}/points` | Pregled stanja in zgodovine točk posamezne stranke. | Administrator |
| `GET` | `/admin/customers/{id}/status-history` | Zgodovina sprememb statusov posamezne stranke (FZ-14). | Administrator |
| `PUT` | `/admin/customers/{id}/points` | Ročna korekcija točk stranke z obvezno utemeljitvijo. | Administrator |
| `GET` | `/admin/statistics` | Agregirani pregled statistike nakupov in uspešnosti programa. | Administrator |
| `GET` | `/admin/audit-log` | Pregled revizijske sledi — spremembe statusov, točk, pravil in admin akcij (NZ-12). | Administrator |

### 1.4 Administracija — nagrade in pravila

| Metoda | Končna točka | Opis | Dostop |
|:---|:---|:---|:---|
| `GET` | `/admin/rewards` | Seznam vseh nagrad (vključno z neaktivnimi). | Administrator |
| `POST` | `/admin/rewards` | Dodajanje nove nagrade v katalog. | Administrator |
| `PUT` | `/admin/rewards/{id}` | Posodobitev podatkov o nagradi (točke, opis, zaloga). | Administrator |
| `DELETE` | `/admin/rewards/{id}` | Odstranitev nagrade iz kataloga. | Administrator |
| `GET` | `/admin/rules` | Pregled trenutnih pravil za statuse in točkovanje (FZ-11). | Administrator |
| `PUT` | `/admin/rules` | Posodobitev vrednosti pravil (pragi zneskov, število točk). | Administrator |
| `GET` | `/admin/rules/history` | Zgodovina sprememb pravil točkovanja in statusov. | Administrator |
| `POST` | `/admin/queries` | Izvajanje poljubnih SQL poizvedb po podatkovni bazi Oracle (FZ-09). | Administrator |

### 1.5 Interni sistemski endpointi

| Metoda | Končna točka | Opis | Dostop |
|:---|:---|:---|:---|
| `POST` | `/admin/import/trigger` | Ročni zagon uvoza nakupnih podatkov iz ERP sistema. | Administrator |
| `GET` | `/admin/import/status` | Pregled statusa zadnjega uvoza (uspeh, napake, statistika). | Administrator |

## 2. API vmesniki z zunanjimi sistemi

### 2.1 ERP / Poslovni IS

Komunikacija z ERP sistemom poteka v obliki mesečnega uvoza. Natančen protokol in format se dogovorita v fazi tehnične analize.

| Metoda | Končna točka (ERP stran) | Opis |
|:---|:---|:---|
| `GET` | `/erp/purchases?month={YYYY-MM}` | Pridobitev zneskov nakupov vseh članov za določeno obračunsko obdobje. |

**Primer odgovora ERP sistema:**
```json
{
  "obdobje": "2026-04",
  "podatki": [
    { "clan_id": 1042, "skupni_znesek": 520.00 },
    { "clan_id": 1043, "skupni_znesek": 89.50 }
  ]
}
```

> Alternativni formati: batch datoteka CSV/XML, direktna DB integracija — odvisno od zmogljivosti ERP sistema naročnika.

### 2.2 E-poštni sistem (SMTP / API)

| Metoda | Končna točka (interni klic) | Opis |
|:---|:---|:---|
| `POST` | `/notifications/email/verify` | Sproži pošiljanje verifikacijskega e-sporočila ob registraciji. |
| `POST` | `/notifications/email/send` | Sproži pošiljanje splošnega obvestila članu (sprememba statusa, uveljavitev nagrade). |

**Primer telesa zahtevka:**
```json
{
  "prejemnik": "janez.novak@example.com",
  "tip": "STATUS_SPREMEMBA",
  "jezik": "sl",
  "parametri": {
    "ime": "Janez",
    "novi_status": "Zlati"
  }
}
```

### 2.3 Sistem za tisk in dostavo kartic

| Metoda | Končna točka (interni klic) | Opis |
|:---|:---|:---|
| `POST` | `/cards/issue` | Posreduje podatke za tisk in pošiljanje fizične kartice ob registraciji. |
| `GET` | `/cards/{id}/status` | Preveri trenutni status pošiljanja kartice (v čakanju, poslano, dostavljeno). |

**Primer telesa zahtevka za tisk:**
```json
{
  "clan_id": 1042,
  "ime": "Janez",
  "priimek": "Novak",
  "naslov": "Dunajska cesta 1, 1000 Ljubljana",
  "stevilka_kartice": "MAE-00001042"
}
```

## 3. Sistemski / zaledni procesi (Cron jobi)

Zaledni sistem izvaja avtomatizirane procese, ki skrbijo za celovitost podatkov in pravilno nagrajevanje brez ročnega posega.

### Mesečni preračun lojalnosti (FZ-03 in FZ-04)

- **Urnik (Trigger):** Vsakega 1. v mesecu ob 00:00 (Cron: `0 0 1 * *`)
- **Vir podatkov:** Poslovni informacijski sistem (IS) trgovske verige Maestro

**Potek procesa:**

1. **Pridobivanje podatkov:** Sistem iz poslovnega IS prebere skupne zneske opravljenih nakupov za vse člane za pretekli koledarski mesec.
2. **Preverjanje statusov (FZ-03):** Na podlagi mesečnih zneskov se izvede prehajanje med statusi v skladu s pravili (npr. prehod v *Srebrni* ob nakupu nad 499 EUR, padci ob nezadostnih nakupih).
3. **Dodeljevanje točk (FZ-04):** Ko je status posodobljen, sistem stranki dodeli točke zvestobe glede na veljaven točkovnik za njen nivo in dosežen znesek nakupov.
4. **Posodobitev baze:** Končni statusi in novo stanje točk se zapišejo v Oracle podatkovno bazo.
5. **Logging:** Vsak preračun se sistemsko zabeleži za potrebe revizije in administracijskega pregleda.

## 4. Primeri JSON odgovorov in obravnava napak

Vsi odgovori sistema sledijo enotni strukturi, kjer polje `status` pove uspeh operacije, polje `data` pa vsebuje dejanske podatke.

### 4.1 Uspešni odgovori

**Prijava uporabnika (`POST /auth/login`)**

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

**Nadzorna plošča stranke (`GET /users/me/dashboard`)**

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

**Zgodovina nakupov (`GET /users/me/purchases`)**

```json
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

**Pravila točkovanja (`GET /admin/rules`)**

```json
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

### 4.2 Obravnava napak

V primeru napake sistem vrne ustrezen HTTP status in opisno sporočilo v polju `message`.

**Standardna struktura napake:**

```json
{
  "status": "error",
  "code": "STATUS_KODA",
  "message": "Opis napake v izbranem jeziku."
}
```

**Kode napak:**

| HTTP koda | Opis | Primer |
|:---|:---|:---|
| `400 Bad Request` | Neveljavni vhodni podatki. | Napačna oblika e-pošte ob registraciji. |
| `401 Unauthorized` | Manjkajoč ali neveljaven JWT žeton. | Seja je potekla — preusmeritev na prijavo. |
| `403 Forbidden` | Uporabnik nima pravic za dostop. | Stranka poskuša dostopati do admin vmesnika. |
| `404 Not Found` | Zahtevani vir ne obstaja. | Neobstoječa nagrada ali stranka. |
| `422 Unprocessable Entity` | Logična napaka pri obdelavi. | Premalo točk za koriščenje nagrade. |
| `500 Internal Server Error` | Nepričakovana napaka na strežniku. | Težava z Oracle bazo ali internim procesom. |
| `503 Service Unavailable` | Zunanji sistem nedosegljiv. | ERP sistem nedosegljiv med mesečnim uvozom. |

## 5. Primeri uporabe (Use Cases)

### PU-01: Koriščenje zbranih točk za nagrado

| Element | Opis |
|:---|:---|
| **Povezava na zahteve** | FZ-05 (Pregled in koriščenje točk) |
| **Glavni akter** | Stranka (prijavljen uporabnik portala) |
| **Kratek opis** | Stranka pregleduje katalog nagrad, izbere želeno ugodnost in zanjo unovči zbrane točke zvestobe. |
| **Predpogoji** | Stranka je prijavljena in ima na računu pozitivno stanje točk zvestobe. |
| **Popogoji** | Stranki je odšteto ustrezno število točk. V podatkovni bazi je ustvarjen nov zapis o uspešni transakciji. |

#### Glavni scenarij uspeha (Happy Path)

1. Stranka se v portalu pomakne na zavihek **"Katalog"**.
2. Sistem pridobi seznam vseh aktivnih nagrad prek klica `GET /rewards`.
3. Stranka si ogleda nagrade in klikne gumb **"Koristi točke"**.
4. Čelni del prikaže potrditveno okno z informacijo o odštetih točkah. Stranka potrdi izbiro.
5. Čelni del pošlje zahtevek na `POST /users/me/redeem`.
6. Zaledni sistem preveri točke, zapiše transakcijo in vrne uspešen odgovor (`200 OK`).
7. Sistem prikaže obvestilo *"Nagrada uspešno koriščena"* in osveži stanje točk.

#### Alternativni scenariji

| Oznaka | Scenarij | Odziv sistema |
|:---|:---|:---|
| **A1** | Nezadostno stanje točk | API vrne `422 Unprocessable Entity`. Prikaže se opozorilo: *"Na vašem računu ni dovolj točk."* |
| **A2** | Seja je potekla | API vrne `401 Unauthorized`. Sistem stranko preusmeri na prijavni zaslon. |
| **A3** | Nagrada ni več na voljo | API vrne `404 Not Found`. Prikaže se sporočilo: *"Izbrana nagrada trenutno ni na voljo."* |
