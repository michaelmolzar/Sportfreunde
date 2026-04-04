# Anleitung zur Verwaltung von Sportfreunde Helfen

Diese Datei erklärt, wie du die sportlichen Daten aktualisierst und die Logos verwaltest.

## 1. Daten aktualisieren (Spiele, Punkte, Tore)

Dank der neuen **Firebase-Integration** werden alle Änderungen, die du im Admin-Bereich vornimmst, **automatisch und in Echtzeit** für alle Besucher der Webseite aktualisiert.

### So funktioniert es:
1. **Anmelden:** Gehe auf die Webseite und klicke auf **"Admin"**.
2. **Passwort eingeben:** Gib das Admin-Passwort ein (Standard: `sportfreunde2024`).
3. **Daten ändern:**
   - Passe Spieltage, Punkte und Tore für Vereine und Nationalteams an.
   - Füge neue Teilnehmer hinzu oder entferne sie.
   - Aktiviere/Deaktiviere Titel-Boni.
4. **Speichern:** Die Daten werden **sofort** in die Datenbank geschrieben. Der "Speichern"-Button dient nur zur Bestätigung, ist aber technisch nicht zwingend notwendig, da jede Änderung direkt übernommen wird.

**Wichtig:** Du musst den Quellcode (`src/App.tsx`) NICHT mehr bearbeiten, um Punktestände zu aktualisieren! Die Werte im Code (`INITIAL_CLUBS_DATA` etc.) dienen nur noch als Startwerte, falls die Datenbank komplett leer sein sollte.

## 2. Bilddateien und Logos

Die Logos der Vereine und Nationalteams werden lokal gespeichert, um Abhängigkeiten von externen Links zu vermeiden.

### Speicherort
Alle Bilder liegen im Ordner:
`public/logos/`

### Erforderliche Dateinamen
Damit die Logos im Code korrekt zugeordnet werden, müssen die Dateinamen im Code mit den hochgeladenen Dateien übereinstimmen.

**Unterstützte Formate:** `.png`, `.svg`, `.jpg`, `.jpeg`

**Automatische Erkennung:**
Der Code versucht automatisch, die richtige Datei zu finden. Wenn im Code z.B. `/logos/austria-wien.png` steht, du aber `austria-wien.svg` hochlädst, wird das **automatisch erkannt**! Du musst den Code also nicht zwingend ändern, solange der Dateiname (ohne Endung) stimmt.

**Vorgeschlagene Dateinamen:**
- Austria Wien: `austria-wien.png` (oder `.svg`, `.jpg`)
- Rapid Wien: `rapid-wien.png` (oder `.svg`, `.jpg`)
- Villarreal: `villarreal.png` (oder `.svg`, `.jpg`)
- Österreich: `oesterreich.png` (oder `.svg`, `.jpg`)
- Spanien: `spanien.png` (oder `.svg`, `.jpg`)

### Neues Logo hinzufügen
Wenn ein neuer Verein oder ein neues Nationalteam dazukommt:

1. **Bild speichern:** Lege die Bilddatei im Ordner `public/logos/` ab (z.B. `sturm-graz.svg`).
2. **Code anpassen:** Gehe in `src/App.tsx` und füge den Pfad beim entsprechenden Datensatz hinzu (nur falls du den Verein neu im Code anlegst, was aber dank der Datenbank-Lösung für bestehende Vereine nicht mehr nötig ist).

## 3. Inhalte bearbeiten (Texte & Fotos)

### A. Community-Fotos (Mission-Seite)
Auf der "Mission"-Seite gibt es einen Bereich mit 3 Fotos. Der Code sucht automatisch nach folgenden Dateien im Ordner `public/images/` (in dieser Reihenfolge):

1. `sportfreunde1.jpg` (oder `.png`, `.svg`)
2. `sportfreunde2.jpg` (oder `.png`, `.svg`)
3. `sportfreunde3.jpg` (oder `.png`, `.svg`)

**Um die Fotos einzufügen:**
1. Erstelle den Ordner `public/images/` (falls noch nicht vorhanden).
2. Benenne deine 3 Fotos entsprechend (z.B. `sportfreunde1.png`).
3. Lade sie in den Ordner hoch.

Der Code probiert automatisch erst `.jpg`, dann `.png`, dann `.svg`. Wenn keine Datei gefunden wird, erscheint ein Platzhalter.

### B. "Wer sind wir?" Profile bearbeiten
Die Profile auf der Mission-Seite sind direkt im Code hinterlegt.

1. Öffne `src/App.tsx`.
2. Suche nach `Wer sind wir?`.
3. Dort findest du die Blöcke für die einzelnen Personen.
4. Du kannst **Name**, **Text** und das **Bild** anpassen.

**Profilbild ändern:**
Ähnlich wie bei den Community-Fotos: Bild in `public/images/` ablegen und den Pfad im Code anpassen.

```typescript
// Beispiel für ein Profilbild
<div className="w-32 h-32 ...">
  {/* Wenn du ein echtes Foto hast: */}
  <img src="/images/michael-molzar.jpg" alt="Michael Molzar" className="w-full h-full object-cover" />
  
  {/* Aktueller Platzhalter (Icon): */}
  {/* <div className="w-full h-full ..."><Users size={40} /></div> */}
</div>
```

### C. Texte anpassen (Motto, Mission, Projekte)
Alle Texte (wie das Motto "Durch Farben getrennt...", die Missions-Beschreibung oder der Text auf der "Projekte"-Seite) stehen direkt in der Datei `src/App.tsx`.

- Suche einfach mit `Strg+F` (oder `Cmd+F`) nach dem Textstück, das du ändern möchtest, und bearbeite es direkt im Editor.

## 4. Admin-Bereich Passwort & Sicherheit
Der Admin-Bereich ist passwortgeschützt.

**Standard-Passwort:** `sportfreunde2024`

**Passwort ändern:**
Das Passwort ist direkt im Code (`src/App.tsx`) hinterlegt. Um es zu ändern:
1. Öffne `src/App.tsx`.
2. Suche nach `handleAdminLogin`.
3. Ändere den Wert `'sportfreunde2024'` in dein gewünschtes Passwort.

**Hinweis zur Sicherheit:**
Das Passwort schützt den Zugang zur Benutzeroberfläche. Die Datenbank selbst erlaubt Schreibzugriffe nur für authentifizierte Benutzer (was durch die Passworteingabe im Hintergrund passiert). Lesezugriffe sind öffentlich, damit jeder den aktuellen Spendenstand sehen kann.

## 5. Favicon ändern
Um das Favicon (das kleine Icon im Browser-Tab) zu ändern:
1. Erstelle dein Logo als `.png` oder `.ico` Datei.
2. Benenne es `logo.png` (oder `favicon.ico`).
3. Lade es in den Ordner `public/` hoch (überschreibe ggf. die vorhandene Datei).
4. Falls du den Dateinamen änderst, musst du auch die `index.html` anpassen (`<link rel="icon" ...>`).
