| ID | Funkcija / Opis zahteve | Zaslonska maska (Prototip) | Podatkovne tabele (Entitete) |
| :--- | :--- | :--- | :--- |
| **Z1** | **Varna registracija in prijava:** Spletna včlanitev z varnim preverjanjem e-maila in ustvarjanjem uporabniškega računa. Dodelitev "Osnovnega" statusa. | Maska 1 (Prijava), Maska 2 (Registracija) | `STRANKA`, `STATUS` |
| **Z2** | **Izdaja kartice lojalnosti:** Evidentiranje za sistemski proces pošiljanja fizične kartice po pošti. | Maska 3 (Nadzorna plošča - prikaz), *Zaledni proces* | `KARTICA_ZVESTOBE`, `STRANKA` |
| **Z3** | **Mesečni preračun statusov:** Sistemsko preverjanje zneskov nakupov iz preteklega meseca in dodeljevanje ustreznih nivojev lojalnosti. | Maska 10 (Upravljanje pravil), *Zaledni proces* | `STRANKA`, `NAKUP`, `STATUS` |
| **Z4** | **Izračun točk zvestobe:** Dodeljevanje točk glede na določen status in znesek nakupa (po tabeli točkovanja). Izvede se po preračunu statusa. | Maska 10 (Upravljanje pravil), *Zaledni proces* | `STRANKA`, `NAKUP`, `PRAVILO_TOCKOVANJA` |
| **Z5** | **Pregled in koriščenje točk:** Omogočanje stranki, da pregleduje stanje točk in jih koristi za nagrade iz nakupnega programa. | Maska 3 (Nadzorna plošča), Maska 5 (Katalog nagrad) | `STRANKA`, `NAGRADA`, `KORISCENJE_NAGRADE` |
| **Z6** | **Pregled zneskov nakupov:** Stranka lahko na portalu preveri zgodovino svojih opravljenih nakupov. | Maska 4 (Zgodovina nakupov) | `NAKUP`, `STRANKA` |
| **Z7** | **Pregled statusov strank:** Administrator lahko pregleduje bazo strank, filtrira po obdobjih in trenutnih statusih. | Maska 8 (Pregled strank in statusov) | `STRANKA`, `STATUS` |
| **Z8** | **Statistika nakupov:** Krovni pregled administracije nad zneski nakupov in uspešnostjo programa lojalnosti. | Maska 7 (Admin Nadzorna plošča) | `NAKUP`, `STRANKA` |
| **Z9** | **SQL poizvedbe:** Zmožnost izvajanja poljubnih neposrednih poizvedb po podatkovni bazi za napredno analitiko. | Maska 11 (Poljubne SQL poizvedbe) | *Vse tabele* |
| **Z10**| **Upravljanje nakupnega programa:** Administrator lahko dodaja, ureja ali briše nagrade iz kataloga. | Maska 9 (Upravljanje nagrad) | `NAGRADA` |
| **Z11**| **Upravljanje pravil točkovanja:** Možnost dinamičnega spreminjanja meja za status (zneski) in števila dodeljenih točk. | Maska 10 (Upravljanje pravil in točkovanja) | `PRAVILO_TOCKOVANJA`, `STATUS` |
