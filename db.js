const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'leads.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    source TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;