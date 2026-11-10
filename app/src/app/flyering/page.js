import { requireUser } from '@/lib/auth';
import { all, get, mapFlyering } from '@/lib/db';
import { addFlyering, updateFlyering, deleteFlyering } from '@/app/actions';
import { formatDateId, todayId } from '@/lib/utils';

export default async function FlyeringPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const logs = (await all('SELECT * FROM flyering ORDER BY date DESC, id DESC')).map(mapFlyering);
  const total = (await get('SELECT COALESCE(SUM(flyers_given),0) AS s, COALESCE(SUM(hours),0) AS h, COALESCE(SUM(asked_contact),0) AS a, COALESCE(SUM(customers_recorded),0) AS c FROM flyering'));
  const perSpot = await all('SELECT spot, COUNT(*) AS n, COALESCE(SUM(flyers_given),0) AS flyers, COALESCE(SUM(asked_contact),0) AS asked, COALESCE(SUM(customers_recorded),0) AS cust FROM flyering GROUP BY spot ORDER BY flyers DESC');
  const editRow = sp?.edit ? logs.find((f) => String(f.id) === String(sp.edit)) : null;

  return (
    <div>
      <h1>Flyering</h1>
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}
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

      {editRow && (
        <>
          <h2>Ubah Catatan Flyering — {formatDateId(editRow.date)} · {editRow.spot}</h2>
          <div className="card">
            <form action={updateFlyering.bind(null, editRow.id)}>
              <div className="row">
                <div><label>Tanggal *</label><input name="date" type="date" defaultValue={editRow.date} required /></div>
                <div><label>Spot *</label><input name="spot" defaultValue={editRow.spot} required /></div>
                <div><label>Brosur dibagikan</label><input name="flyers_given" type="number" min="0" defaultValue={editRow.flyersGiven} /></div>
                <div><label>Jam</label><input name="hours" type="number" step="0.5" min="0" defaultValue={editRow.hours} /></div>
                <div><label>Tanya kontak</label><input name="asked_contact" type="number" min="0" defaultValue={editRow.askedContact} /></div>
                <div><label>Pelanggan tercatat</label><input name="customers_recorded" type="number" min="0" defaultValue={editRow.customersRecorded} /></div>
              </div>
              <label>Catatan</label>
              <textarea name="notes" rows={2} defaultValue={editRow.notes || ''} />
              <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Perubahan</button> <a className="btn ghost" href="/flyering">Batal</a></div>
            </form>
            <form action={deleteFlyering.bind(null, editRow.id)} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <label><input type="checkbox" required /> Saya paham catatan flyering ini akan dihapus permanen.</label>
              <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Hapus Catatan Ini</button></div>
            </form>
          </div>
        </>
      )}

      <h2>Catatan Flyering</h2>
      <div className="card"><table>
        <thead><tr><th>Tanggal</th><th>Spot</th><th>Brosur</th><th>Jam</th><th>Tanya kontak</th><th>Pelanggan</th><th>Catatan</th><th></th></tr></thead>
        <tbody>{logs.map((f) => (
          <tr key={f.id}><td>{formatDateId(f.date)}</td><td>{f.spot}</td><td>{f.flyersGiven}</td><td>{f.hours}</td><td>{f.askedContact}</td><td>{f.customersRecorded}</td><td className="muted">{f.notes || '—'}</td><td><a href={'/flyering?edit=' + f.id}>Ubah</a></td></tr>
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
