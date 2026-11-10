// Regenerasi src/lib/schema-sql.js dari db/schema.pg.sql + db/schema.sql.
// Jalankan setelah mengubah file .sql:  node scripts/sync-schema-js.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pg = fs.readFileSync(path.join(root, 'db', 'schema.pg.sql'), 'utf8');
const lite = fs.readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8');
const out = `// Skema database — DISEMATKAN sebagai string JS.
// Alasan: di Vercel, file db/*.sql TIDAK ikut terbawa ke dalam bundle serverless
// (file tracing Next.js tidak menangkap fs.readFileSync dinamis), sehingga
// ensureSchema() crash ENOENT saat login. File db/*.sql tetap jadi sumber
// kanonik; jalankan \`node scripts/sync-schema-js.mjs\` setelah mengubahnya.
// Dibuat otomatis — jangan edit manual.

export const SCHEMA_PG = ${JSON.stringify(pg)};

export const SCHEMA_SQLITE = ${JSON.stringify(lite)};
`;
fs.writeFileSync(path.join(root, 'src', 'lib', 'schema-sql.js'), out);
console.log('schema-sql.js ditulis ulang dari db/*.sql');
