import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { loginAction } from '@/app/actions';

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  if (user) redirect('/dashboard');
  const err = (await searchParams)?.error;
  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <div className="card">
        <h1>Masuk — CRM Kota Baru Land</h1>
        <p className="muted">Akun Owner: <b>maruf</b>. Password pertama dari TEMP_OWNER_PASSWORD — wajib diganti setelah masuk pertama kali (menu Pengaturan).</p>
        {err && <div className="err">{err}</div>}
        <form action={async (fd) => {
          'use server';
          const r = await loginAction(fd);
          if (r?.error) redirect('/login?error=' + encodeURIComponent(r.error));
        }}>
          <label>Username</label>
          <input name="username" autoComplete="username" required />
          <label>Password</label>
          <input name="password" type="password" autoComplete="current-password" required />
          <div style={{ marginTop: 14 }}><button className="btn" type="submit">Masuk</button></div>
        </form>
      </div>
    </div>
  );
}
