import { requireUser } from '@/lib/auth';
import { all, mapCustomer } from '@/lib/db';
import { addCustomer } from '@/app/actions';
import { leadScore, STAGE_LABELS, urgencyOf } from '@/lib/pricing';
import { formatDateId } from '@/lib/utils';

export default async function CustomersPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp?.q || '').toLowerCase();
  let customers = (await all('SELECT * FROM customers ORDER BY id DESC')).map(mapCustomer);
  if (q) customers = customers.filter((c) => (c.name + c.phone + (c.sourceSpot || '')).toLowerCase().includes(q));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h1>Daftar Pelanggan ({customers.length})</h1>
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}
      <form method="get" className="row">
        <div><label>Cari nama / HP / sumber</label><input name="q" defaultValue={sp?.q || ''} /></div>
        <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Cari</button></div>
      </form>

      <div className="card"><table>
        <thead><tr><th>Nama</th><th>HP</th><th>Tahap</th><th>Skor</th><th>Follow-up</th><th>Sumber</th></tr></thead>
        <tbody>{customers.map((c) => {
          const s = leadScore(c);
          const u = urgencyOf(c);
          return <tr key={c.id}>
            <td><a href={'/customers/' + c.id}>{c.name}</a>{c.isReminder ? ' 🔔' : ''}</td>
            <td>{c.phone}</td>
            <td>{c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru'}</td>
            <td><span className={'badge ' + s.label.toLowerCase()}>{s.label} {s.score}</span></td>
            <td>{c.followUpDate ? formatDateId(c.followUpDate) : '—'}<br /><span className="muted">{u.label}</span></td>
            <td>{c.sourceSpot || '—'}</td>
          </tr>;
        })}</tbody>
      </table></div>

      <h2>Tambah Pelanggan</h2>
      <div className="card">
        <form action={addCustomer}>
          <div className="row">
            <div><label>Nama *</label><input name="name" required /></div>
            <div><label>No. HP *</label><input name="phone" inputMode="tel" required placeholder="08xxxxxxxxxx" /></div>
            <div><label>Jenis kelamin</label><select name="gender"><option value="">—</option><option value="laki_laki">Laki-laki</option><option value="perempuan">Perempuan</option></select></div>
          </div>
          <div className="row">
            <div><label>Sumber / spot</label><input name="source_spot" placeholder="mis. Flyering Pasar Delanggu" /></div>
            <div><label>Tanggal kontak</label><input name="contact_date" type="date" /></div>
            <div><label>Follow-up berikutnya</label><input name="follow_up_date" type="date" /></div>
          </div>
          <label>Catatan</label>
          <textarea name="notes" rows={2} />
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Pelanggan</button></div>
        </form>
      </div>
    </div>
  );
}
