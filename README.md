# FESTIVALS & PERFORMANCES

Samodzielne archiwum GitHub Pages występów THE BOYZ. Wygląd, kolorystyka, fonty, kafelki i responsywny układ są zgodne z repozytorium `INSTA POSTS ARCHIVE`.

## Funkcje

- kolekcje: Events by Year, Music Shows, KCON, Showcases & Comeback Lives, Road to Kingdom i THE100 Mini Concert,
- automatyczne kafelki dla nowych głównych podfolderów Google Drive,
- nowe foldery roczne są automatycznie dołączane do `Events by Year`,
- wyszukiwanie po nazwie wydarzenia, nazwie pliku lub dacie `YYMMDD`,
- filtrowanie według kolekcji, roku, rodzaju wydarzenia, rodzaju pliku i — tam, gdzie to możliwe — członka,
- miniatury filmów generowane przez Google Drive i prowadzące do odtwarzacza Drive,
- setlisty i dodatkowe informacje KCON odczytywane z arkusza Google Sheets,
- automatyczna synchronizacja dwa razy dziennie.

## Uruchomienie lokalne

Wymagany jest Node.js 22 oraz pnpm.

```bash
pnpm install
pnpm dev
```

Test i kompilacja:

```bash
pnpm test
```

## Publikacja na GitHub Pages

1. Utwórz puste repozytorium GitHub, np. `festivals-performances`.
2. Jeśli korzystasz z pobranego ZIP-a, rozpakuj go i w jego folderze wykonaj:

   ```bash
   git init -b main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/TWOJ_LOGIN/festivals-performances.git
   git push -u origin main
   ```

3. Otwórz `Settings → Pages`.
4. W `Build and deployment` wybierz `Source → GitHub Actions`.
5. Workflow `Deploy GitHub Pages` opublikuje katalog `dist`.

## Automatyczna synchronizacja

1. Udostępnij główny folder i arkusz KCON jako `Każda osoba mająca link → Wyświetlający`.
2. W projekcie Google Cloud włącz osobno:
   - `Google Drive API`,
   - `Google Sheets API`.
3. Utwórz klucz API. W jego `API restrictions` dopuść obie powyższe usługi.
4. W GitHub otwórz `Settings → Secrets and variables → Actions`.
5. Dodaj sekret o nazwie:

   ```text
   GOOGLE_DRIVE_API_KEY
   ```

6. Uruchom ręcznie `Actions → Sync Festivals and Performances → Run workflow`.

Synchronizacja działa o `05:17` i `17:17` UTC. Skanuje całe drzewo folderów rekurencyjnie. Jeśli odczyt Sheets API chwilowo się nie powiedzie, aktualizacja Drive nadal działa, a ostatnio zapisane setlisty zostają zachowane.

## Źródła

- [Główny folder Google Drive](https://drive.google.com/drive/folders/19xetEO82kCf6GjwrkCtzIB2qIA8Sepl3)
- [Arkusz KCON](https://docs.google.com/spreadsheets/d/1DjxkCu1W7fIYPtToeuWunUsWX5FpVpykGMTWwQLPm7A/edit)
"# festivals-performances" 
