**Avtor:** Mattia Lauzana
**Predmet:** Razvoj informacijskih sistemov

### Zgodovina različic
| Različica | Datum | Avtor | Opis sprememb |
| :--- | :--- | :--- | :--- |
| 1.0 | 18. 03. 2026 | Mattia Lauzana | Začetni osnutek specifikacije zahtev za razvoj rešitve |
| 1.1 | 25. 03. 2026 | Mattia Lauzana | Dodan diagram primerov uporabe in funkcionalno dekompozicijo |
| 1.2 | 1. 04. 2026 | Mattia Lauzana | Podatkovni model in maske za uporabnika |
| 1.3 | 8. 04. 2026 | Mattia Lauzana | Dodana tabela analiz |
| 1.4 | 6. 05. 2026 | Mattia Lauzana | Spremenjen diagram primerov uporabe |


---

## 1. Kratek opis sistema
V trgovski verigi Maestro bi želeli vpeljati program lojalnosti. Z njim želimo motivirati stranke, da čim več kupijo v naši trgovski verigi. Sistem bo sestavljen iz dveh glavnih sklopov:

1. **Zaledni sistem:** Avtomatiziran sistem, ki bo vsak mesec (na podlagi podatkov iz poslovnega IS-a) preračunal zneske preteklih nakupov stran. Najprej bo strankam glede na vnaprej določena pravila posodobil njihov status (osnovni, bronasti, srebrni, zlati), nato pa jim glede na status in znesek nakupov dodelil ustrezno število točk zvestobe.  
2. **Spletna aplikacija (Portal):** Prek spletnega portala bodo lahko stranke (člani programa) dostopale do svojega uporabniškega računa, pregledujele zbrane točke zvestobe ter jih koristile za različne nagrade. Portal bo poleg uporabniškega dela vključeval tudi administracijski vmesnik za upravljanje program.

## 2. Funkcionalne zahteve

| ID | Funkcija / Opis zahteve |
| :--- | :--- |
| **Z1** | **Varna registracija in prijava:** Spletna včlanitev z varnim preverjanjem e-maila in ustvarjanjem uporabniškega računa. Dodelitev "Osnovnega" statusa. |
| **Z2** | **Izdaja kartice lojalnosti:** Evidentiranje za sistemski proces pošiljanja fizične kartice po pošti. |
| **Z3** | **Mesečni preračun statusov:** Sistemsko preverjanje zneskov nakupov iz preteklega meseca in dodeljevanje ustreznih nivojev lojalnosti. |
| **Z4** | **Izračun točk zvestobe:** Dodeljevanje točk glede na določen status in znesek nakupa (po tabeli točkovanja). Izvede se po preračunu statusa. |
| **Z5** | **Pregled in koriščenje točk:** Omogočanje stranki, da pregleduje stanje točk in jih koristi za nagrade iz nakupnega programa. |
| **Z6** | **Pregled zneskov nakupov:** Stranka lahko na portalu preveri zgodovino svojih opravljenih nakupov. |
| **Z7** | **Pregled statusov strank:** Administrator lahko pregleduje bazo strank, filtrira po obdobjih in trenutnih statusih. |
| **Z8** | **Statistika nakupov:** Krovni pregled administracije nad zneski nakupov in uspešnostjo programa lojalnosti. |
| **Z9** | **SQL poizvedbe:** Zmožnost izvajanja poljubnih neposrednih poizvedb po podatkovni bazi za napredno analitiko. |
| **Z10**| **Upravljanje nakupnega programa:** Administrator lahko dodaja, ureja ali briše nagrade iz kataloga. |
| **Z11**| **Upravljanje pravil točkovanja:** Možnost dinamičnega spreminjanja meja za status (zneski) in števila dodeljenih točk. |

Poslovna logika: Pravila prehajanja med statusi (Vezano na Z3 in Z11)
Spodnji diagram ponazarja življenjski cikel in prehode statusa stranke na podlagi mesečnega zneska nakupov. To logiko bo zaledni sistem obdelal vsak mesec pred samim dodeljevanjem točk (Z4).

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Osnovni : Včlanitev v program
    Osnovni --> Srebrni : Nakupi prvič > 499 EUR
    
    Srebrni --> Zlati : Še 2x zapored > 500 EUR
    Zlati --> Srebrni : Nakupi < 500 EUR<br>(izguba pogojev)
    
    Srebrni --> Bronasti : 2 meseca zapored<br>nakupi < 200 EUR
    Bronasti --> Srebrni : 2 meseca zapored<br>nakupi >= 200 EUR
    
    Bronasti --> Osnovni : Nakup < 50 EUR
