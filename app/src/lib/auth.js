// Auth sederhana: sesi di tabel sessions + cookie httpOnly.
// Peran: owner | manager | staff. Owner/Manager kelola akun; Staff hanya lihat/isi data.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { get, run, mapAccount, nowIso } from './db.js';

export const SESSION_COOKIE = 'kbl_session';
const SESSION_DAYS = 30;

export async function createSession(accountId) {
  const id = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await run('INSERT INTO sessions (id, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)', [id, accountId, nowIso(), expires]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, { httpOnly: true, sameSite: 'lax', path: '/', expires: new Date(expires), secure: process.env.NODE_ENV === 'production' });
  return id;
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await run('DELETE FROM sessions WHERE id = ?', [id]);
  jar.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', expires: new Date(0) });
}

export async function getSessionUser() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = await get(
    `SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.id = ? AND s.expires_at > ? AND a.active = 1`,
    [id, nowIso()]
  );
  return mapAccount(row);
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/dashboard');
  return user;
}
