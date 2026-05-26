# Program lojalnosti Maestro

Ta repozitorij vsebuje specifikacijo zahtev, analizo, spremljajočo dokumentacijo in **implementacijo** informacijskega sistema programa lojalnosti Maestro.

---

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

* **`KonceptualniModel.png`**: Konceptualni podatkovni model sistema (entitete in relacije).
* **`funkcionalnaDekpomozicijaMaestro.png`**: Hierarhična razčlenitev glavnih modulov in funkcionalnosti.
* **`TabelaAnaliza.md`**: Zbirna tabela sledljivosti zahtev (ID-ji, opisi, maske, tabele).
* **`primeriUporabe.md`**: Podrobni primeri uporabe (PU-01 do PU-04) s tokovi dogodkov in sprejemnimi testi.
* **`Endpoints.md`**: Tehnična specifikacija REST API končnih točk.
* **`NacrtRazvojProjekta.md`**: Razvojni načrt projekta (26 sprintov).
* **Mapa `maske/`**: 13 zaslonskih mask (prototipov uporabniškega vmesnika).
* **Mapa `maestro-app/`**: Polna implementacija sistema (React portal, Node.js API, Oracle baza).

---

## Interaktivni prototip (Demo)

Interaktivni prototip uporabniškega vmesnika je dostopen na spodnjem naslovu. Prototip pokriva vse ključne zaslonske maske članske in administrativne strani portala.

🔗 **[Odpri interaktivni demo →](https://www.figma.com/make/OsBHKweYZUuR0npez80TCW/Maestro-Loyalty-Program-Screens?code-node-id=0-9&p=f&fullscreen=1)**

> Prototip je bil ustvarjen z orodjem **Figma AI (Make Designs)** na podlagi podrobnih specifikacij zaslonskih mask.

---

## Implementacija aplikacije

Polna implementacija sistema (spec v1.5) z **Oracle Database**, **Node.js API** in **React portalom** za člane in administratorje.

### Arhitektura

```
┌─────────────────┐     HTTPS/REST      ┌──────────────────┐
│  React Portal   │ ◄──────────────────► │  Express API     │
│  (Vite)         │                      │  (Node + TS)     │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │ Oracle Database  │
                                         │ (XEPDB1)         │
                                         └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │ ERP import (JSON)  │
                                         │ Monthly billing    │
                                         └──────────────────┘
```

### Predpogoji

- **Node.js** 20+
- **Docker Desktop** (za lokalni Oracle XE)
- **Oracle Instant Client** (opcijsko na Windows; `oracledb` thin mode deluje brez njega za XE)

### Hitri zagon

Vse ukaze za zagon izvajaj iz mape `maestro-app/`.

#### 1. Zaženi Oracle

```bash
cd maestro-app
docker compose up -d
```

Počakaj, da je kontejner zdrav (~2 minuti). Shema in seed SQL se izvedeta iz `maestro-app/database/`.

#### 2. API strežnik

```bash
cd maestro-app/server
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

API: http://localhost:3001

#### 3. Frontend

```bash
cd maestro-app
npm install
npm run dev
```

Portal: http://localhost:5173

Ali oboje hkrati:

```bash
cd maestro-app
npm install
npm run dev:all
```

### Demo računi

| Vloga  | Email                    | Geslo      |
|--------|--------------------------|------------|
| Admin  | admin@maestro.si         | admin123   |
| Član   | ana.novak@maestro.si     | member123  |
| Član   | marko.kovac@maestro.si   | member123  |

### Struktura projekta

```
README.md              Dokumentacija repozitorija
Sistemske_zahteve.md   Sistemske zahteve
maske/                 Zaslonske maske (specifikacija)
maestro-app/
  database/            Oracle DDL + seed
  server/              Express API + loyalty engine
  src/                 React member + admin portal
  data/                Sample ERP import file
  docker-compose.yml   Oracle XE
```

---

*Opomba: Pri snovanju, pripravi dokumentacije in analizi zahtev sta bila v pomoč uporabljena jezikovna modela Gemini in Claude. Interaktivni prototip je bil generiran s pomočjo Figma AI.*

## Author

Mattia Lauzana — Razvoj informacijskih sistemov
