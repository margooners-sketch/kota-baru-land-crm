# Migrasi Dashboard CRM Kota Baru Land ke Web Mandiri (Vercel + Neon)

Status per 10 Nov 2026 sore: **Tahap 1 SELESAI, Tahap 2 SELESAI (lokal, teruji).
Belum di-deploy** — Tahap 3 menunggu akses deploy ke akun Vercel Bang.

## Tahap 1 — Ekspor data (selesai, terverifikasi)

Sumber: action baca dashboard lama `dashboard-pelaporan-2` saja (tanpa tulis/
hapus/reset, tanpa baca source, tanpa akses database langsung). Hanya data asli
(`isSimulation=false`); data simulasi/FAKE tidak ikut.

| File seed | Jumlah | Keterangan |
|---|---|---|
| `seed/units.json` | 78 | 77 TMB 2 + G10 TMB 1 |
| `seed/customers.json` | 26 | Minat 23, Survei 2, Baru 1 |
| `seed/flyering.json` | 12 | total 337 brosur |
| `seed/guestbook.json` | 2 | Ibu Dewi, Pelanggan Kantor 5 |
| `seed/settings.json` | — | target closing 4/bln; 2 akun (maruf Owner aktif, "User" staff nonaktif — TIDAK ada akun Manager) |

Selisih vs rencana (78/26/12/2): **0**. Detail + catatan selisih ada di
`seed/README.md`. Catatan penting: password/hash TIDAK bisa diekspor — Owner
wajib atur ulang password di aplikasi baru (password sementara
`maruf-2026-ganti`, wajib diganti saat pertama login).

## Tahap 2 — Bangun ulang aplikasi (selesai, teruji lokal)

Lokasi: `app/` — Next.js 15 (App Router) + SQL langsung (tanpa Prisma:
download engine binary Prisma gagal berulang `ECONNRESET`, jadi dipakai
`node:sqlite` lokal + driver `pg` untuk Postgres/Neon).

- `npm run build` sukses (15 route).
- Database lokal ter-seed: 78/26/12/2, closing target 4, akun owner `maruf`.
- Uji HTTP (server produksi lokal): login benar → 303 ke dashboard;
  password salah → error; dashboard menampilkan 78 unit & 26 pelanggan;
  tambah pelanggan → 303 ke detail baru; booking H05 → unit terkunci;
  Akad → H05 Sold Out; batal (Owner) → H05 kembali Ready; kalkulator H05
  + SHM + 5 m² kelebihan tanah = Total Rp5.500.000, kekurangan Rp3.500.000,
  hook Rp10.000.000, kelebihan tanah Rp10.000.000 (semua benar);
  3 laporan PDF server-side → 200 `application/pdf`, isi terverifikasi
  (Pelanggan Kantor 23 + HP lengkap 6289675662114).
- Jalur Postgres divalidasi dengan database Postgres in-memory (pg-mem):
  `schema.pg.sql` + seed SQL + alur booking/akad/batal semuanya valid.
  (Termasuk perbaikan: urutan tabel di skema — `customers` harus dibuat
  sebelum `units` karena foreign key; Postgres menolak forward reference.)
- Data uji yang dipakai saat pengujian sudah dihapus; `dev.db` kembali
  persis seed (78/26/12/2, 0 unit ter-booking).

Fitur lengkap ada di `app/README.md`.

## Perubahan dari rencana awal (per update Bang 10 Nov 2026)

- **Neon sudah dibuat Bang sendiri** (~14:55 WIB, margooners@gmail.com).
  SuPri TIDAK membuat akun Neon dan TIDAK menunggu connection string.
- Aplikasi membaca `DATABASE_URL` dari environment variable. Lokal pakai
  SQLite (`file:./dev.db`); produksi pakai Postgres Neon.
- `scripts/seed.mjs` membaca `DATABASE_URL` dari env/`.env`, jadi data seed
  bisa dimasukkan setelah deploy saat env var sudah diset di Vercel.
- **Connection string Neon JANGAN pernah diketik di chat** — dimasukkan
  langsung sebagai env var di dashboard Vercel.

## Tahap 3 — Deploy (belum dikerjakan)

1. Akses deploy ke akun Vercel Bang (token / cara deploy) — masih perlu diurus.
2. Set env var `DATABASE_URL` (Neon) di dashboard Vercel.
3. Deploy, lalu `npm run db:setup && npm run db:seed` dengan DATABASE_URL
   yang sama, login sebagai `maruf`, ganti password, verifikasi data +
   laporan PDF di Chrome.
4. Uji coba → pindah penuh kalau stabil; dashboard Muse tetap cadangan.
