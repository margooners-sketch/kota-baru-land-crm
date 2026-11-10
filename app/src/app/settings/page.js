import { requireUser } from '@/lib/auth';
import { all, get, getSetting, mapAccount } from '@/lib/db';
import { changePassword, setClosingTarget, addAccount, setAccountActive, resetCustomers } from '@/app/actions';
import AcuanBrosur from '@/app/acuan-brosur';

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

      <AcuanBrosur />

      {user.role === 'owner' && (
        <div className="card" style={{ borderColor: '#c0392b' }}>
          <h2 style={{ color: '#8f1d1d' }}>Zona Berbahaya — Reset Pelanggan/Transaksi</h2>
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
