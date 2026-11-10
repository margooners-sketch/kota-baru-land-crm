# Seed data — ekspor dashboard lama (Tahap 1)

Diekspor: **10 November 2026 ~14:49 WIB** dari artifact `dashboard-pelaporan-2`,
HANYA lewat action baca (`listunits`, `listcustomers`, `listflyering`, `listguestbook`,
`getclosingtarget`, `listsalesaccounts`). Tidak ada action tulis/hapus/reset yang dipakai.
Dashboard lama TIDAK diubah.

## Jumlah terverifikasi (cocok dengan rencana, selisih 0)

| Jenis | Rencana | Live | Keterangan |
|---|---|---|---|
| Unit | 78 | **78** | 77 TMB 2 + 1 TMB 1 (G10) |
| Pelanggan | 26 | **26** | semua `isSimulation:false` (0 simulasi di hasil) |
| Flyering | 12 | **12** | semua asli, 2–9 Nov 2026, total 337 brosur |
| Buku tamu | 2 | **2** | keduanya tertaut ke pelanggan |
| Target closing/bulan | 4 | **4** | |
| Akun | 2 | **2** | lihat catatan akun di bawah |

Rincian pelanggan: Minat 23, Survei 2 (Ibu Dewi, Pelanggan Kantor 5), Baru tanpa tahap 1
(Pelanggan Kantor 8). Follow-up jatuh tempo 12 Nov 2026: Kantor 14–23 (10 orang).

## File

- `units.json` — 78 unit master (kode, cluster, tipe, LT/LB, harga, status, promo).
- `customers.json` — 26 pelanggan lengkap (pipeline, follow-up, sertifikat, berkas).
- `flyering.json` — 12 catatan sesi flyering + rekap per spot.
- `guestbook.json` — 2 entri buku tamu (unitId + customerId tertaut).
- `settings.json` — target closing + akun (tanpa password).

## Catatan / selisih yang perlu diketahui

1. **Akun:** rencana menulis "2 akun (Owner/Manager)". Kenyataan live: akun ke-2 adalah
   role **staff** bernama `User`, status **NONAKTIF**. Tidak ada akun Manager di dashboard
   lama. Akun Owner: `maruf` (Maruf Abdul Aziz, +6281808111141, aktif).
2. **Password TIDAK bisa diekspor.** Action `listsalesaccounts` tidak mengembalikan
   password/hash. Di aplikasi baru, akun Owner `maruf` dibuat dengan password sementara
   (lihat `app/README.md`) dan **Bang wajib ganti password saat pertama login**.
3. **G10:** dashboard masih mencatat LT 75 (promoNotes "Tipe 36/75"), padahal koreksi
   Bang 9 Nov 2026 adalah **36/70**. Seed memakai nilai dashboard apa adanya; jangan
   pakai angka LT G10 ke pelanggan sebelum dikonfirmasi kantor.
4. **Nomor HP Pelanggan Kantor 19** tercatat `62895393522991` (13 digit) — kemungkinan
   salah ketik di dashboard lama, perlu dicek ke kantor.
5. **Status unit `null` (72 unit):** dashboard mengembalikan `status: null` untuk
   sebagian besar unit — di aplikasi baru ditampilkan sebagai "Belum dibangun"
   (default), kecuali yang berstatus `ready` (H05, H07, G10) dan `proses`
   (I04, I05, M26). Tidak ada unit berstatus Sold Out/Dipesan di data live
   (kunci simulasi G10/F07 tidak ikut karena data simulasi tidak diekspor).
6. **Pelanggan Kantor 23 (id 65):** follow-up "Menanyakan Unit Taman Melati Kurung",
   satu-satunya pelanggan dengan `isReminder: true` dan urgensi Rendah.
7. Data simulasi/FAKE **tidak ikut** — semua baris di file seed ini adalah data asli.
