-- Skema database CRM Kota Baru Land — POSTGRES (Neon, produksi).
-- Dipakai bila DATABASE_URL diawali postgres:// atau postgresql://.
-- Sengaja dibuat semirip mungkin dengan db/schema.sql (SQLite):
-- boolean = INTEGER 0/1, tanggal/waktu = TEXT ISO, agar query aplikasi yang sama
-- jalan di kedua database. Perbedaan hanya: SERIAL / GENERATOR IDENTITY,
-- TEXT tanpa DEFAULT datetime('now') (diisi dari aplikasi), dan tanpa AUTOINCREMENT.
-- Jalankan: npm run db:setup   (membaca DATABASE_URL dari env / file .env)

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  area TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  gender TEXT,
  source_spot TEXT,
  contact_date TEXT,
  flyering_date TEXT,
  stages TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'baru',
  follow_up_date TEXT,
  follow_up_actual_date TEXT,
  follow_up_result TEXT,
  notes TEXT,
  certificate_choice TEXT,
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
  checklist TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS customer_documents (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  file_name TEXT,
  received_at TEXT,
  hardfile INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Isi file soft copy berkas (dipisah dari customer_documents supaya tabel lama
-- yang sudah ada di produksi tidak perlu diubah kolomnya; dibuat 10 Nov 2026).
CREATE TABLE IF NOT EXISTS customer_document_files (
  document_id INTEGER PRIMARY KEY REFERENCES customer_documents(id) ON DELETE CASCADE,
  mime_type TEXT,
  file_size INTEGER NOT NULL DEFAULT 0,
  file_data BYTEA
);

CREATE TABLE IF NOT EXISTS units (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  cluster TEXT NOT NULL,
  type TEXT NOT NULL,
  land_area INTEGER NOT NULL,
  building_area INTEGER NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  status TEXT,
  is_promo INTEGER NOT NULL DEFAULT 0,
  promo_notes TEXT NOT NULL DEFAULT '',
  booked_at TEXT,
  booked_by_customer_id INTEGER REFERENCES customers(id),
  closed_at TEXT,
  status_before_booking TEXT,
  certificate_choice TEXT
);

CREATE TABLE IF NOT EXISTS flyering (
  id SERIAL PRIMARY KEY,
  date TEXT NOT NULL,
  spot TEXT NOT NULL,
  flyers_given INTEGER NOT NULL DEFAULT 0,
  hours DOUBLE PRECISION NOT NULL DEFAULT 0,
  asked_contact INTEGER NOT NULL DEFAULT 0,
  customers_recorded INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  is_simulation INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS guestbook (
  id SERIAL PRIMARY KEY,
  guest_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  visit_date TEXT NOT NULL,
  arrival_time TEXT,
  purpose TEXT NOT NULL,
  unit_id INTEGER REFERENCES units(id),
  unit_label TEXT,
  notes TEXT,
  auto_input INTEGER NOT NULL DEFAULT 1,
  customer_id INTEGER REFERENCES customers(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_followup ON customers(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_flyering_date ON flyering(date);
CREATE INDEX IF NOT EXISTS idx_guestbook_visit ON guestbook(visit_date);

-- ============================================================
-- MIGRASI IDEMPOTEN (10 Nov 2026) — backfill kolom.
-- CREATE TABLE IF NOT EXISTS di atas TIDAK menambah kolom baru ke
-- tabel yang sudah ada di Neon. Blok ini memastikan semua kolom
-- yang dipakai kode tersedia, tanpa menghapus data dan tanpa
-- me-recreate tabel. Aman diulang (IF NOT EXISTS).
-- Kolom sengaja ditambah tanpa NOT NULL: bila suatu kolom
-- terlewat pada tabel yang sudah berisi data, penambahan kolom
-- NOT NULL tanpa DEFAULT akan gagal; NOT NULL tetap ditegakkan
-- oleh CREATE TABLE untuk database baru, dan kode aplikasi
-- selalu mengisi kolom-kolom wajib saat INSERT.
-- ============================================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS active INTEGER DEFAULT 1;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_login_at TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS account_id INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS expires_at TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS source_spot TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS flyering_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stages TEXT DEFAULT '[]';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'baru';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS follow_up_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS follow_up_actual_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS follow_up_result TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS certificate_choice TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS has_held_unit INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_simulation INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS incomplete INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_reminder INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'tidak_ada';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS booking_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS dp_due_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS berkas_due_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS procedure_signed INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS procedure_signed_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shortfall_paid INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS shortfall_paid_date TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS checklist TEXT DEFAULT '[]';
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS received_at TEXT;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS hardfile INTEGER DEFAULT 0;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE customer_document_files ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE customer_document_files ADD COLUMN IF NOT EXISTS file_size INTEGER DEFAULT 0;
ALTER TABLE customer_document_files ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE units ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS cluster TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS land_area INTEGER;
ALTER TABLE units ADD COLUMN IF NOT EXISTS building_area INTEGER;
ALTER TABLE units ADD COLUMN IF NOT EXISTS price TEXT DEFAULT '';
ALTER TABLE units ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS is_promo INTEGER DEFAULT 0;
ALTER TABLE units ADD COLUMN IF NOT EXISTS promo_notes TEXT DEFAULT '';
ALTER TABLE units ADD COLUMN IF NOT EXISTS booked_at TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS booked_by_customer_id INTEGER;
ALTER TABLE units ADD COLUMN IF NOT EXISTS closed_at TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS status_before_booking TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS certificate_choice TEXT;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS spot TEXT;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS flyers_given INTEGER DEFAULT 0;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS hours DOUBLE PRECISION DEFAULT 0;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS asked_contact INTEGER DEFAULT 0;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS customers_recorded INTEGER DEFAULT 0;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE flyering ADD COLUMN IF NOT EXISTS is_simulation INTEGER DEFAULT 0;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS visit_date TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS arrival_time TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS purpose TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS unit_id INTEGER;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS auto_input INTEGER DEFAULT 1;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS customer_id INTEGER;
ALTER TABLE guestbook ADD COLUMN IF NOT EXISTS created_at TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS value TEXT;
