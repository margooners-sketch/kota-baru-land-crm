import { requireUser } from '@/lib/auth';
import { all, mapGuest, mapUnit } from '@/lib/db';
import { addGuest } from '@/app/actions';
import { formatDateId, todayId } from '@/lib/utils';

const PURPOSE = { tanya_unit: 'Tanya unit', survei: 'Survei', booking: 'Booking', lainnya: 'Lainnya' };

export default async function GuestbookPage() {
  await requireUser();
  const guests = (await all('SELECT * FROM guestbook ORDER BY visit_date DESC, id DESC')).map(mapGuest);
  const units = (await all('SELECT * FROM units ORDER BY cluster, code')).map(mapUnit);

  return (
    <div>
      <h1>Buku Tamu ({guests.length})</h1>
      <p className="muted">Setiap tamu otomatis masuk ke Daftar Pelanggan (anti-duplikat berdasarkan nomor HP). Menghapus tamu tidak menghapus pelanggannya.</p>
      <div className="card"><table>
        <thead><tr><th>Tamu</th><th>HP</th><th>Kunjungan</th><th>Jam</th><th>Keperluan</th><th>Unit</th><th>Pelanggan</th></tr></thead>
        <tbody>{guests.map((g) => (
          <tr key={g.id}>
            <td>{g.guestName}</td><td>{g.phone}</td><td>{formatDateId(g.visitDate)}</td><td>{g.arrivalTime || '—'}</td>
            <td>{PURPOSE[g.purpose] || g.purpose}</td><td>{g.unitLabel || '—'}</td>
            <td>{g.customerId ? <a href={'/customers/' + g.customerId}>#{g.customerId}</a> : '—'}</td>
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
