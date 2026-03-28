# 🍽️ MealPlanner – Deine Rezept- & Wochenplan-App

## Features
- Rezepte anlegen mit Foto, Zutaten, Tags & Zubereitung
- Portionen skalieren (Zutatenmengen passen sich an)
- Zufälligen Wochenplan generieren & manuell anpassen
- Einkaufsliste aus dem Wochenplan (nach Supermarkt-Abteilungen sortiert)
- Offline-fähig als PWA (Progressive Web App)
- Daten lokal im Browser (IndexedDB)

---

## 🚀 Deployment auf Vercel (kostenlos)

### Schritt 1: GitHub-Account
Falls du noch keinen hast: [github.com](https://github.com) → Sign up

### Schritt 2: Repository erstellen
1. Auf GitHub einloggen
2. Oben rechts auf **+** → **New repository**
3. Name: `meal-planner`
4. **Public** auswählen
5. **Create repository** klicken

### Schritt 3: Dateien hochladen
1. Auf der Repository-Seite auf **"uploading an existing file"** klicken
2. Alle Dateien und Ordner aus diesem ZIP per **Drag & Drop** reinziehen:
   - `index.html`
   - `package.json`
   - `vite.config.js`
   - `src/` (ganzer Ordner)
   - `public/` (ganzer Ordner)
3. **Commit changes** klicken

### Schritt 4: Vercel verbinden
1. Gehe zu [vercel.com](https://vercel.com)
2. **Sign up** mit GitHub-Account
3. **Add New → Project**
4. Dein `meal-planner` Repo auswählen
5. Framework Preset: **Vite**
6. **Deploy** klicken
7. Warte ~1 Minute → fertig! Du bekommst eine URL wie `meal-planner-abc.vercel.app`

### Schritt 5: Auf dem Xiaomi installieren
1. Öffne die Vercel-URL in **Chrome** auf deinem Handy
2. Tippe oben rechts auf **⋮** (drei Punkte)
3. Wähle **"Zum Startbildschirm hinzufügen"**
4. Fertig – die App ist jetzt auf deinem Homescreen! 🎉

---

## 🛠 Lokal entwickeln (optional)

```bash
npm install
npm run dev
```

Dann öffne `http://localhost:5173` im Browser.

## 📦 Build erstellen

```bash
npm run build
```

Die fertigen Dateien landen in `/dist`.
