| ID | Funkcija / Opis zahteve | Zaslonska maska (Prototip) | Podatkovne tabele (Entitete) |
| :--- | :--- | :--- | :--- |
| **FZ-01** | **Varna registracija in prijava:** Spletna včlanitev z varnim preverjanjem e-maila in ustvarjanjem uporabniškega računa. Dodelitev "Osnovnega" statusa. | Maska 1 (Prijava), Maska 2 (Registracija) | `STRANKA`, `STATUS` |
| **FZ-02** | **Izdaja kartice lojalnosti:** Evidentiranje za sistemski proces pošiljanja fizične kartice po pošti. | Maska 3 (Nadzorna plošča - prikaz), *Zaledni proces* | `KARTICA_ZVESTOBE`, `STRANKA` |
| **FZ-03** | **Mesečni preračun statusov:** Sistemsko preverjanje zneskov nakupov iz preteklega meseca in dodeljevanje ustreznih nivojev lojalnosti. | Maska 10 (Upravljanje pravil), *Zaledni proces* | `STRANKA`, `NAKUP`, `STATUS` |
| **FZ-04** | **Izračun točk zvestobe:** Dodeljevanje točk glede na določen status in znesek nakupa (po tabeli točkovanja). Izvede se po preračunu statusa. | Maska 10 (Upravljanje pravil), *Zaledni proces* | `STRANKA`, `NAKUP`, `PRAVILO_TOCKOVANJA` |
| **FZ-05** | **Pregled in koriščenje točk:** Omogočanje stranki, da pregleduje stanje točk in jih koristi za nagrade iz nakupnega programa. | Maska 3 (Nadzorna plošča), Maska 5 (Katalog nagrad) | `STRANKA`, `NAGRADA`, `KORISCENJE_NAGRADE` |
| **FZ-06** | **Pregled zneskov nakupov:** Stranka lahko na portalu preveri zgodovino svojih opravljenih nakupov. | Maska 4 (Zgodovina nakupov) | `NAKUP`, `STRANKA` |
| **FZ-07** | **Pregled statusov strank:** Administrator lahko pregleduje bazo strank, filtrira po obdobjih in trenutnih statusih. | Maska 8 (Pregled strank in statusov) | `STRANKA`, `STATUS` |
| **FZ-08** | **Statistika nakupov:** Krovni pregled administracije nad zneski nakupov in uspešnostjo programa lojalnosti. | Maska 7 (Admin Nadzorna plošča) | `NAKUP`, `STRANKA` |
| **FZ-09** | **SQL poizvedbe:** Zmožnost izvajanja poljubnih neposrednih poizvedb po podatkovni bazi za napredno analitiko. | Maska 11 (Poljubne SQL poizvedbe) | *Vse tabele* |
| **FZ-10**| **Upravljanje nakupnega programa:** Administrator lahko dodaja, ureja ali briše nagrade iz kataloga. | Maska 9 (Upravljanje nagrad) | `NAGRADA` |
| **FZ-11**| **Upravljanje pravil točkovanja:** Možnost dinamičnega spreminjanja meja za status (zneski) in števila dodeljenih točk. | Maska 10 (Upravljanje pravil in točkovanja) | `PRAVILO_TOCKOVANJA`, `STATUS` |