```
Dodeljevanje točk glede na status (Z4)

| Znesek nakupov | Bronasti | Osnovni | Srebrni | Zlati |
| **Do 200 EUR** | 0 točk | 5 točk | 7.5 točk | 10 točk |
| **Med 200 EUR in 1000 EUR** | 5 točk | 10 točk | 15 točk | 20 točk |
| **Nad 1000 EUR** | 10 točk | 20 točk | 30 točk | 40 točk |

## 3. Nefunkcionalne zahteve
| ID | Tehnična zahteva |
| :--- | :--- |
| **NZ1** |**Skalabilnost:** Sistem mora podpirati najmanj 500.000 uporabnikov (70% trenutnih strank) in biti zasnovan tako, da omogoča enostavno širitev za bistveno večje število uporabnikov za potrebe trženja v tujini. |
| **NZ2** | **Jezikovna podpora:** Uporabniški vmesnik (portal in administracija) mora podpirati slovenščino in angleščino. |
| **NZ3** | **Podatkovna baza:** Kot primarna relacijska podatkovna baza se mora uporabiti Oracle Database (že obstoječe licence v podjetju). |
| **NZ4** | **Uporabniški vmesnik (UX/UI):** Vmesnik mora biti intuitiven, odziven (responsive) in razvit z uporabo sodobnih spletnih tehnologij. |

## 4. Vmesniki
* **Poslovni IS:** Podatek o znesku opravljenih nakupov bo moč dobiti iz poslovnega IS, ki ga trgovska veriga uporablja.

## 5. Slovar izrazov
* **Program lojalnosti:** Sistem motiviranja strank, da čim več kupijo v trgovski verigi.
* **Točke zvestobe:** Točke, ki jih stranka zbira z nakupi.
* **Nivo lojalnosti (Status):** Kategorija člana (osnovni, bronasti, srebrni, zlati), v katero je stranka uvrščena glede na znesek preteklih nakupov. Status neposredno vpliva na število prejetih točk.
* **Kartica lojalnosti:** Fizični identifikator, ki ga stranka dobi po navadni pošti po uspešni včlanitvi v program.
* **Uporabniški račun:** Digitalna identiteta stranke, ki jo ta pridobi ob varni spletni registraciji in služi za identifikacijo pri vstopu na portal.
* **Portal za stranke (Spletna aplikacija):** Spletni vmesnik, ki članom programa omogoča pregled zbranih točk, koriščenje točk, pregled nakupov in nakupnega programa.
* **Administracija (Admin vmesnik):** Zavarovan del portala, namenjen zaposlenim v trgovski verigi za upravljanje pravil, nagrad, strank in pregled statistike.Poslovni IS: Zaledni (primarni) informacijski sistem trgovske verige, iz katerega sistem lojalnosti pridobiva podatke o zneskih opravljenih nakupov.
* **Nakupni program (Katalog nagrad):** Nabor nagrad oziroma ugodnosti, ki so na voljo strankam v zameno za njihove zbrane točke zvestobe.

## 6. Diagram primerov uporabe

Spodnji diagram na visoki ravni prikazuje glavne akterje v sistemu in njihove ključne interakcije (primere uporabe) s spletnim portalom, administracijskim vmesnikom ter zalednim sistemom.
```mermaid
flowchart LR
    %% Akterji
    Stranka(("👤\nStranka"))
    Admin(("👨‍💼\nAdministrator"))
    PoslovniIS[["«system»\nPoslovni IS"]]
    Cron(("⏱️\nCron\n(Časovni sprožilec)"))

    %% Skupina: Portal za stranke
    subgraph Portal ["Portal za stranke"]
        direction TB
        UC1([UC1: Registracija prek spleta])
        UC1a([UC1a: Izdaja kartice lojalnosti])
        UC1b([UC1b: Verifikacija e-pošte])

        UC2([UC2: Pregled zbranih točk])

        UC3([UC3: Koriščenje točk])
        UC3a([UC3a: Pregled zgodovine koriščenj])

        UC4([UC4: Pregled nakupnega programa])
        UC4a([UC4a: Filtriranje po kategorijah])

        UC5([UC5: Pregled zneskov nakupov])
        UC5a([UC5a: Filtriranje po obdobjih])
    end

    %% Skupina: Administracijski vmesnik
    subgraph AdminVmesnik ["Administracijski vmesnik"]
        direction TB
        UC6([UC6: Pregled statusov strank])
        UC6a([UC6a: Filtriranje po statusu])
        UC6b([UC6b: Iskanje po strankah])

        UC7([UC7: Statistika nakupov])
        UC7a([UC7a: Filtriranje po obdobjih])
        UC7b([UC7b: Izvoz podatkov])

        UC9([UC9: Upravljanje z nagradami])
        UC9a([UC9a: Dodajanje nagrade])
        UC9b([UC9b: Urejanje nagrade])
        UC9c([UC9c: Deaktivacija nagrade])

        UC10([UC10: Upravljanje pravil in točkovanja])
        UC10a([UC10a: Urejanje pogojev za status])
        UC10b([UC10b: Urejanje točkovnika])

        UC8([UC8: Poljubne poizvedbe po bazi])
        UC11([UC11: Branje iz Oracle baze])
    end

    %% Skupina: Varnost in dostop
    subgraph Varnost ["Varnost in dostop"]
        direction LR
        UC_PS([Prijava stranke])
        UC_PA([Prijava administratorja])
        UC_PG([Ponastavitev gesla])
        
        UC_PG -. "«extend»" .-> UC_PS
    end

    %% Skupina: Zaledni sistem
    subgraph Zaledje ["Zaledni sistem"]
        direction TB
        UC12([UC12: Zajem zneskov nakupov])
        UC13([UC13: Preračun statusov in točk])
        UC13a([UC13a: Ugotavljanje statusa])
        UC13b([UC13b: Dodelitev točk])
        UC13c([UC13c: Obvestilo stranki])
    end

    %% --- POVEZAVE AKTERJEV ---
    
    Stranka --- UC1
    Stranka --- UC2
    Stranka --- UC3
    Stranka --- UC4
    Stranka --- UC5

    Admin --- UC6
    Admin --- UC7
    Admin --- UC9
    Admin --- UC10
    Admin --- UC8

    Cron --- UC12
    PoslovniIS --- UC12

    %% --- RELACIJE INCLUDE & EXTEND ---

    %% Portal
    UC1 -. "«include»" .-> UC1a
    UC1 -. "«include»" .-> UC1b
    UC3a -. "«extend»" .-> UC3
    UC4a -. "«extend»" .-> UC4
    UC5a -. "«extend»" .-> UC5
    
    UC2 -. "«include»" .-> UC_PS
    UC3 -. "«include»" .-> UC_PS
    UC4 -. "«include»" .-> UC_PS
    UC5 -. "«include»" .-> UC_PS

    %% Admin
    UC6a -. "«extend»" .-> UC6
    UC6b -. "«extend»" .-> UC6
    UC7a -. "«extend»" .-> UC7
    UC7b -. "«extend»" .-> UC7
    UC9a -. "«extend»" .-> UC9
    UC9b -. "«extend»" .-> UC9
    UC9c -. "«extend»" .-> UC9
    UC10a -. "«extend»" .-> UC10
    UC10b -. "«extend»" .-> UC10
    UC8 -. "«include»" .-> UC11

    UC6 -. "«include»" .-> UC_PA
    UC7 -. "«include»" .-> UC_PA
    UC9 -. "«include»" .-> UC_PA
    UC10 -. "«include»" .-> UC_PA
    UC8 -. "«include»" .-> UC_PA

    %% Zaledje
    UC12 -. "«include»" .-> UC13
    UC13 -. "«include»" .-> UC13a
    UC13 -. "«include»" .-> UC13b
    UC13 -. "«include»" .-> UC13c

    %% --- STILSKO OBLIKOVANJE ---
    classDef portal fill:#f0f4fc,stroke:#5c7cfa,stroke-width:1px,color:#000000
    classDef admin fill:#fff4e6,stroke:#ff922b,stroke-width:1px,color:#000000
    classDef zaledje fill:#ebfbee,stroke:#40c057,stroke-width:1px,color:#000000
    classDef varnost fill:#ffe3e3,stroke:#fa5252,stroke-width:1px,color:#000000
    
    class UC1,UC1a,UC1b,UC2,UC3,UC3a,UC4,UC4a,UC5,UC5a portal
    class UC6,UC6a,UC6b,UC7,UC7a,UC7b,UC8,UC9,UC9a,UC9b,UC9c,UC10,UC10a,UC10b,UC11 admin
    class UC12,UC13,UC13a,UC13b,UC13c zaledje
    class UC_PS,UC_PA,UC_PG varnost
