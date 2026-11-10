import { requireUser } from '@/lib/auth';
import { all, get, mapFlyering } from '@/lib/db';
import { addFlyering } from '@/app/actions';
import { formatDateId, todayId } from '@/lib/utils';

export default async function FlyeringPage() {
  await requireUser();
  const logs = (await all('SELECT * FROM flyering ORDER BY date DESC, id DESC')).map(mapFlyering);
  const total = (await get('SELECT COALESCE(SUM(flyers_given),0) AS s, COALESCE(SUM(hours),0) AS h, COALESCE(SUM(asked_contact),0) AS a, COALESCE(SUM(customers_recorded),0) AS c FROM flyering'));
  const perSpot = await all('SELECT spot, COUNT(*) AS n, COALESCE(SUM(flyers_given),0) AS flyers, COALESCE(SUM(asked_contact),0) AS asked, COALESCE(SUM(customers_recorded),0) AS cust FROM flyering GROUP BY spot ORDER BY flyers DESC');

  return (
    <div>
      <h1>Flyering</h1>
      <div className="grid">
        <div className="stat"><b>{total.s}</b><span>Total brosur</span></div>
        <div className="stat"><b>{Number(total.h).toFixed(1)}</b><span>Total jam</span></div>
        <div className="stat"><b>{total.a}</b><span>Tanya kontak</span></div>
        <div className="stat"><b>{total.c}</b><span>Pelanggan tercatat</span></div>
      </div>

      <h2>Rekap per Spot</h2>
      <div className="card"><table>
        <thead><tr><th>Spot</th><th>Kegiatan</th><th>Brosur</th><th>Tanya kontak</th><th>Pelanggan</th></tr></thead>
        <tbody>{perSpot.map((r) => (
          <tr key={r.spot}><td>{r.spot}</td><td>{r.n}</td><td>{r.flyers}</td><td>{r.asked}</td><td>{r.cust}</td></tr>
        ))}</tbody>
      </table></div>

      <h2>Catatan Flyering</h2>
      <div className="card"><table>
        <thead><tr><th>Tanggal</th><th>Spot</th><th>Brosur</th><th>Jam</th><th>Tanya kontak</th><th>Pelanggan</th><th>Catatan</th></tr></thead>
        <tbody>{logs.map((f) => (
          <tr key={f.id}><td>{formatDateId(f.date)}</td><td>{f.spot}</td><td>{f.flyersGiven}</td><td>{f.hours}</td><td>{f.askedContact}</td><td>{f.customersRecorded}</td><td className="muted">{f.notes || '—'}</td></tr>
        ))}</tbody>
      </table></div>

      <h2>Tambah Catatan Flyering</h2>
      <div className="card">
        <form action={addFlyering}>
          <div className="row">
            <div><label>Tanggal *</label><input name="date" type="date" defaultValue={todayId()} required /></div>
            <div><label>Spot *</label><input name="spot" required placeholder="mis. Pasar Delanggu" /></div>
            <div><label>Brosur dibagikan</label><input name="flyers_given" type="number" min="0" defaultValue="0" /></div>
            <div><label>Jam</label><input name="hours" type="number" step="0.5" min="0" defaultValue="0" /></div>
            <div><label>Tanya kontak</label><input name="asked_contact" type="number" min="0" defaultValue="0" /></div>
            <div><label>Pelanggan tercatat</label><input name="customers_recorded" type="number" min="0" defaultValue="0" /></div>
          </div>
          <label>Catatan</label>
          <textarea name="notes" rows={2} />
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan</button></div>
        </form>
      </div>
    </div>
  );
}
