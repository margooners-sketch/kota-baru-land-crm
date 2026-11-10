// Buat database + tabel dari skema yang sesuai DATABASE_URL
// (db/schema.sql untuk SQLite lokal, db/schema.pg.sql untuk Postgres/Neon).
// DATABASE_URL dibaca dari environment atau file .env — JANGAN ketik di chat.
// Jalankan: npm run db:setup
import { loadEnv } from './load-env.mjs';
loadEnv();
const { ensureSchema, dbKind, databaseUrl } = await import('../src/lib/db.js');
const kind = await ensureSchema();
console.log(`DB OK (${kind}) — tabel dibuat/dicek. DATABASE_URL=${kind === 'pg' ? '(postgres, disembunyikan)' : databaseUrl()}`);
