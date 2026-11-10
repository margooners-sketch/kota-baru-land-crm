import { requireUser } from '@/lib/auth';
import { all, mapGuest, mapUnit, mapCustomer } from '@/lib/db';
import { addGuest, updateGuestbook, deleteGuestbook, linkGuest } from '@/app/actions';
import { formatDateId, todayId } from '@/lib/utils';

const PURPOSE = { tanya_unit: 'Tanya unit', survei: 'Survei', booking: 'Booking', lainnya: 'Lainnya' };

export default async function GuestbookPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const guests = (await all('SELECT * FROM guestbook ORDER BY visit_date DESC, id DESC')).map(mapGuest);
  const units = (await all('SELECT * FROM units ORDER BY cluster, code')).map(mapUnit);
  const customers = (await all('SELECT * FROM customers ORDER BY name')).map(mapCustomer);
  const editRow = sp?.edit ? guests.find((g) => String(g.id) === String(sp.edit)) : null;

  return (
    <div>
      <h1>Buku Tamu ({guests.length})</h1>
      <p className="muted">Setiap tamu otomatis masuk ke Daftar Pelanggan (anti-duplikat berdasarkan nomor HP). Menghapus tamu tidak menghapus pelanggannya.</p>
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}

      {editRow && (
        <>
          <h2>Ubah Entri Buku Tamu — {editRow.guestName}</h2>
          <div className="card">
            <form action={updateGuestbook.bind(null, editRow.id)}>
              <div className="row">
                <div><label>Nama tamu *</label><input name="guest_name" defaultValue={editRow.guestName} required /></div>
                <div><label>No. HP *</label><input name="phone" inputMode="tel" defaultValue={editRow.phone} required /></div>
                <div><label>Tanggal kunjungan *</label><input name="visit_date" type="date" defaultValue={editRow.visitDate} required /></div>
                <div><label>Jam datang</label><input name="arrival_time" type="time" defaultValue={editRow.arrivalTime || ''} /></div>
                <div><label>Keperluan</label><select name="purpose" defaultValue={editRow.purpose}>{Object.entries(PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label>Unit yang ditanyakan</label><select name="unit_id" defaultValue={editRow.unitId || ''}><option value="">—</option>{units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.cluster} {u.type}</option>)}</select></div>
              </div>
              <label>Catatan</label>
              <textarea name="notes" rows={2} defaultValue={editRow.notes || ''} />
              <p className="muted">Mengubah entri ini tidak mengubah data pelanggan yang tertaut.</p>
              <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Perubahan</button> <a className="btn ghost" href="/guestbook">Batal</a></div>
            </form>
            <form action={deleteGuestbook.bind(null, editRow.id)} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <label><input type="checkbox" required /> Saya paham entri buku tamu ini akan dihapus permanen. Pelanggannya tetap ada di Daftar Pelanggan.</label>
              <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Hapus Entri Ini</button></div>
            </form>
          </div>
        </>
      )}

      <div className="card"><table>
        <thead><tr><th>Tamu</th><th>HP</th><th>Kunjungan</th><th>Jam</th><th>Keperluan</th><th>Unit</th><th>Pelanggan</th><th></th></tr></thead>
        <tbody>{guests.map((g) => (
          <tr key={g.id}>
            <td>{g.guestName}</td><td>{g.phone}</td><td>{formatDateId(g.visitDate)}</td><td>{g.arrivalTime || '—'}</td>
            <td>{PURPOSE[g.purpose] || g.purpose}</td><td>{g.unitLabel || '—'}</td>
            <td>{g.customerId ? <a href={'/customers/' + g.customerId}>#{g.customerId}</a> : '—'}
              <form action={async (fd) => { 'use server'; await linkGuest(g.id, Number(fd.get('customer_id'))); }} style={{ marginTop: 4 }}>
                <select name="customer_id" required defaultValue="">
                  <option value="" disabled>Tautkan ke pelanggan…</option>
                  {customers.map((cc) => <option key={cc.id} value={cc.id}>{cc.name} ({cc.phone})</option>)}
                </select>
                <button className="btn small ghost" type="submit" style={{ marginTop: 4 }}>Tautkan</button>
              </form>
            </td>
            <td><a href={'/guestbook?edit=' + g.id}>Ubah</a></td>
          </tr>
        ))}</tbody>
      </table></div>

      <h2>Tambah Tamu</h2>
      <div className="card">
        <form action={addGuest}>
          <div className="row">
            <div><label>Nama tamu *</label><input name="guest_name" required /></div>
            <div><label>No. HP *</label><input name="phone" inputMode="tel" required /></div>
            <div><label>Jenis kelamin</label><select name="gender"><option value="">—</option><option value="laki_laki">Laki-laki</option><option value="perempuan">Perempuan</option></select></div>
          </div>
          <div className="row">
            <div><label>Tanggal kunjungan *</label><input name="visit_date" type="date" defaultValue={todayId()} required /></div>
            <div><label>Jam datang</label><input name="arrival_time" type="time" /></div>
            <div><label>Keperluan</label><select name="purpose"><option value="tanya_unit">Tanya unit</option><option value="survei">Survei</option><option value="booking">Booking</option><option value="lainnya">Lainnya</option></select></div>
            <div><label>Unit yang ditanyakan</label><select name="unit_id"><option value="">—</option>{units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.cluster} {u.type}</option>)}</select></div>
          </div>
          <label>Catatan</label>
          <textarea name="notes" rows={2} />
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Tamu</button></div>
        </form>
      </div>
    </div>
  );
}
