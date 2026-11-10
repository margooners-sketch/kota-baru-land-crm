# CRM Kota Baru Land — Taman Melati Bulan (rebuild mandiri)

Aplikasi web Next.js (App Router) pengganti dashboard Muse `dashboard-pelaporan-2`.
Data: 78 unit (77 TMB 2 + G10 TMB 1), 26 pelanggan, 12 catatan flyering, 2 buku tamu.

## Database — DATABASE_URL dari environment variable

Aplikasi membaca **satu** variabel: `DATABASE_URL`.

| Lingkungan | DATABASE_URL | Keterangan |
|---|---|---|
| Lokal/dev | `file:./dev.db` | SQLite via `node:sqlite` (bawaan Node 24, tanpa binary tambahan) |
| Produksi (Vercel + Neon) | `postgres://...` | Postgres via driver `pg` (SSL otomatis untuk `*.neon.tech`) |

Skema dipilih otomatis dari awalan URL: `db/schema.sql` (SQLite) atau
`db/schema.pg.sql` (Postgres). Keduanya dibuat semirip mungkin (boolean =
INTEGER 0/1, tanggal = TEXT ISO) supaya query aplikasi yang sama jalan di
keduanya; placeholder `?` diterjemahkan otomatis ke `$1..$n` untuk Postgres.

> **PENTING — connection string Neon JANGAN pernah diketik di chat dan JANGAN
> disimpan di file/repo.** Database Neon sudah dibuat Bang sendiri. Connection
> string dimasukkan LANGSUNG sebagai Environment Variable `DATABASE_URL` di
> dashboard Vercel (Project → Settings → Environment Variables).

## Menjalankan lokal

```bash
cp .env.example .env        # DATABASE_URL=file:./dev.db
npm install
npm run db:setup            # buat tabel dari skema
npm run db:seed             # isi data seed Tahap 1 (idempotent, aman diulang)
npm run dev                 # http://localhost:3000
```

Login pertama: username `maruf`, password dari `TEMP_OWNER_PASSWORD`
(default `maruf-2026-ganti`). **Wajib diganti Bang saat pertama login**
(menu Pengaturan → Ganti Password), karena password asli dashboard lama
tidak bisa diekspor.

## Deploy ke Vercel (Tahap 3)

1. Push repo ini ke GitHub (atau deploy dari CLI dengan `vercel`).
2. Di dashboard Vercel, isi Environment Variable **`DATABASE_URL`** dengan
   connection string Neon (disalin dari dashboard Neon Bang — jangan lewat chat).
3. Deploy.
4. Setelah deploy, isi database Neon dengan data seed — jalankan dari mesin
   yang punya akses, dengan `DATABASE_URL` yang sama dari environment:
   ```bash
   npm run db:setup && npm run db:seed
   ```
   (Skrip membaca `DATABASE_URL` dari env atau file `.env`; jangan pernah
   menempel connection string di chat untuk langkah ini.)
5. Login sebagai `maruf`, ganti password sementara, cek Daftar Unit (78),
   Pelanggan (26), lalu uji satu laporan PDF.

Catatan: akun Vercel + database Neon sudah dibuat Bang (margooners@gmail.com).
Akses deploy ke akun Vercel Bang masih perlu diurus saat aplikasi jadi.

## Fitur (sesuai daftar periksa rencana migrasi)

- Login + peran Owner / Manager / Staff (sesi cookie httpOnly, bcrypt).
- Beranda / Briefing Pagi: follow-up jatuh tempo, leads terpanas (skor 0–100
  Panas/Hangat/Dingin), Belum Dibalas, flyering terakhir, target closing.
- Daftar Unit: 78 unit, filter (Ready/Proses/Promo/Dipesan/Sold Out/Belum
  dibangun), status Dipesan bila sedang di-booking.
- Pelanggan + pipeline 10 tahap (Minat → Survei → Lolos BI Checking →
  Booking → Berkas → Bank/KPR → SP3K → Akad → Serah Terima → Naik SHM).
  Booking mengunci unit ke pelanggan; Akad (closing) → unit Sold Out;
  batal booking/closing hanya Owner, unit kembali ke status semula.
  Berkas opsional (checklist 3 kelompok brosur TMB 2) — tidak mengunci.
- Kalkulator harga: skema Area Depan 12,7 jt / Belakang 4 jt / H05-H07 2 jt /
  TMB 1 G10; Naik SHM +Rp3.500.000; hook H05 +Rp10 jt; kelebihan tanah
  Rp2.000.000/m² di luar all in.
- Template WA + tombol WA Bisnis (wa.me), sapaan Bapak/Ibu/Bapak-Ibu sesuai
  jenis kelamin (tidak ditebak dari nama), 4 template keberatan.
- Flyering + rekap per spot; Buku Tamu + auto-input ke Daftar Pelanggan
  (anti-duplikat HP).
- Laporan PDF **dibuat di sisi server** (pdf-lib): Daftar Pelanggan, Buku
  Tamu, Flyering — nomor HP lengkap, filter periode. Tombol unduh jalan di
  Chrome biasa (tanpa Web Share API).
- Pengaturan: ganti password, target closing, kelola akun (Owner/Manager),
  Acuan Brosur TMB 2 + NOTE, Reset Pelanggan/Transaksi (Owner saja; unit
  tidak direset).

## Struktur

```
app/
  db/schema.sql        skema SQLite (lokal)
  db/schema.pg.sql     skema Postgres/Neon (produksi)
  scripts/setup-db.mjs membuat tabel (baca DATABASE_URL dari env/.env)
  scripts/seed.mjs     seed dari ../seed/*.json (baca DATABASE_URL dari env/.env)
  scripts/load-env.mjs pemuat .env untuk skrip CLI
  src/lib/db.js        adapter dual SQLite/Postgres + mapper
  src/lib/auth.js      sesi + peran
  src/lib/pricing.js   aturan harga, skor leads, template WA, checklist
  src/lib/pdf.js       pembangun PDF sisi server
  src/app/             halaman + server actions + /api/reports/*
  seed/ (di ../seed)   data ekspor Tahap 1 (JSON)
```

## Yang belum / batasan

- Belum di-deploy (Tahap 3 butuh akses deploy akun Vercel Bang).
- Jalur Postgres diuji dengan database Postgres in-memory (pg-mem), bukan
  terhadap Neon asli — uji pertama setelah deploy: `db:setup` + `db:seed`
  lalu login.
- Tidak ada Google Drive export (dihapus atas perintah Bang 1 Nov 2026).
- Data simulasi/FAKE dari dashboard lama TIDAK ikut dipindah.
- G10 di seed masih tercatat tipe 36/75 (nilai dashboard lama) — koreksi Bang
  36/70 belum diterapkan ke seed; konfirmasi sebelum dipakai ke pelanggan.
- Nomor HP Pelanggan Kantor 19 (`62895393522991`, 13 digit) kemungkinan salah
  ketik — tercatat apa adanya dari dashboard.
