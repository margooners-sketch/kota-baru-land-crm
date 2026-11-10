import { requireUser } from '@/lib/auth';
import { all, mapUnit } from '@/lib/db';
import { addUnit, updateUnitStatus } from '@/app/actions';
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
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}
      <form method="get" className="row">
        <div><label>Filter</label><select name="f" defaultValue={f}>
          <option value="semua">Semua</option><option value="ready">Ready</option><option value="proses">Proses</option>
          <option value="promo">Promo</option><option value="dipesan">Dipesan</option><option value="soldout">Sold Out</option><option value="belum">Belum dibangun</option>
        </select></div>
        <div><label>Cari kode</label><input name="q" defaultValue={sp?.q || ''} placeholder="mis. H05" /></div>
        <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Tampilkan</button></div>
      </form>
      <div className="card"><table>
        <thead><tr><th>Kode</th><th>Cluster</th><th>Tipe</th><th>LT / LB</th><th>Status</th><th>Promo</th><th>Keterangan</th><th>Aksi</th></tr></thead>
        <tbody>{units.map((u) => {
          const locked = !!u.bookedByCustomerId || u.status === 'soldout';
          return (
          <tr key={u.id}>
            <td><b>{u.code}</b></td><td>{u.cluster}</td><td>{u.type}</td>
            <td style={{ whiteSpace: 'nowrap' }}>{u.landArea} / {u.buildingArea} m²</td>
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
            <td style={{ whiteSpace: 'nowrap' }}>
              <a href={'/units/' + u.id}>Ubah</a>
              {locked ? <span className="muted"> · Terkunci</span> : (
                <form action={updateUnitStatus.bind(null, u.id)} style={{ display: 'inline', marginLeft: 8 }}>
                  <select name="status" defaultValue={u.status || ''} style={{ width: 'auto', display: 'inline-block', padding: '4px 6px' }}>
                    <option value="">Belum dibangun</option><option value="ready">Ready</option><option value="proses">Proses</option>
                  </select>
                  <button className="btn small ghost" type="submit" style={{ marginLeft: 4 }}>Ubah status</button>
                </form>
              )}
            </td>
          </tr>
          );
        })}</tbody>
      </table></div>

      <h2>Tambah Unit</h2>
      <div className="card">
        <form action={addUnit}>
          <div className="row">
            <div><label>Kode unit *</label><input name="code" required placeholder="mis. A01" /></div>
            <div><label>Cluster *</label><select name="cluster"><option value="TMB 2">TMB 2</option><option value="TMB 1">TMB 1</option></select></div>
            <div><label>Tipe *</label><input name="type" required placeholder="mis. 30" /></div>
            <div><label>LT (m²) *</label><input name="land_area" type="number" min="1" required /></div>
            <div><label>LB (m²) *</label><input name="building_area" type="number" min="1" required /></div>
            <div><label>Status</label><select name="status"><option value="">Belum dibangun</option><option value="ready">Ready</option><option value="proses">Proses</option></select></div>
          </div>
          <div className="row">
            <div><label>Harga (teks bebas)</label><input name="price" placeholder="mis. 166 Juta" /></div>
            <div><label>Promo</label><select name="is_promo"><option value="">Bukan promo</option><option value="1">Promo</option></select></div>
          </div>
          <label>Catatan promo</label>
          <input name="promo_notes" placeholder="mis. All in 12,7 juta — Area Depan" />
          <p className="muted">Skema harga (12,7 jt Depan / 4 jt Belakang / 2 jt H05-H07 / SHM +3,5 jt / hook +10 jt / kelebihan tanah 2 jt/m²) dihitung otomatis dari kode &amp; catatan promo — tidak berubah.</p>
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Tambah Unit</button></div>
        </form>
      </div>
    </div>
  );
}
