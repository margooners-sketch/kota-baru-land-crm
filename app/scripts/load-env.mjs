// Muat variabel dari file .env (di root aplikasi) ke process.env,
// tanpa menimpa variabel yang sudah ada di environment.
// Dipakai skrip CLI (setup/seed) — Next.js sendiri sudah memuat .env otomatis.
// DATABASE_URL dibaca dari sini: lokal file:./dev.db, produksi postgres://... (Neon).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function loadEnv() {
  const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
  const envFile = path.join(root, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
