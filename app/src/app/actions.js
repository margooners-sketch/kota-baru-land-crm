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
  const cust = await get('SELECT procedure_signed, procedure_signed_date, shortfall_paid, shortfall_paid_date FROM customers WHERE id = ?', [id]);
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
  // Prosedur ditandatangani / kekurangan lunas: form memakai checkbox + hidden
  // input (agar "tidak dicentang" ikut terkirim). Bila ditandai selesai dan
  // tanggalnya masih kosong, isi tanggal hari ini (WIB); bila dibatalkan,
  // kosongkan tanggalnya — sesuai aturan dashboard lama.
  for (const f of ['procedure_signed', 'shortfall_paid']) {
    if (formData.has(f)) {
      const on = formData.get(f) ? 1 : 0;
      sets.push(f + ' = ?');
      vals.push(on);
      const dateField = f + '_date';
      if (on === 1 && !cust?.[dateField] && !formData.has(dateField)) {
        sets.push(dateField + ' = ?');
        vals.push(todayWib());
      } else if (on === 0 && !formData.has(dateField)) {
        sets.push(dateField + ' = ?');
        vals.push(null);
      }
    }
  }
  for (const f of ['is_reminder']) {
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

// Tanggal hari ini (WIB) dan tanggal +N hari, format YYYY-MM-DD.
function todayWib() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Validasi urutan pipeline (gate) — pesan error jelas, bukan gagal diam-diam.
function gateError(stages, cust) {
  const has = (k) => stages.includes(k);
  if (has('booking') && !(has('minat') && has('survei') && has('bi_checking')))
    return 'Booking belum bisa dicentang: pelanggan wajib sudah Minat, Survei, dan Lolos BI Checking dulu.';
  if (has('akad') && !(has('berkas') && has('bank_kpr') && has('sp3k')))
    return 'Akad belum bisa dicentang: Berkas, Bank/KPR, dan SP3K wajib sudah dicentang dulu.';
  if (has('akad') && !cust.shortfall_paid)
    return 'Akad belum bisa dicentang: kekurangan bayar wajib sudah ditandai lunas dulu (di form Data & Follow-up).';
  if (has('serah_terima') && !has('akad'))
    return 'Serah Terima belum bisa dicentang: Akad wajib sudah dicentang dulu.';
  if (has('naik_shm') && !has('akad'))
    return 'Naik SHM belum bisa dicentang: Akad wajib sudah dicentang dulu.';
  return null;
}

// Ubah pipeline: simpan stages + kunci/buka unit (booking) + closing (akad -> Sold Out).
// Aturan main (gate) ditegakkan di server: booking wajib Minat+Survei+Lolos BI
// Checking; Akad wajib Berkas+Bank/KPR+SP3K dan kekurangan lunas; Serah Terima
// dan Naik SHM wajib Akad dulu. Bila dilanggar, kembali ke halaman dengan
// pesan error yang jelas. Bila Booking disimpan dan pelanggan punya
// booking_date, dp_due_date & berkas_due_date diisi otomatis = booking+14 hari
// (hanya bila masih kosong — edit manual tidak ditimpa).
export async function updateStages(id, formData) {
  const user = await mustLogin();
  const stages = STAGE_KEYS.filter((k) => formData.get('stage_' + k));
  const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null;
  const cert = formData.get('certificate_choice') || null;
  const cust = await get('SELECT * FROM customers WHERE id = ?', [id]);
  if (!cust) return { error: 'Pelanggan tidak ditemukan.' };
  const err = gateError(stages, cust);
  if (err) redirect('/customers/' + id + '?tab=pipeline&err=' + encodeURIComponent(err));
  const prevStages = JSON.parse(cust.stages || '[]');
  const hadUnit = await get('SELECT * FROM units WHERE booked_by_customer_id = ?', [id]);

  await run('UPDATE customers SET stages = ?, certificate_choice = ?, has_held_unit = ? WHERE id = ?',
    [JSON.stringify(stages), cert, stages.includes('booking') || stages.includes('akad') ? 1 : 0, id]);

  // Jatuh tempo otomatis: booking + 14 hari (ketentuan Brosur TMB 2), hanya bila kosong.
  if (stages.includes('booking') && cust.booking_date) {
    const due = addDays(cust.booking_date, 14);
    const dSets = [];
    const dVals = [];
    if (!cust.dp_due_date) { dSets.push('dp_due_date = ?'); dVals.push(due); }
    if (!cust.berkas_due_date) { dSets.push('berkas_due_date = ?'); dVals.push(due); }
    if (dSets.length) await run('UPDATE customers SET ' + dSets.join(', ') + ' WHERE id = ?', [...dVals, id]);
  }

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
  redirect('/customers/' + id + '?tab=pipeline&msg=' + encodeURIComponent('Tahap berhasil disimpan.'));
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

// Hapus pelanggan — Owner saja. Unit yang dipegang dilepas (status semula),
// tautan buku tamu dilepas (tamu TIDAK ikut terhapus), berkas ikut terhapus.
export async function deleteCustomer(id) {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh menghapus pelanggan.' };
  const unit = await get('SELECT * FROM units WHERE booked_by_customer_id = ?', [id]);
  if (unit) {
    await run('UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, closed_at = NULL, status = COALESCE(status_before_booking, status), status_before_booking = NULL, certificate_choice = NULL WHERE id = ?', [unit.id]);
  }
  await run('UPDATE guestbook SET customer_id = NULL WHERE customer_id = ?', [id]);
  await run('DELETE FROM customer_document_files WHERE document_id IN (SELECT id FROM customer_documents WHERE customer_id = ?)', [id]);
  await run('DELETE FROM customer_documents WHERE customer_id = ?', [id]);
  await run('DELETE FROM customers WHERE id = ?', [id]);
  revalidatePath('/customers');
  revalidatePath('/units');
  redirect('/customers?msg=' + encodeURIComponent('Pelanggan berhasil dihapus.'));
}

// Checklist berkas Pemberkasan (opsional — tidak mengunci Berkas/Closing).
// 3 keadaan per item: 'belum' | 'soft' (Soft File) | 'hard' (Hardfile).
function normalizeChecklist(raw) {
  try {
    const v = JSON.parse(raw || '[]');
    if (Array.isArray(v)) { const o = {}; for (const k of v) o[k] = 'soft'; return o; }
    if (v && typeof v === 'object') return v;
  } catch { /* abaikan */ }
  return {};
}
export async function setChecklistItem(id, key, state) {
  await mustLogin();
  const cust = await get('SELECT checklist FROM customers WHERE id = ?', [id]);
  const next = normalizeChecklist(cust?.checklist);
  if (state === 'belum') delete next[key];
  else next[key] = state;
  await run('UPDATE customers SET checklist = ? WHERE id = ?', [JSON.stringify(next), id]);
  revalidatePath('/customers/' + id);
  return { ok: true };
}

// ---------- Berkas pelanggan (dokumen) ----------
// Upload soft file (PDF/gambar, maks 10 MB) atau catat hardfile. File disimpan
// di database (tabel customer_document_files) — tanpa layanan blob eksternal.
// Bila jenis berkas cocok dengan satu item checklist, item itu sekaligus
// ditandai diterima (Soft File / Hardfile).
const MAX_DOC_BYTES = 10 * 1024 * 1024;
export async function addDocument(id, formData) {
  await mustLogin();
  const kind = String(formData.get('kind') || '').trim();
  const docType = String(formData.get('doc_type') || 'soft');
  const receivedAt = String(formData.get('received_at') || '') || todayWib();
  const notes = String(formData.get('notes') || '').trim() || null;
  const back = '/customers/' + id + '?tab=berkas';
  if (!kind) redirect(back + '&err=' + encodeURIComponent('Jenis berkas wajib diisi.'));
  const hardfile = docType === 'hard' ? 1 : 0;
  let fileName = null;
  let fileBuf = null;
  let mimeType = null;
  if (!hardfile) {
    const file = formData.get('file');
    if (!file || typeof file === 'string' || file.size === 0)
      redirect(back + '&err=' + encodeURIComponent('Pilih file soft copy (PDF/gambar) untuk diunggah.'));
    if (file.size > MAX_DOC_BYTES)
      redirect(back + '&err=' + encodeURIComponent('File maksimal 10 MB.'));
    if (!(file.type === 'application/pdf' || String(file.type || '').startsWith('image/')))
      redirect(back + '&err=' + encodeURIComponent('File harus PDF atau gambar.'));
    fileName = file.name;
    mimeType = file.type;
    fileBuf = Buffer.from(await file.arrayBuffer());
  }
  const r = await run(
    'INSERT INTO customer_documents (customer_id, kind, file_name, received_at, hardfile, notes) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    [id, kind, fileName, receivedAt, hardfile, notes]
  );
  const docId = r.lastInsertRowid;
  if (!hardfile && docId) {
    await run('INSERT INTO customer_document_files (document_id, mime_type, file_size, file_data) VALUES (?, ?, ?, ?)',
      [docId, mimeType, fileBuf.length, fileBuf]);
  }
  // Tandai item checklist yang cocok (kunci checklist mengandung ':').
  if (kind.includes(':')) {
    const cust = await get('SELECT checklist FROM customers WHERE id = ?', [id]);
    const next = normalizeChecklist(cust?.checklist);
    next[kind] = hardfile ? 'hard' : 'soft';
    await run('UPDATE customers SET checklist = ? WHERE id = ?', [JSON.stringify(next), id]);
  }
  revalidatePath('/customers/' + id);
  redirect(back + '&msg=' + encodeURIComponent(hardfile ? 'Hardfile berhasil dicatat.' : 'Soft file berhasil diunggah.'));
}

export async function deleteDocument(docId, customerId) {
  await mustLogin();
  const doc = await get('SELECT kind FROM customer_documents WHERE id = ? AND customer_id = ?', [docId, customerId]);
  if (!doc) return { error: 'Berkas tidak ditemukan.' };
  await run('DELETE FROM customer_document_files WHERE document_id = ?', [docId]);
  await run('DELETE FROM customer_documents WHERE id = ?', [docId]);
  // Bila jenisnya item checklist dan tidak ada lagi berkas sejenis, kembalikan ke Belum.
  if (String(doc.kind || '').includes(':')) {
    const rest = await get('SELECT id FROM customer_documents WHERE customer_id = ? AND kind = ?', [customerId, doc.kind]);
    if (!rest) {
      const cust = await get('SELECT checklist FROM customers WHERE id = ?', [customerId]);
      const next = normalizeChecklist(cust?.checklist);
      delete next[doc.kind];
      await run('UPDATE customers SET checklist = ? WHERE id = ?', [JSON.stringify(next), customerId]);
    }
  }
  revalidatePath('/customers/' + customerId);
  redirect('/customers/' + customerId + '?tab=berkas&msg=' + encodeURIComponent('Berkas berhasil dihapus.'));
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

export async function updateFlyering(id, formData) {
  await mustLogin();
  const date = String(formData.get('date') || '');
  const spot = String(formData.get('spot') || '').trim();
  if (!date || !spot) redirect('/flyering?err=' + encodeURIComponent('Tanggal dan spot wajib diisi.'));
  await run('UPDATE flyering SET date = ?, spot = ?, flyers_given = ?, hours = ?, asked_contact = ?, customers_recorded = ?, notes = ? WHERE id = ?',
    [date, spot, Number(formData.get('flyers_given') || 0), Number(formData.get('hours') || 0), Number(formData.get('asked_contact') || 0), Number(formData.get('customers_recorded') || 0), String(formData.get('notes') || '') || null, id]);
  revalidatePath('/flyering');
  redirect('/flyering?msg=' + encodeURIComponent('Catatan flyering berhasil diubah.'));
}

export async function deleteFlyering(id) {
  await mustLogin();
  await run('DELETE FROM flyering WHERE id = ?', [id]);
  revalidatePath('/flyering');
  redirect('/flyering?msg=' + encodeURIComponent('Catatan flyering berhasil dihapus.'));
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

// Ubah satu entri Buku Tamu. Pelanggan yang tertaut TIDAK ikut diubah —
// tautan diubah lewat "Tautkan ke Pelanggan", dan menghapus tamu tidak
// menghapus pelanggannya.
export async function updateGuestbook(id, formData) {
  await mustLogin();
  const guestName = String(formData.get('guest_name') || '').trim();
  const phone = String(formData.get('phone') || '').replace(/\D/g, '');
  const visitDate = String(formData.get('visit_date') || '');
  if (!guestName || !phone || !visitDate) redirect('/guestbook?err=' + encodeURIComponent('Nama, HP, dan tanggal kunjungan wajib diisi.'));
  const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null;
  const unit = unitId ? await get('SELECT code FROM units WHERE id = ?', [unitId]) : null;
  await run('UPDATE guestbook SET guest_name = ?, phone = ?, visit_date = ?, arrival_time = ?, purpose = ?, unit_id = ?, unit_label = ?, notes = ? WHERE id = ?',
    [guestName, phone, visitDate, String(formData.get('arrival_time') || '') || null, String(formData.get('purpose') || 'tanya_unit'), unitId, unit ? unit.code : null, String(formData.get('notes') || '') || null, id]);
  revalidatePath('/guestbook');
  redirect('/guestbook?msg=' + encodeURIComponent('Entri buku tamu berhasil diubah.'));
}

export async function deleteGuestbook(id) {
  await mustLogin();
  await run('DELETE FROM guestbook WHERE id = ?', [id]);
  revalidatePath('/guestbook');
  redirect('/guestbook?msg=' + encodeURIComponent('Entri buku tamu berhasil dihapus. Pelanggannya tetap ada di Daftar Pelanggan.'));
}

// Tautkan entri buku tamu ke pelanggan yang sudah ada (bila auto-input salah tautan).
export async function linkGuest(guestId, customerId) {
  await mustLogin();
  await run('UPDATE guestbook SET customer_id = ? WHERE id = ?', [customerId, guestId]);
  revalidatePath('/guestbook');
  return { ok: true };
}

// ---------- Unit ----------
// Tambah unit baru. Kode wajib unik. Status '' = Belum dibangun.
export async function addUnit(formData) {
  await mustLogin();
  const code = String(formData.get('code') || '').trim().toUpperCase();
  const cluster = String(formData.get('cluster') || 'TMB 2');
  const type = String(formData.get('type') || '').trim();
  const landArea = Number(formData.get('land_area') || 0);
  const buildingArea = Number(formData.get('building_area') || 0);
  if (!code || !type || !landArea || !buildingArea)
    redirect('/units?err=' + encodeURIComponent('Kode, tipe, LT, dan LB wajib diisi.'));
  const dup = await get('SELECT id FROM units WHERE code = ?', [code]);
  if (dup) redirect('/units?err=' + encodeURIComponent('Kode unit ' + code + ' sudah ada.'));
  const status = String(formData.get('status') || '') || null;
  await run(
    'INSERT INTO units (code, cluster, type, land_area, building_area, price, status, is_promo, promo_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [code, cluster, type, landArea, buildingArea, String(formData.get('price') || '').trim(),
     status, formData.get('is_promo') ? 1 : 0, String(formData.get('promo_notes') || '').trim()]
  );
  revalidatePath('/units');
  redirect('/units?msg=' + encodeURIComponent('Unit ' + code + ' berhasil ditambahkan.'));
}

// Ubah spek/harga/promo unit. Bila unit terkunci transaksi (Dipesan/Sold Out),
// statusnya TIDAK diubah (tetap seperti semula).
export async function updateUnit(id, formData) {
  await mustLogin();
  const unit = await get('SELECT * FROM units WHERE id = ?', [id]);
  if (!unit) return { error: 'Unit tidak ditemukan.' };
  const locked = !!unit.booked_by_customer_id || unit.status === 'soldout';
  const status = locked ? unit.status : (String(formData.get('status') || '') || null);
  await run(
    'UPDATE units SET cluster = ?, type = ?, land_area = ?, building_area = ?, price = ?, status = ?, is_promo = ?, promo_notes = ? WHERE id = ?',
    [String(formData.get('cluster') || unit.cluster), String(formData.get('type') || '').trim(),
     Number(formData.get('land_area') || 0), Number(formData.get('building_area') || 0),
     String(formData.get('price') || '').trim(), status,
     formData.get('is_promo') ? 1 : 0, String(formData.get('promo_notes') || '').trim(), id]
  );
  revalidatePath('/units');
  redirect('/units?msg=' + encodeURIComponent('Unit ' + unit.code + ' berhasil diubah.'));
}

// Ubah status saja langsung dari daftar. Ditolak bila unit terkunci transaksi.
export async function updateUnitStatus(id, formData) {
  await mustLogin();
  const unit = await get('SELECT * FROM units WHERE id = ?', [id]);
  if (!unit) return { error: 'Unit tidak ditemukan.' };
  if (unit.booked_by_customer_id || unit.status === 'soldout')
    redirect('/units?err=' + encodeURIComponent('Unit ' + unit.code + ' sedang terkunci transaksi (Dipesan/Sold Out) — status tidak bisa diubah.'));
  const status = String(formData.get('status') || '') || null;
  await run('UPDATE units SET status = ? WHERE id = ?', [status, id]);
  revalidatePath('/units');
  redirect('/units?msg=' + encodeURIComponent('Status unit ' + unit.code + ' berhasil diubah.'));
}

// Hapus unit — Owner saja. Ditolak bila unit terkunci transaksi.
export async function deleteUnit(id) {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh menghapus unit.' };
  const unit = await get('SELECT * FROM units WHERE id = ?', [id]);
  if (!unit) return { error: 'Unit tidak ditemukan.' };
  if (unit.booked_by_customer_id || unit.status === 'soldout')
    redirect('/units/' + id + '?err=' + encodeURIComponent('Unit ' + unit.code + ' sedang terkunci transaksi (Dipesan/Sold Out) — tidak bisa dihapus.'));
  await run('DELETE FROM units WHERE id = ?', [id]);
  revalidatePath('/units');
  redirect('/units?msg=' + encodeURIComponent('Unit ' + unit.code + ' berhasil dihapus.'));
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

// Ubah data akun (nama/peran/area/no. HP/status). Akun sendiri tidak boleh
// diubah peran/statusnya lewat sini (pakai Ganti Password untuk password).
export async function updateAccount(id, formData) {
  const user = await mustManager();
  const acc = await get('SELECT * FROM accounts WHERE id = ?', [id]);
  if (!acc) return { error: 'Akun tidak ditemukan.' };
  if (Number(id) === user.id) redirect('/settings?err=' + encodeURIComponent('Akun sendiri tidak bisa diubah lewat sini.'));
  const role = String(formData.get('role') || acc.role);
  const active = formData.get('active') ? 1 : 0;
  await run('UPDATE accounts SET name = ?, role = ?, area = ?, phone = ?, active = ? WHERE id = ?',
    [String(formData.get('name') || '').trim() || acc.name, role,
     String(formData.get('area') || '').trim() || null,
     String(formData.get('phone') || '').replace(/\D/g, '') || null, active, id]);
  revalidatePath('/settings');
  redirect('/settings?msg=' + encodeURIComponent('Akun ' + acc.username + ' berhasil diubah.'));
}

// Hapus akun — Owner/Manager. Ditolak bila itu satu-satunya akun tersisa
// atau akun sendiri.
export async function deleteAccount(id) {
  const user = await mustManager();
  if (Number(id) === user.id) redirect('/settings?err=' + encodeURIComponent('Akun sendiri tidak bisa dihapus.'));
  const count = await get('SELECT COUNT(*) AS n FROM accounts');
  if (Number(count?.n || 0) <= 1) redirect('/settings?err=' + encodeURIComponent('Tidak bisa dihapus: ini satu-satunya akun yang tersisa.'));
  const acc = await get('SELECT username FROM accounts WHERE id = ?', [id]);
  await run('DELETE FROM accounts WHERE id = ?', [id]);
  revalidatePath('/settings');
  redirect('/settings?msg=' + encodeURIComponent('Akun ' + (acc?.username || '') + ' berhasil dihapus.'));
}

// Reset password satu akun oleh admin (Owner/Manager) — tanpa perlu password lama.
export async function resetAccountPassword(id, formData) {
  await mustManager();
  const next = String(formData.get('next') || '');
  if (next.length < 6) redirect('/settings?err=' + encodeURIComponent('Password baru minimal 6 karakter.'));
  const acc = await get('SELECT username FROM accounts WHERE id = ?', [id]);
  if (!acc) redirect('/settings?err=' + encodeURIComponent('Akun tidak ditemukan.'));
  await run('UPDATE accounts SET password_hash = ? WHERE id = ?', [await bcrypt.hash(next, 10), id]);
  revalidatePath('/settings');
  redirect('/settings?msg=' + encodeURIComponent('Password akun ' + acc.username + ' berhasil direset.'));
}

// Reset terpisah (Zona Berbahaya) — Owner saja, masing-masing konfirmasi permanen.
// Pelanggan saja: hapus pelanggan + berkas, lepas kunci unit, tautan buku tamu
// dilepas (entri tamu tetap ada). Flyering saja: hapus semua catatan flyering.
// Transaksi saja: lepas semua kunci unit + buka kembali tahap Booking–Naik SHM
// (tiga tahap awal Minat/Survei/Lolos BI Checking tetap), bersihkan pilihan
// sertifikat transaksi, tanggal booking/jatuh tempo, dan tanda prosedur/lunas.
export async function resetCustomersOnly() {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh reset.' };
  await run('DELETE FROM customer_document_files WHERE document_id IN (SELECT id FROM customer_documents)');
  await run('DELETE FROM customer_documents');
  await run('UPDATE guestbook SET customer_id = NULL');
  await run('UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, closed_at = NULL, certificate_choice = NULL, status = COALESCE(status_before_booking, status), status_before_booking = NULL');
  await run('DELETE FROM customers');
  revalidatePath('/dashboard');
  redirect('/settings?msg=' + encodeURIComponent('Data pelanggan berhasil direset. Buku tamu dan flyering tetap ada.'));
}

export async function resetFlyeringOnly() {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh reset.' };
  await run('DELETE FROM flyering');
  revalidatePath('/dashboard');
  redirect('/settings?msg=' + encodeURIComponent('Catatan flyering berhasil direset.'));
}

export async function resetTransactionsOnly() {
  const user = await mustLogin();
  if (user.role !== 'owner') return { error: 'Hanya Owner yang boleh reset.' };
  await run("UPDATE units SET booked_by_customer_id = NULL, booked_at = NULL, closed_at = NULL, certificate_choice = NULL, status = COALESCE(status_before_booking, status), status_before_booking = NULL");
  const customers = await all('SELECT id, stages FROM customers');
  for (const c of customers) {
    const stages = (JSON.parse(c.stages || '[]')).filter((s) => ['minat', 'survei', 'bi_checking'].includes(s));
    await run('UPDATE customers SET stages = ?, has_held_unit = 0, certificate_choice = NULL, booking_date = NULL, dp_due_date = NULL, berkas_due_date = NULL, procedure_signed = 0, procedure_signed_date = NULL, shortfall_paid = 0, shortfall_paid_date = NULL WHERE id = ?',
      [JSON.stringify(stages), c.id]);
  }
  revalidatePath('/dashboard');
  redirect('/settings?msg=' + encodeURIComponent('Data transaksi berhasil direset. Pelanggan kembali ke tahap Minat/Survei/Lolos BI Checking.'));
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
