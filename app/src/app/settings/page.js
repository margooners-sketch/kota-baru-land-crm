import QRCode from 'qrcode';
import { requireUser } from '@/lib/auth';
import { all, get, getSetting, mapAccount } from '@/lib/db';
import { changePassword, setClosingTarget, addAccount, setAccountActive, updateAccount, deleteAccount, resetAccountPassword, resetCustomers, resetCustomersOnly, resetFlyeringOnly, resetTransactionsOnly } from '@/app/actions';
import AcuanBrosur from '@/app/acuan-brosur';

export default async function SettingsPage({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const msg = sp?.msg;
  const err = sp?.err;
  const accounts = (await all('SELECT * FROM accounts ORDER BY id')).map(mapAccount);
  const target = await getSetting('closingTarget', '4');
  const isManager = user.role === 'owner' || user.role === 'manager';
  const editAccount = sp?.editAccount ? accounts.find((a) => String(a.id) === String(sp.editAccount)) : null;
  const waQr = await QRCode.toDataURL('https://wa.me/6281808111141', { margin: 1, width: 220 });

  return (
    <div>
      <h1>Pengaturan</h1>
      {msg && <div className="ok">{msg}</div>}
      {err && <div className="err">{err}</div>}

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

      <div className="card">
        <h2>QR WA Bisnis — Marketing Taman Melati Bulan</h2>
        <div className="row" style={{ alignItems: 'center' }}>
          <div style={{ flex: '0 0 auto' }}><img src={waQr} alt="QR WhatsApp Bisnis Maruf — Kota Baru Land" width={220} height={220} /></div>
          <div>
            <p><b>Maruf Abdul Aziz</b> — Marketing Taman Melati Bulan</p>
            <p className="muted">Scan kode ini untuk chat WhatsApp Bisnis.</p>
            <p>No. WA: <a href="https://wa.me/6281808111141" target="_blank" rel="noreferrer">0818-0811-1141</a></p>
            <p><a className="wa" href="https://wa.me/6281808111141" target="_blank" rel="noreferrer">Buka WA Bisnis</a></p>
          </div>
        </div>
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
              <td style={{ whiteSpace: 'nowrap' }}>
                <a href={'/settings?editAccount=' + a.id}>Ubah</a>{' · '}
                {a.id !== user.id && (
                  <form action={async () => { 'use server'; await setAccountActive(a.id, !a.active); }} style={{ display: 'inline' }}>
                    <button className="btn small ghost" type="submit">{a.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}</tbody></table>

          {editAccount && (
            <>
              <h3>Ubah Akun — {editAccount.username}{editAccount.id === user.id ? ' (akun sendiri)' : ''}</h3>
              {editAccount.id === user.id && (
                <p className="muted">Akun sendiri: nama, area, dan no. HP bisa diubah. Peran dan status dikunci supaya tidak mengunci diri sendiri.</p>
              )}
              <form action={updateAccount.bind(null, editAccount.id)}>
                <div className="row">
                  <div><label>Nama</label><input name="name" defaultValue={editAccount.name} required /></div>
                  <div><label>Peran</label><select name="role" defaultValue={editAccount.role} disabled={editAccount.id === user.id}><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Owner</option></select></div>
                  <div><label>Area</label><input name="area" defaultValue={editAccount.area || ''} /></div>
                  <div><label>No. HP</label><input name="phone" defaultValue={editAccount.phone || ''} /></div>
                </div>
                <label><input type="checkbox" name="active" value="1" defaultChecked={editAccount.active} disabled={editAccount.id === user.id} /> Akun aktif</label>
                <input type="hidden" name="active" value="" />
                <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Akun</button> <a className="btn ghost" href="/settings">Batal</a></div>
              </form>
              {editAccount.id !== user.id && (
                <>
              <h3>Reset Password — {editAccount.username}</h3>
              <form action={resetAccountPassword.bind(null, editAccount.id)}>
                <div className="row">
                  <div><label>Password baru (min 6 karakter)</label><input name="next" type="password" required /></div>
                  <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Reset Password</button></div>
                </div>
              </form>
              <form action={deleteAccount.bind(null, editAccount.id)} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <label><input type="checkbox" required /> Saya paham akun {editAccount.username} akan dihapus permanen.</label>
                <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Hapus Akun Ini</button></div>
              </form>
                </>
              )}
            </>
          )}

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
          <h2 style={{ color: '#8f1d1d' }}>Zona Berbahaya — Reset Data</h2>
          <p className="muted">Menghapus SEMUA pelanggan, buku tamu, dan catatan flyering. Unit & master unit TIDAK direset (booking dilepas). Tindakan ini permanen.</p>
          <form action={async () => { 'use server'; await resetCustomers(); }}>
            <label><input type="checkbox" required /> Saya paham ini menghapus semua data pelanggan & transaksi secara permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Reset Pelanggan/Transaksi</button></div>
          </form>

          <h3 style={{ marginTop: 24 }}>Reset Terpisah</h3>
          <p className="muted">Masing-masing hanya menghapus bagiannya saja. Semua tindakan ini permanen.</p>
          <form action={async () => { 'use server'; await resetCustomersOnly(); }} style={{ marginTop: 12 }}>
            <p><b>Reset Pelanggan saja</b> <span className="muted">— hapus semua pelanggan + berkas, lepas kunci unit. Buku tamu & flyering tetap ada.</span></p>
            <label><input type="checkbox" required /> Saya paham semua data pelanggan akan dihapus permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Reset Pelanggan Saja</button></div>
          </form>
          <form action={async () => { 'use server'; await resetFlyeringOnly(); }} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <p><b>Reset Flyering saja</b> <span className="muted">— hapus semua catatan flyering. Pelanggan & buku tamu tetap ada.</span></p>
            <label><input type="checkbox" required /> Saya paham semua catatan flyering akan dihapus permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Reset Flyering Saja</button></div>
          </form>
          <form action={async () => { 'use server'; await resetTransactionsOnly(); }} style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            <p><b>Reset Transaksi saja</b> <span className="muted">— lepas semua kunci unit, pelanggan kembali ke tahap Minat/Survei/Lolos BI Checking. Data pelanggan, buku tamu & flyering tetap ada.</span></p>
            <label><input type="checkbox" required /> Saya paham semua data transaksi (booking/closing) akan dihapus permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Reset Transaksi Saja</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
