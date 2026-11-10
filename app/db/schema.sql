-- Skema database CRM Kota Baru Land (SQL langsung).
-- Lokal/dev: SQLite via node:sqlite (DATABASE_URL=file:./dev.db).
-- Produksi (Neon, Tahap 3): Postgres — tipe di bawah ini portabel
-- (INTEGER PRIMARY KEY -> SERIAL/INT GENERATED, TEXT tetap TEXT, REAL -> NUMERIC).
-- Jalankan: npm run db:setup

CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL, -- owner | manager | staff
  area TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT, -- laki_laki | perempuan
  source_spot TEXT,
  contact_date TEXT,
  flyering_date TEXT,
  stages TEXT NOT NULL DEFAULT '[]', -- JSON array, mis. ["minat","survei"]
  status TEXT NOT NULL DEFAULT 'baru',
  follow_up_date TEXT,
  follow_up_actual_date TEXT,
  follow_up_result TEXT,
  notes TEXT,
  certificate_choice TEXT, -- shm | shgb
  has_held_unit INTEGER NOT NULL DEFAULT 0,
  is_simulation INTEGER NOT NULL DEFAULT 0,
  incomplete INTEGER NOT NULL DEFAULT 0,
  is_reminder INTEGER NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'tidak_ada',
  booking_date TEXT,
  dp_due_date TEXT,
  berkas_due_date TEXT,
  procedure_signed INTEGER NOT NULL DEFAULT 0,
  procedure_signed_date TEXT,
  shortfall_paid INTEGER NOT NULL DEFAULT 0,
  shortfall_paid_date TEXT,
  checklist TEXT NOT NULL DEFAULT '[]' -- JSON array kunci checklist berkas yang diterima
);

CREATE TABLE IF NOT EXISTS customer_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_name TEXT,
  received_at TEXT,
  hardfile INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  cluster TEXT NOT NULL,
  type TEXT NOT NULL,
  land_area INTEGER NOT NULL,
  building_area INTEGER NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  status TEXT, -- ready | proses | soldout | NULL (=Belum dibangun)
  is_promo INTEGER NOT NULL DEFAULT 0,
  promo_notes TEXT NOT NULL DEFAULT '',
  booked_at TEXT,
  booked_by_customer_id INTEGER REFERENCES customers(id),
  closed_at TEXT,
  status_before_booking TEXT,
  certificate_choice TEXT -- shm | shgb
);

CREATE TABLE IF NOT EXISTS flyering (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  spot TEXT NOT NULL,
  flyers_given INTEGER NOT NULL DEFAULT 0,
  hours REAL NOT NULL DEFAULT 0,
  asked_contact INTEGER NOT NULL DEFAULT 0,
  customers_recorded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_simulation INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guestbook (
  id INTEGER PRIMARY KEY,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  arrival_time TEXT,
  purpose TEXT NOT NULL, -- tanya_unit | survei | booking | lainnya
  unit_id INTEGER REFERENCES units(id),
  unit_label TEXT,
  notes TEXT,
  auto_input INTEGER NOT NULL DEFAULT 1,
  customer_id INTEGER REFERENCES customers(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_followup ON customers(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_flyering_date ON flyering(date);
CREATE INDEX IF NOT EXISTS idx_guestbook_visit ON guestbook(visit_date);
