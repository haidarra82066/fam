require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const cors = require('cors'); // Falls du CORS benötigst

const app = express();
const port = 4000;

const db = new sqlite3.Database('./database.sqlite');

// Initialisiere die Datenbank
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        tree TEXT,
        session_token TEXT
    )`);

    db.all(`PRAGMA table_info(users)`, (err, rows) => {
        if (err) {
            console.error('Fehler beim Lesen des Schemas:', err.message);
            return;
        }
        const hasSessionToken = rows.some((row) => row.name === 'session_token');
        if (!hasSessionToken) {
            db.run(`ALTER TABLE users ADD COLUMN session_token TEXT`);
        }
    });
});

// Middleware
app.use(express.json());
app.use(express.static('frontend')); // Statische Dateien bereitstellen
app.use(cors()); // Falls nötig für Cross-Origin-Anfragen

// Route für den Root-Pfad hinzufügen
app.get('/', (req, res) => {
    res.send('Willkommen auf der Familienbaum-Website!');
});

// Benutzer-Login simulieren
app.post('/login', (req, res) => {
    const { username } = req.body;
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 50) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }
    const normalizedUsername = username.trim();
    const sessionToken = crypto.randomBytes(32).toString('hex');
    db.get(`SELECT * FROM users WHERE username = ?`, [normalizedUsername], (err, row) => {
        if (err) return res.status(500).send(err.message);
        if (row) {
            db.run(
                `UPDATE users SET session_token = ? WHERE username = ?`,
                [sessionToken, normalizedUsername],
                function(updateErr) {
                    if (updateErr) return res.status(500).send(updateErr.message);
                    return res.json({
                        id: row.id,
                        username: normalizedUsername,
                        tree: JSON.parse(row.tree || '[]'),
                        sessionToken
                    });
                }
            );
            return;
        }
        db.run(`INSERT INTO users (username, tree, session_token) VALUES (?, ?, ?)`, [normalizedUsername, '[]', sessionToken], function(err) {
            if (err) return res.status(500).send(err.message);
            res.json({ id: this.lastID, username: normalizedUsername, tree: [], sessionToken });
        });
    });
});

// Baum speichern
app.post('/save', (req, res) => {
    const { username, tree, sessionToken } = req.body;
    if (typeof username !== 'string' || typeof sessionToken !== 'string') {
        return res.status(400).json({ error: 'Ungültige Anfrage.' });
    }
    if (!Array.isArray(tree)) {
        return res.status(400).json({ error: 'Ungültiges Baumformat.' });
    }
    const serializedTree = JSON.stringify(tree);
    if (serializedTree.length > 100000) {
        return res.status(413).json({ error: 'Baum ist zu groß.' });
    }
    db.run(`UPDATE users SET tree = ? WHERE username = ? AND session_token = ?`, [serializedTree, username.trim(), sessionToken], function(err) {
        if (err) return res.status(500).send(err.message);
        if (this.changes === 0) {
            return res.status(401).json({ error: 'Nicht autorisiert.' });
        }
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
