import { requireUser } from '@/lib/auth';
import { all, mapUnit } from '@/lib/db';
import { priceScheme } from '@/lib/pricing';
import { unitStatusLabel } from '@/lib/utils';

export default async function UnitsPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const f = sp?.f || 'semua';
  const q = (sp?.q || '').toLowerCase();
  let units = (await all('SELECT * FROM units ORDER BY cluster, code')).map(mapUnit);
  if (f === 'ready') units = units.filter((u) => u.status === 'ready');
  if (f === 'proses') units = units.filter((u) => u.status === 'proses');
  if (f === 'promo') units = units.filter((u) => u.isPromo);
  if (f === 'dipesan') units = units.filter((u) => u.bookedByCustomerId);
  if (f === 'soldout') units = units.filter((u) => u.status === 'soldout');
  if (f === 'belum') units = units.filter((u) => !u.status);
  if (q) units = units.filter((u) => (u.code + u.cluster + u.type).toLowerCase().includes(q));

  return (
    <div>
      <h1>Daftar Unit ({units.length})</h1>
      <p className="muted">TMB 2 di Wonosari, Klaten (77 unit tipe 30/60, kecuali F12 30/68 dan L01, M23–M26 30/63) + TMB 1 G10 (36/70). Kelebihan tanah TMB 2 Rp2.000.000/m² di luar all in.</p>
      <form method="get" className="row">
        <div><label>Filter</label><select name="f" defaultValue={f}>
          <option value="semua">Semua</option><option value="ready">Ready</option><option value="proses">Proses</option>
          <option value="promo">Promo</option><option value="dipesan">Dipesan</option><option value="soldout">Sold Out</option><option value="belum">Belum dibangun</option>
        </select></div>
        <div><label>Cari kode</label><input name="q" defaultValue={sp?.q || ''} placeholder="mis. H05" /></div>
        <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Tampilkan</button></div>
      </form>
      <div className="card"><table>
        <thead><tr><th>Kode</th><th>Cluster</th><th>Tipe</th><th>LT / LB</th><th>Status</th><th>Promo</th><th>Keterangan</th></tr></thead>
        <tbody>{units.map((u) => (
          <tr key={u.id}>
            <td><b>{u.code}</b></td><td>{u.cluster}</td><td>{u.type}</td>
            <td>{u.landArea} / {u.buildingArea} m²</td>
            <td>
              {u.bookedByCustomerId && u.status !== 'soldout'
                ? <span className="badge hangat">Dipesan #{u.bookedByCustomerId}</span>
                : <span className={'badge ' + (u.status === 'ready' ? 'ready' : u.status === 'soldout' ? 'sold' : u.status === 'proses' ? 'proses' : '')}>{unitStatusLabel(u.status)}</span>}
            </td>
            <td>{(() => {
              const special = priceScheme(u)?.label === 'Promo Khusus 2 Juta All In';
              if (special) return <span className="badge special">PROMO KHUSUS: 2 Juta All in</span>;
              return u.isPromo ? <span className="badge promo">Promo</span> : '—';
            })()}</td>
            <td className="muted">{u.promoNotes || u.price || '—'}</td>
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
