const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';
const AUTH_TOKEN = 'zuha-crm-secret-2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Login route (open to everyone)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: AUTH_TOKEN });
  } else {
    res.status(401).json({ success: false, error: 'Invalid username or password' });
  }
});

// Auth middleware — blocks anyone without the right token
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader === `Bearer ${AUTH_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.use('/api/leads', requireAuth);

app.get('/api/leads', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  res.json(leads);
});

app.post('/api/leads', (req, res) => {
  const { name, email, phone, source } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const stmt = db.prepare('INSERT INTO leads (name, email, phone, source) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, email, phone || '', source || 'Unknown');
  const newLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newLead);
});

app.put('/api/leads/:id', (req, res) => {
  const { status, notes } = req.body;
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  const updatedStatus = status || lead.status;
  const updatedNotes = notes !== undefined ? notes : lead.notes;
  db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = ?').run(updatedStatus, updatedNotes, req.params.id);
  const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
  res.json(updatedLead);
});

app.delete('/api/leads/:id', (req, res) => {
  db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});