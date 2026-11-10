import { requireUser } from '@/lib/auth';
import { all, get, getSetting, mapAccount } from '@/lib/db';
import { changePassword, setClosingTarget, addAccount, setAccountActive, resetCustomers } from '@/app/actions';

export default async function SettingsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const msg = sp?.msg;
  const accounts = (await all('SELECT * FROM accounts ORDER BY id')).map(mapAccount);
  const target = await getSetting('closingTarget', '4');
  const isManager = user.role === 'owner' || user.role === 'manager';

  return (
    <div>
      <h1>Pengaturan</h1>
      {msg && <div className="ok">{msg}</div>}

      <div className="card">
        <h2>Ganti Password ({user.username})</h2>
        <form action={async (fd) => {
          'use server';
          const r = await changePassword(fd);
          const { redirect } = await import('next/navigation');
          redirect('/settings?msg=' + encodeURIComponent(r.ok ? 'Password berhasil diganti.' : r.error));
        }}>
          <div className="row">
            <div><label>Password lama</label><input name="current" type="password" required /></div>
            <div><label>Password baru (min 6 karakter)</label><input name="next" type="password" required /></div>
          </div>
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Ganti Password</button></div>
        </form>
      </div>

      {isManager && (
        <div className="card">
          <h2>Target Closing per Bulan</h2>
          <form action={setClosingTarget}>
            <div className="row">
              <div><label>Target</label><input name="target" type="number" min="0" defaultValue={target} /></div>
              <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Simpan Target</button></div>
            </div>
          </form>
        </div>
      )}

      {isManager && (
        <div className="card">
          <h2>Akun Pengguna</h2>
          <table><thead><tr><th>Username</th><th>Nama</th><th>Peran</th><th>Area</th><th>Status</th><th></th></tr></thead>
          <tbody>{accounts.map((a) => (
            <tr key={a.id}>
              <td>{a.username}</td><td>{a.name}</td><td>{a.role}</td><td>{a.area || '—'}</td><td>{a.active ? 'Aktif' : 'Nonaktif'}</td>
              <td>{a.id !== user.id && (
                <form action={async () => { 'use server'; await setAccountActive(a.id, !a.active); }}>
                  <button className="btn small ghost" type="submit">{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                </form>
              )}</td>
            </tr>
          ))}</tbody></table>
          <h3>Tambah Akun</h3>
          <form action={addAccount}>
            <div className="row">
              <div><label>Username</label><input name="username" required /></div>
              <div><label>Nama</label><input name="name" required /></div>
              <div><label>Password (min 6)</label><input name="password" type="password" required /></div>
              <div><label>Peran</label><select name="role"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select></div>
            </div>
            <div style={{ marginTop: 10 }}><button className="btn" type="submit">Tambah Akun</button></div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>📖 Acuan Brosur TMB 2</h2>
        <p><b>Taman Melati Bulan 2 — Wonosari, Klaten.</b> Rumah 6×10 m, include pompa air (air sumur).</p>
        <ul>
          <li><b>Area Depan (pink) — All in Rp12.760.000:</b> booking Rp2.000.000, kekurangan Rp10.760.000.</li>
          <li><b>Area Belakang (hijau) — All in Rp4.000.000:</b> booking Rp2.000.000, kekurangan Rp2.000.000.</li>
          <li><b>H05/H07 promo khusus — All in Rp2.000.000</b> (Ready). H05 hook +Rp10.000.000 di luar all in.</li>
          <li><b>Naik SHM +Rp3.500.000</b> ke Total Bayar & kekurangan. Tetap SHGB tanpa tambahan.</li>
          <li>Kelebihan tanah Rp2.000.000/m² di luar all in — konfirmasi luas ke kantor sebelum angka final.</li>
          <li><b>TMB 1 G10 (36/70):</b> Cash Rp160.000.000 + biaya Rp7.800.000 = Rp167.800.000 (HM Rp171.300.000); KPR all in Rp12.700.000. Rincian Harga PT/kekurangan belum diberikan kantor.</li>
        </ul>
        <p className="muted">Skema reguler brosur (ilustrasi FLPP): DP 5% Rp8.300.000, KPR Rp157.700.000; angsuran 10 th Rp1.701.900 / 15 th Rp1.266.100 / 20 th Rp1.054.500. Booking fee kembali Rp1.500.000 bila bank menolak (dengan surat penolakan); batal sepihak = booking fee hilang. DP/plafon sepenuhnya ditentukan bank.</p>
        <h3>Catatan (NOTE)</h3>
        <ul>
          <li>Jangan janjikan SBUM. Jangan tulis “166 jadi 160”. Jangan tulis angsuran pasti untuk skema promo all in — angsuran ditentukan bank/BTN.</li>
          <li>Jangan campur skema TMB 2 dengan TMJ / Kurung / Juwiring. Setiap iklan promo: “syarat dan ketentuan berlaku, DP/plafon ditentukan bank”.</li>
          <li>Jangan janjikan DP 0%, biaya KPR gratis, bebas banjir, atau SHM/PBG termasuk — sampai kantor mengonfirmasi.</li>
          <li>Jangan janjikan “dijamin/sampai lolos” BI Checking.</li>
        </ul>
      </div>

      {user.role === 'owner' && (
        <div className="card" style={{ borderColor: '#c0392b' }}>
          <h2 style={{ color: '#8f1d1d' }}>⚠️ Zona Berbahaya — Reset Pelanggan/Transaksi</h2>
          <p className="muted">Menghapus SEMUA pelanggan, buku tamu, dan catatan flyering. Unit & master unit TIDAK direset (booking dilepas). Tindakan ini permanen.</p>
          <form action={async () => { 'use server'; await resetCustomers(); }}>
            <label><input type="checkbox" required /> Saya paham ini menghapus semua data pelanggan & transaksi secara permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Reset Pelanggan/Transaksi</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
