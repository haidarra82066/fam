require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors'); // Falls du CORS benötigst

const app = express();
const port = 4000;

const db = new sqlite3.Database('./database.sqlite');

// Initialisiere die Datenbank
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        tree TEXT
    )`);
});

// Middleware
app.use(express.json());
app.use(express.static('frontend')); // Statische Dateien bereitstellen
app.use(cors()); // Falls nötig für Cross-Origin-Anfragen

// Route für den Root-Pfad hinzufügen
app.get('/', (req, res) => {
    res.send('Willkommen auf der Familienbaum-Website! I Love JANA');
});

// Benutzer-Login simulieren
app.post('/login', (req, res) => {
    const { username } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (row) return res.json(row);
        db.run(`INSERT INTO users (username, tree) VALUES (?, ?)`, [username, '[]'], function(err) {
            if (err) return res.status(500).send(err.message);
            res.json({ id: this.lastID, username, tree: [] });
        });
    });
});

// Baum speichern
app.post('/save', (req, res) => {
    const { username, tree } = req.body;
    db.run(`UPDATE users SET tree = ? WHERE username = ?`, [JSON.stringify(tree), username], function(err) {
        if (err) return res.status(500).send(err.message);
        res.sendStatus(200);
    });
});

// Server starten
app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});

// DB-Verbindung schließen bei Programmende
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error("Fehler beim Schließen der DB:", err.message);
        } else {
            console.log("Datenbankverbindung geschlossen.");
        }
        process.exit(0);
    });
});
