# Addiator Duplex – Simulator

Eine Web-Simulation des mechanischen Taschenrechners **Addiator Duplex**
(Addieren und Subtrahieren). Reines HTML/CSS/JavaScript mit SVG – kein Build,
keine Abhängigkeiten.

## Starten

`index.html` im Browser öffnen (Doppelklick genügt). Touch- und Maus­bedienung
werden unterstützt.

## Bedienung

- **Addieren:** Schieber einer Stelle nach **unten** ziehen. Jede Raste = +1.
- **Subtrahieren:** Mit **Umdrehen** das Gerät wenden, dann Schieber nach **oben**
  ziehen.
- **Übertrag (manuell wie beim Original):** Läuft eine Stelle über die 9 bzw.
  unter die 0, wird der Schieber über den farbigen Bogen am Rand geführt. Der
  Übertrag wandert dann – auch kaskadierend – zur nächsthöheren Stelle.
- **Transparent-Modus:** Blendet die Zahnstangen (mit Zacken) und den
  Übertragshebel ein. Jede Rechnung läuft dann als Schritt-für-Schritt-
  Simulation ab: die Zahnstange scrollt um die gezählten Zacken, der Hebel
  kippt und rückt die nächste Stelle eine Zacke weiter – Überträge wandern
  sichtbar (kaskadierend) nach links.
- **Löschen:** Setzt das Register auf 0 zurück.
- **Tastatur:** Eine Stelle anklicken (fokussieren) und Ziffer `0`–`9` drücken,
  um diesen Betrag zu addieren bzw. zu subtrahieren.

## Aufbau

| Datei        | Inhalt                                              |
|--------------|-----------------------------------------------------|
| `index.html` | Grundgerüst und Bedienelemente                      |
| `model.js`   | Rechenwerk: Addition/Subtraktion mit Übertrag       |
| `app.js`     | SVG-Rendering, Drag-Bedienung, Flip, Transparenz    |
| `styles.css` | Gestaltung des Geräts und der Animationen           |
