// Lapisan data — SATU API untuk dua database, dipilih dari DATABASE_URL:
//   - file:./dev.db (atau path file lain)  -> SQLite lokal via node:sqlite (tanpa binary tambahan)
//   - postgres://... / postgresql://...    -> Postgres/Neon via driver `pg` (SSL aktif untuk *.neon.tech)
// Semua query ditulis dengan placeholder `?` — diterjemahkan otomatis ke $1..$n untuk Postgres.
// Kolom boolean disimpan sebagai INTEGER 0/1 di kedua skema, tanggal sebagai TEXT ISO,
// supaya SQL yang sama jalan di SQLite maupun Postgres (lihat db/schema.sql & db/schema.pg.sql).
// SEMUA helper bersifat async — panggil dengan await.
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA_PG, SCHEMA_SQLITE } from './schema-sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(__dirname, '..', '..'); // src/lib -> root aplikasi

export function databaseUrl() {
  return process.env.DATABASE_URL || 'file:./dev.db';
}
export function dbKind() {
  const url = databaseUrl();
  return url.startsWith('postgres://') || url.startsWith('postgresql://') ? 'pg' : 'sqlite';
}

// ---------- koneksi ----------
let sqliteDb = null;
let pgPool = null;

function getSqlite() {
  if (sqliteDb) return sqliteDb;
  const url = databaseUrl();
  const p = url.startsWith('file:') ? url.slice(5) : url;
  const file = path.isAbsolute(p) ? p : path.join(appRoot, p);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  sqliteDb = new DatabaseSync(file);
  sqliteDb.exec('PRAGMA foreign_keys = ON');
  return sqliteDb;
}

function getPool() {
  if (pgPool) return pgPool;
  const url = databaseUrl();
  const isNeon = url.includes('neon.tech');
  pgPool = new pg.Pool({
    connectionString: url,
    ssl: isNeon ? { rejectUnauthorized: false } : false,
    max: 5,
  });
  pgPool.on('error', (e) => console.error('pg pool error:', e.message));
  return pgPool;
}

// ---------- skema ----------
// Skema DISEMATKAN di ./schema-sql.js (bukan dibaca dari file .sql saat runtime):
// file db/*.sql tidak ikut terbawa ke bundle serverless Vercel, dan
// fs.readFileSync di sana crash ENOENT saat query pertama (login).
let schemaPromise = null;
export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const kind = dbKind();
      const sql = kind === 'pg' ? SCHEMA_PG : SCHEMA_SQLITE;
      if (kind === 'pg') await getPool().query(sql);
      else getSqlite().exec(sql);
      return kind;
    })().catch((e) => { schemaPromise = null; throw e; });
  }
  return schemaPromise;
}

// ---------- helper query ----------
function toPgParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export async function all(sql, params = []) {
  await ensureSchema();
  if (dbKind() === 'pg') {
    const r = await getPool().query(toPgParams(sql), params);
    return r.rows;
  }
  return getSqlite().prepare(sql).all(...params);
}
export async function get(sql, params = []) {
  await ensureSchema();
  if (dbKind() === 'pg') {
    const r = await getPool().query(toPgParams(sql), params);
    return r.rows[0] ?? null;
  }
  return getSqlite().prepare(sql).get(...params) ?? null;
}
export async function run(sql, params = []) {
  await ensureSchema();
  if (dbKind() === 'pg') {
    const r = await getPool().query(toPgParams(sql), params);
    return { changes: r.rowCount ?? 0, lastInsertRowid: r.rows[0]?.id };
  }
  const r = getSqlite().prepare(sql).run(...params);
  return { changes: r.changes, lastInsertRowid: r.lastInsertRowid };
}
export async function exec(sql) {
  await ensureSchema();
  if (dbKind() === 'pg') await getPool().query(sql);
  else getSqlite().exec(sql);
}

// ---------- mapping baris DB (snake_case) -> objek camelCase untuk UI ----------
export function mapUnit(r) {
  if (!r) return null;
  return { id: r.id, code: r.code, cluster: r.cluster, type: r.type, landArea: r.land_area, buildingArea: r.building_area, price: r.price, status: r.status, isPromo: !!r.is_promo, promoNotes: r.promo_notes, bookedAt: r.booked_at, bookedByCustomerId: r.booked_by_customer_id, closedAt: r.closed_at, statusBeforeBooking: r.status_before_booking, certificateChoice: r.certificate_choice };
}
export function mapCustomer(r) {
  if (!r) return null;
  let stages = [];
  try { stages = JSON.parse(r.stages || '[]'); } catch { stages = []; }
  let checklist = [];
  try { checklist = JSON.parse(r.checklist || '[]'); } catch { checklist = []; }
  return { id: r.id, name: r.name, phone: r.phone, gender: r.gender, sourceSpot: r.source_spot, contactDate: r.contact_date, flyeringDate: r.flyering_date, stages, status: r.status, followUpDate: r.follow_up_date, followUpActualDate: r.follow_up_actual_date, followUpResult: r.follow_up_result, notes: r.notes, certificateChoice: r.certificate_choice, hasHeldUnit: !!r.has_held_unit, isSimulation: !!r.is_simulation, incomplete: !!r.incomplete, isReminder: !!r.is_reminder, urgency: r.urgency, bookingDate: r.booking_date, dpDueDate: r.dp_due_date, berkasDueDate: r.berkas_due_date, procedureSigned: !!r.procedure_signed, procedureSignedDate: r.procedure_signed_date, shortfallPaid: !!r.shortfall_paid, shortfallPaidDate: r.shortfall_paid_date, checklist };
}
export function mapFlyering(r) {
  if (!r) return null;
  return { id: r.id, date: r.date, spot: r.spot, flyersGiven: r.flyers_given, hours: r.hours, askedContact: r.asked_contact, customersRecorded: r.customers_recorded, notes: r.notes, isSimulation: !!r.is_simulation };
}
export function mapGuest(r) {
  if (!r) return null;
  return { id: r.id, guestName: r.guest_name, phone: r.phone, visitDate: r.visit_date, arrivalTime: r.arrival_time, purpose: r.purpose, unitId: r.unit_id, unitLabel: r.unit_label, notes: r.notes, autoInput: !!r.auto_input, customerId: r.customer_id, createdAt: r.created_at };
}
export function mapAccount(r) {
  if (!r) return null;
  return { id: r.id, username: r.username, name: r.name, role: r.role, area: r.area, phone: r.phone, active: !!r.active, createdAt: r.created_at, lastLoginAt: r.last_login_at };
}
export async function getSetting(key, fallback = null) {
  const row = await get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}
export function nowIso() {
  return new Date().toISOString();
}
