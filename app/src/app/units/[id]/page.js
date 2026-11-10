import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { get, mapUnit } from '@/lib/db';
import { updateUnit, deleteUnit } from '@/app/actions';
import { unitStatusLabel } from '@/lib/utils';

export default async function UnitEditPage({ params, searchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const u = mapUnit(await get('SELECT * FROM units WHERE id = ?', [id]));
  if (!u) notFound();
  const locked = !!u.bookedByCustomerId || u.status === 'soldout';

  return (
    <div>
      <p><a href="/units">← Daftar Unit</a></p>
      <h1>Ubah Unit {u.code}</h1>
      <p className="muted">{u.cluster} · Tipe {u.type} · {u.landArea} / {u.buildingArea} m² · {unitStatusLabel(u.status)}{u.bookedByCustomerId ? ` · Dipesan pelanggan #${u.bookedByCustomerId}` : ''}</p>
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}
      {locked && <div className="card"><p className="muted">Unit ini sedang terkunci transaksi (Dipesan/Sold Out): statusnya tidak bisa diubah dan unit tidak bisa dihapus sampai booking/closing dibatalkan Owner dari detail pelanggan.</p></div>}

      <div className="card">
        <form action={updateUnit.bind(null, u.id)}>
          <div className="row">
            <div><label>Kode unit</label><input value={u.code} disabled /></div>
            <div><label>Cluster *</label><select name="cluster" defaultValue={u.cluster}><option value="TMB 2">TMB 2</option><option value="TMB 1">TMB 1</option></select></div>
            <div><label>Tipe *</label><input name="type" defaultValue={u.type} required /></div>
            <div><label>LT (m²) *</label><input name="land_area" type="number" min="1" defaultValue={u.landArea} required /></div>
            <div><label>LB (m²) *</label><input name="building_area" type="number" min="1" defaultValue={u.buildingArea} required /></div>
            <div><label>Status</label>
              {locked
                ? <input value={unitStatusLabel(u.status)} disabled />
                : <select name="status" defaultValue={u.status || ''}><option value="">Belum dibangun</option><option value="ready">Ready</option><option value="proses">Proses</option></select>}
            </div>
          </div>
          <div className="row">
            <div><label>Harga (teks bebas)</label><input name="price" defaultValue={u.price || ''} /></div>
            <div><label>Promo</label><select name="is_promo" defaultValue={u.isPromo ? '1' : ''}><option value="">Bukan promo</option><option value="1">Promo</option></select></div>
          </div>
          <label>Catatan promo</label>
          <input name="promo_notes" defaultValue={u.promoNotes || ''} />
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Perubahan</button></div>
        </form>
      </div>

      {user.role === 'owner' && !locked && (
        <div className="card" style={{ borderColor: '#c0392b' }}>
          <h2 style={{ color: '#8f1d1d' }}>Hapus Unit</h2>
          <p className="muted">Menghapus unit {u.code} secara permanen dari Daftar Unit.</p>
          <form action={deleteUnit.bind(null, u.id)}>
            <label><input type="checkbox" required /> Saya paham unit {u.code} akan dihapus permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Hapus Unit</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
