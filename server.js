const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const db = new sqlite3.Database('app.db');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// initialize tables
// users: id, name, email, password, created_at
// events: id, user_id, type, metadata, created_at

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    metadata TEXT,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

function authenticate(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({error: 'missing token'});
  const token = auth.split(' ')[1];
  jwt.verify(token, SECRET, (err, payload) => {
    if (err) return res.status(401).json({error: 'invalid token'});
    req.user = payload; // { id, email }
    next();
  });
}

app.post('/register', (req, res) => {
  const {name, email, password} = req.body;
  if (!email || !password) return res.status(400).json({error: 'email and password required'});
  const hashed = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (name, email, password, created_at) VALUES (?, ?, ?, ?)',
    [name || '', email, hashed, new Date().toISOString()], function(err) {
      if (err) {
        return res.status(400).json({error: 'user exists?'});
      }
      res.json({id: this.lastID, email});
    });
});

app.post('/login', (req, res) => {
  const {email, password} = req.body;
  if (!email || !password) return res.status(400).json({error: 'email and password required'});
  db.get('SELECT id, password FROM users WHERE email = ?', [email], (err, row) => {
    if (!row) return res.status(401).json({error: 'invalid credentials'});
    if (!bcrypt.compareSync(password, row.password)) return res.status(401).json({error: 'invalid credentials'});
    const token = jwt.sign({id: row.id, email}, SECRET, {expiresIn: '1d'});
    res.json({token});
  });
});

app.post('/events', authenticate, (req, res) => {
  const {type, metadata} = req.body;
  db.run('INSERT INTO events (user_id, type, metadata, created_at) VALUES (?, ?, ?, ?)',
    [req.user.id, type || '', JSON.stringify(metadata || {}), new Date().toISOString()], function(err) {
      if (err) return res.status(500).json({error: 'failed to log event'});
      res.json({id: this.lastID});
    });
});

app.get('/events', authenticate, (req, res) => {
  db.all('SELECT id, type, metadata, created_at FROM events WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({error: 'failed to fetch events'});
    res.json(rows);
  });
});

app.delete('/events', authenticate, (req, res) => {
  db.run('DELETE FROM events WHERE user_id = ?', [req.user.id], function(err) {
    if (err) return res.status(500).json({error: 'failed to delete'});
    res.json({deleted: this.changes});
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
