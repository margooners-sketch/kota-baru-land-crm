// Server Actions — semua mutasi data CRM.
// Aturan: login wajib; ubah data pelanggan/unit/flyering/bukutamu = semua peran aktif;
// kelola akun & reset data = Owner/Manager (reset = Owner saja).
'use server';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { all, get, run, nowIso } from '@/lib/db';
import { createSession, destroySession, getSessionUser, requireUser } from '@/lib/auth';

const STAGE_KEYS = ['minat', 'survei', 'bi_checking', 'booking', 'berkas', 'bank_kpr', 'sp3k', 'akad', 'serah_terima', 'naik_shm'];

export async function loginAction(formData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const acc = await get('SELECT * FROM accounts WHERE username = ?', [username]);
  if (!acc || !acc.active) return { error: 'Akun tidak ditemukan atau tidak aktif.' };
  const ok = await bcrypt.compare(password, acc.password_hash);
  if (!ok) return { error: 'Password salah.' };
  await run('UPDATE accounts SET last_login_at = ? WHERE id = ?', [nowIso(), acc.id]);
  await createSession(acc.id);
  redirect('/dashboard');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

async function mustLogin() {
  const u = await getSessionUser();
  if (!u) redirect('/login');
  return u;
}
async function mustManager() {
  const u = await mustLogin();
  if (u.role !== 'owner' && u.role !== 'manager') redirect('/dashboard');
  return u;
}

// ---------- Pelanggan ----------
export async function addCustomer(formData) {
  await mustLogin();
  const name = String(formData.get('name') || '').trim();
  const phone = String(formData.get('phone') || '').replace(/\D/g, '');
  if (!name || !phone) return { error: 'Nama dan nomor HP wajib diisi.' };
  const dup = await get('SELECT id FROM customers WHERE phone = ?', [phone]);
  if (dup) return { error: 'Nomor HP sudah terdaftar (pelanggan #' + dup.id + ').' };
  const r = await run(
    `INSERT INTO customers (name, phone, gender, source_spot, contact_date, stages, status, follow_up_date, notes, urgency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, phone, formData.get('gender') || null, String(formData.get('source_spot') || '') || null,
     String(formData.get('contact_date') || '') || null, JSON.stringify(['minat']), 'baru',
     String(formData.get('follow_up_date') || '') || null, String(formData.get('notes') || '') || null, 'tidak_ada']
  );
  revalidatePath('/customers');
  redirect('/customers/' + r.lastInsertRowid);
}

export async function updateCustomer(id, formData) {
  await mustLogin();
  const fields = ['name', 'phone', 'gender', 'source_spot', 'contact_date', 'flyering_date', 'follow_up_date', 'follow_up_actual_date', 'follow_up_result', 'notes', 'certificate_choice', 'booking_date', 'dp_due_date', 'berkas_due_date', 'procedure_signed_date', 'shortfall_paid_date'];
  const sets = [];
  const vals = [];
  for (const f of fields) {
    if (formData.has(f)) {
      const v = String(formData.get(f) || '');
      sets.push(f + ' = ?');
      vals.push(f === 'phone' ? v.replace(/\D/g, '') : (v || null));
    }
  }
  for (const f of ['procedure_signed', 'shortfall_paid', 'is_reminder']) {
    if (formData.has(f)) { sets.push(f + ' = ?'); vals.push(formData.get(f) ? 1 : 0); }
  }
  if (formData.has('urgency')) { sets.push('urgency = ?'); vals.push(String(formData.get('urgency'))); }
  if (sets.length) {
    vals.push(id);
    await run('UPDATE customers SET ' + sets.join(', ') + ' WHERE id = ?', vals);
  }
  revalidatePath('/customers/' + id);
  return { ok: true };
}

// Ubah pipeline: simpan stages + kunci/buka unit (booking) + closing (akad -> Sold Out).
export async function updateStages(id, formData) {
  const user = await mustLogin();
  const stages = STAGE_KEYS.filter((k) => formData.get('stage_' + k));
  const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null;
  const cert = formData.get('certificate_choice') || null;
  const cust = await get('SELECT * FROM customers WHERE id = ?', [id]);
  if (!cust) return { error: 'Pelanggan tidak ditemukan.' };
  const prevStages = JSON.parse(cust.stages || '[]');
  const hadUnit = await get('SELECT * FROM units WHERE booked_by_customer_id = ?', [id]);

  await run('UPDATE customers SET stages = ?, certificate_choice = ?, has_held_unit = ? WHERE id = ?',
    [JSON.stringify(stages), cert, stages.includes('booking') || stages.includes('akad') ? 1 : 0, id]);

  // Booking: kunci unit ke pelanggan ini
  if (stages.includes('booking') && unitId) {
    const unit = await get('SELECT * FROM units WHERE id = ?', [unitId]);
    if (unit && (!unit.booked_by_customer_id || unit.booked_by_customer_id === id) && unit.status !== 'soldout') {
      await run('UPDATE units SET booked_by_customer_id = ?, booked_at = ?, status_before_booking = ?, certificate_choice = ? WHERE id = ?',
        [id, nowIso(), unit.status, cert, unitId]);
    }
  }
  // Akad (closing): unit jadi Sold Out
  if (stages.includes('akad') && hadUnit) {
    await run("UPDATE units SET status = 'soldout', closed_at = ? WHERE id = ?", [nowIso(), hadUnit.id]);
  }
  // Tahap booking dihapus & belum akad: lepas kunci unit (kembalikan status semula)
  if (!stages.includes('booking') && !stages.includes('akad') && hadUnit && prevStages.includes('booking')) {
    await run('UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, status = COALESCE(status_before_booking, status), status_before_booking = NULL WHERE id = ?', [hadUnit.id]);
  }
  revalidatePath('/customers/' + id);
  revalidatePath('/units');
  return { ok: true };
}

// Batal booking/closing — Owner saja, kembalikan unit ke status semula.
export async function cancelBooking(id) {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh membatalkan booking/closing.' };
  const unit = await get('SELECT * FROM units WHERE booked_by_customer_id = ?', [id]);
  if (unit) {
    await run('UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, closed_at = NULL, status = COALESCE(status_before_booking, status), status_before_booking = NULL, certificate_choice = NULL WHERE id = ?', [unit.id]);
  }
  const cust = await get('SELECT stages FROM customers WHERE id = ?', [id]);
  const stages = (JSON.parse(cust?.stages || '[]')).filter((s) => !['booking', 'berkas', 'bank_kpr', 'sp3k', 'akad', 'serah_terima', 'naik_shm'].includes(s));
  await run('UPDATE customers SET stages = ?, has_held_unit = 0 WHERE id = ?', [JSON.stringify(stages), id]);
  revalidatePath('/customers/' + id);
  revalidatePath('/units');
  return { ok: true };
}

// Checklist berkas Pemberkasan (opsional — tidak mengunci Berkas/Closing).
export async function toggleChecklist(id, key, checked) {
  await mustLogin();
  const cust = await get('SELECT checklist FROM customers WHERE id = ?', [id]);
  const list = JSON.parse(cust?.checklist || '[]');
  const next = checked ? [...new Set([...list, key])] : list.filter((k) => k !== key);
  await run('UPDATE customers SET checklist = ? WHERE id = ?', [JSON.stringify(next), id]);
  revalidatePath('/customers/' + id);
  return { ok: true };
}

// ---------- Flyering ----------
export async function addFlyering(formData) {
  await mustLogin();
  const date = String(formData.get('date') || '');
  const spot = String(formData.get('spot') || '').trim();
  if (!date || !spot) return { error: 'Tanggal dan spot wajib diisi.' };
  await run('INSERT INTO flyering (date, spot, flyers_given, hours, asked_contact, customers_recorded, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [date, spot, Number(formData.get('flyers_given') || 0), Number(formData.get('hours') || 0), Number(formData.get('asked_contact') || 0), Number(formData.get('customers_recorded') || 0), String(formData.get('notes') || '') || null]);
  revalidatePath('/flyering');
  return { ok: true };
}

// ---------- Buku Tamu ----------
export async function addGuest(formData) {
  await mustLogin();
  const guestName = String(formData.get('guest_name') || '').trim();
  const phone = String(formData.get('phone') || '').replace(/\D/g, '');
  const visitDate = String(formData.get('visit_date') || '');
  if (!guestName || !phone || !visitDate) return { error: 'Nama, HP, dan tanggal kunjungan wajib diisi.' };
  const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null;
  const unit = unitId ? await get('SELECT code FROM units WHERE id = ?', [unitId]) : null;
  // Auto-input ke Daftar Pelanggan, anti-duplikat berdasarkan HP
  let customerId = null;
  const existing = await get('SELECT id FROM customers WHERE phone = ?', [phone]);
  if (existing) customerId = existing.id;
  else {
    const r = await run(
      `INSERT INTO customers (name, phone, gender, source_spot, contact_date, stages, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [guestName, phone, formData.get('gender') || null, 'Buku Tamu', visitDate, JSON.stringify(['minat']), 'baru', 'Dari Buku Tamu ' + visitDate]
    );
    customerId = r.lastInsertRowid;
  }
  await run('INSERT INTO guestbook (guest_name, phone, visit_date, arrival_time, purpose, unit_id, unit_label, notes, auto_input, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)',
    [guestName, phone, visitDate, String(formData.get('arrival_time') || '') || null, String(formData.get('purpose') || 'tanya_unit'), unitId, unit ? unit.code : null, String(formData.get('notes') || '') || null, customerId, nowIso()]);
  revalidatePath('/guestbook');
  revalidatePath('/customers');
  return { ok: true };
}

// Tautkan entri buku tamu ke pelanggan yang sudah ada (bila auto-input salah tautan).
export async function linkGuest(guestId, customerId) {
  await mustLogin();
  await run('UPDATE guestbook SET customer_id = ? WHERE id = ?', [customerId, guestId]);
  revalidatePath('/guestbook');
  return { ok: true };
}

// ---------- Pengaturan ----------
export async function changePassword(formData) {
  const user = await mustLogin();
  const current = String(formData.get('current') || '');
  const next = String(formData.get('next') || '');
  if (next.length < 6) return { error: 'Password baru minimal 6 karakter.' };
  const acc = await get('SELECT password_hash FROM accounts WHERE id = ?', [user.id]);
  if (!(await bcrypt.compare(current, acc.password_hash))) return { error: 'Password lama salah.' };
  await run('UPDATE accounts SET password_hash = ? WHERE id = ?', [await bcrypt.hash(next, 10), user.id]);
  return { ok: true };
}

export async function setClosingTarget(formData) {
  await mustManager();
  const v = Number(formData.get('target') || 0);
  await run("INSERT INTO settings (key, value) VALUES ('closingTarget', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", [String(v)]);
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function addAccount(formData) {
  await mustManager();
  const username = String(formData.get('username') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'staff');
  if (!username || !name || password.length < 6) return { error: 'Username, nama wajib; password minimal 6 karakter.' };
  const dup = await get('SELECT id FROM accounts WHERE username = ?', [username]);
  if (dup) return { error: 'Username sudah dipakai.' };
  await run('INSERT INTO accounts (username, name, password_hash, role, area, phone, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
    [username, name, await bcrypt.hash(password, 10), role, String(formData.get('area') || '') || null, String(formData.get('phone') || '').replace(/\D/g, '') || null, nowIso()]);
  revalidatePath('/settings');
  return { ok: true };
}

export async function setAccountActive(id, active) {
  const user = await mustManager();
  if (Number(id) === user.id && !active) return { error: 'Tidak bisa menonaktifkan akun sendiri.' };
  await run('UPDATE accounts SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
  revalidatePath('/settings');
  return { ok: true };
}

// Reset Pelanggan + Transaksi (Zona Berbahaya) — Owner saja. Unit & master unit TIDAK direset.
export async function resetCustomers() {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh reset.' };
  await run('DELETE FROM guestbook');
  await run('DELETE FROM customer_documents');
  await run('DELETE FROM flyering');
  await run('UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, closed_at = NULL, status_before_booking = NULL, certificate_choice = NULL');
  await run('DELETE FROM customers');
  revalidatePath('/dashboard');
  redirect('/dashboard');
}
