require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

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
app.use(express.static('../frontend'));

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
