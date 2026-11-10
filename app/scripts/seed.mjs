// Seed database dari file seed Tahap 1 (../seed/*.json).
// DATABASE_URL dibaca dari environment variable atau file .env:
//   - lokal/dev:  DATABASE_URL="file:./dev.db"  -> SQLite
//   - produksi:   DATABASE_URL="postgres://..."  -> Neon (diisi sebagai env var di
//     Vercel / saat menjalankan skrip; JANGAN pernah diketik di chat).
// Jalankan:  npm run db:seed
// Akun Owner `maruf` dibuat dengan password dari env TEMP_OWNER_PASSWORD
// (default "maruf-2026-ganti") — password asli TIDAK bisa diekspor dari dashboard
// lama, jadi Bang WAJIB ganti password saat pertama login.
import { loadEnv } from './load-env.mjs';
loadEnv();
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { run, get, dbKind, ensureSchema } from '../src/lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.join(__dirname, '..', '..', 'seed'); // migrasi-vercel/seed/
const read = (f) => JSON.parse(fs.readFileSync(path.join(seedDir, f), 'utf8'));

await ensureSchema();
const kind = dbKind();
const units = read('units.json');
const customers = read('customers.json');
const flyering = read('flyering.json');
const guestbook = read('guestbook.json');
const settings = read('settings.json');

const tempPass = process.env.TEMP_OWNER_PASSWORD || 'maruf-2026-ganti';
const hash = await bcrypt.hash(tempPass, 10);
const now = new Date().toISOString();

for (const a of settings.accounts) {
  await run(`INSERT INTO accounts (id, username, name, password_hash, role, area, phone, active, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET username=excluded.username, name=excluded.name, role=excluded.role, area=excluded.area, phone=excluded.phone, active=excluded.active`,
    [a.id, a.username, a.name, hash, a.role, a.area, a.phone, a.active ? 1 : 0, a.createdAt, a.lastLoginAt]);
}

for (const u of units.units) {
  await run(`INSERT INTO units (id, code, cluster, type, land_area, building_area, price, status, is_promo, promo_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    [u.id, u.code, u.cluster, u.type, u.landArea, u.buildingArea, u.price || '', u.status, u.isPromo ? 1 : 0, u.promoNotes || '']);
}

for (const c of customers.customers) {
  await run(`INSERT INTO customers (id, name, phone, gender, source_spot, contact_date, flyering_date, stages, status, follow_up_date, follow_up_actual_date, follow_up_result, notes, certificate_choice, has_held_unit, is_simulation, incomplete, is_reminder, urgency, booking_date, dp_due_date, berkas_due_date, procedure_signed, procedure_signed_date, shortfall_paid, shortfall_paid_date, checklist)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`,
    [c.id, c.name, c.phone, c.gender, c.sourceSpot, c.contactDate, c.flyeringDate,
      JSON.stringify(c.pipelineStages || []), c.status, c.followUpDate, c.followUpActualDate,
      c.followUpResult, c.notes, c.certificateChoice, c.hasHeldUnit ? 1 : 0, 0,
      c.incomplete ? 1 : 0, c.isReminder ? 1 : 0, c.urgency || 'tidak_ada',
      c.bookingDate, c.dpDueDate, c.berkasDueDate,
      c.procedureSigned ? 1 : 0, c.procedureSignedDate, c.shortfallPaid ? 1 : 0, c.shortfallPaidDate,
      JSON.stringify(c.checklistReceivedKeys || [])]);
}

for (const f of flyering.logs) {
  await run(`INSERT INTO flyering (id, date, spot, flyers_given, hours, asked_contact, customers_recorded, notes, is_simulation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    [f.id, f.date, f.spot, f.flyersGiven, f.hours, f.askedContact, f.customersRecorded, f.notes || '', 0]);
}

for (const g of guestbook.guests) {
  await run(`INSERT INTO guestbook (id, guest_name, phone, visit_date, arrival_time, purpose, unit_id, unit_label, notes, auto_input, customer_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
    [g.id, g.guestName, g.phone, g.visitDate, g.arrivalTime, g.purpose, g.unitId, g.unitLabel, g.notes || '', g.autoInput ? 1 : 0, g.customerId, g.createdAt || now]);
}

await run(`INSERT INTO settings (key, value) VALUES ('closingTarget', ?)
  ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [String(settings.closingTargetPerMonth)]);

const counts = {
  units: (await get('SELECT COUNT(*) AS c FROM units')).c,
  customers: (await get('SELECT COUNT(*) AS c FROM customers')).c,
  flyering: (await get('SELECT COUNT(*) AS c FROM flyering')).c,
  guestbook: (await get('SELECT COUNT(*) AS c FROM guestbook')).c,
  accounts: (await get('SELECT COUNT(*) AS c FROM accounts')).c,
};
console.log(`SEED OK (${kind}):`, JSON.stringify(counts));
console.log('Akun owner: maruf / password sementara dari TEMP_OWNER_PASSWORD — WAJIB diganti saat pertama login.');
process.exit(0);
