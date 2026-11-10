// Aturan bisnis terkonfirmasi Kota Baru Land — JANGAN ubah angka tanpa konfirmasi kantor.
// Sumber: breakdown TMB 2 (foto Bang 31 Okt 2026), NOTE.xlsx, koreksi Bang.
export const STAGES = [
  { key: 'minat', label: 'Minat' },
  { key: 'survei', label: 'Survei' },
  { key: 'bi_checking', label: 'Lolos BI Checking' },
  { key: 'booking', label: 'Booking' },
  { key: 'berkas', label: 'Berkas' },
  { key: 'bank_kpr', label: 'Bank/KPR' },
  { key: 'sp3k', label: 'SP3K' },
  { key: 'akad', label: 'Akad' },
  { key: 'serah_terima', label: 'Serah Terima' },
  { key: 'naik_shm', label: 'Naik SHM' },
];
export const STAGE_LABELS = Object.fromEntries(STAGES.map((s) => [s.key, s.label]));

export const SHM_FEE = 3500000; // Naik SHM menambah Total Bayar + kekurangan (aturan Bang 1 Nov 2026)
export const BOOKING_FEE = 2000000;
export const HOOK_FEE = 10000000; // H05 hook, di luar all in
export const EXCESS_LAND_PER_M2 = 2000000; // TMB 2, di luar all in

// Skema harga TMB 2 per unit (dari promoNotes / kode unit)
export function priceScheme(unit) {
  if (!unit) return null;
  if (unit.cluster === 'TMB 1') {
    return { cluster: 'TMB 1', label: 'TMB 1 — G10', cash: 160000000, cashFees: 7800000, cashTotal: 167800000, cashTotalHm: 171300000, kprAllIn: 12700000, note: 'Cash Rp160 jt + biaya Rp7,8 jt. KPR all in Rp12,7 jt (rincian Harga PT/kekurangan belum diberikan kantor).' };
  }
  if (unit.code === 'H05' || unit.code === 'H07') {
    return { cluster: 'TMB 2', label: 'Promo Khusus 2 Juta All In', allIn: 2000000, bookingFee: 2000000, shortfall: 0, hook: unit.code === 'H05' ? HOOK_FEE : 0, note: 'Promo khusus unit Ready. H05 hook +Rp10 jt di luar all in.' };
  }
  if ((unit.promoNotes || '').includes('4 juta')) {
    return { cluster: 'TMB 2', label: 'Area Belakang — All In 4 Juta', allIn: 4000000, bookingFee: 2000000, shortfall: 2000000, hook: 0, note: 'Promo All in 4 juta — Area Belakang.' };
  }
  if ((unit.promoNotes || '').includes('12,7')) {
    return { cluster: 'TMB 2', label: 'Area Depan — All In 12,7 Juta', allIn: 12760000, bookingFee: 2000000, shortfall: 10760000, hook: 0, note: 'All in 12,7 juta — Area Depan.' };
  }
  return { cluster: 'TMB 2', label: 'TMB 2', allIn: null, bookingFee: 2000000, shortfall: null, hook: 0, note: 'Skema belum ditentukan untuk unit ini (bukan promo depan/belakang).' };
}

// Ringkasan harga transaksi: { totalBayar, bookingFee, kekurangan, hook, kelebihanTanah, shmFee }
export function calcPrice(unit, { certificate = null, excessM2 = 0 } = {}) {
  const s = priceScheme(unit);
  if (!s) return null;
  if (s.cluster === 'TMB 1') {
    return { ...s, totalBayar: certificate === 'shm' ? s.cashTotalHm : s.cashTotal, bookingFee: 0, kekurangan: 0, hook: 0, kelebihanTanah: 0, shmFee: certificate === 'shm' ? SHM_FEE : 0 };
  }
  const shmFee = certificate === 'shm' ? SHM_FEE : 0;
  const kelebihanTanah = excessM2 * EXCESS_LAND_PER_M2;
  const allIn = s.allIn ?? 0;
  return { ...s, totalBayar: allIn + shmFee, bookingFee: s.bookingFee, kekurangan: (s.shortfall ?? 0) + shmFee, hook: s.hook || 0, kelebihanTanah, shmFee };
}

// Sapaan WA: Bapak (laki-laki) / Ibu (perempuan) / Bapak/Ibu (tidak diketahui) — jangan ditebak dari nama.
export function greeting(gender) {
  if (gender === 'laki_laki') return 'Bapak';
  if (gender === 'perempuan') return 'Ibu';
  return 'Bapak/Ibu';
}
export function waLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  const norm = digits.startsWith('0') ? '62' + digits.slice(1) : digits;
  return `https://wa.me/${norm}?text=${encodeURIComponent(text)}`;
}
export function rupiah(n) {
  if (n === null || n === undefined) return '-';
  return 'Rp' + Number(n).toLocaleString('id-ID');
}

// Skor leads 0–100 (transparan, sesuai dashboard lama): tahap + kecepatan respons.
// Panas >=70, Hangat 40–69, Dingin <40. Menurun bila follow-up lewat / lama diam.
export function leadScore(customer) {
  const stages = customer.stages || [];
  const base = { minat: 30, survei: 55, bi_checking: 70, booking: 85, berkas: 88, bank_kpr: 90, sp3k: 92, akad: 95, serah_terima: 97, naik_shm: 100 }[stages[stages.length - 1]] ?? 20;
  const today = new Date();
  const fu = customer.followUpDate ? new Date(customer.followUpDate + 'T00:00:00') : null;
  let adj = 0;
  if (fu) {
    const diffDays = Math.round((today - fu) / 86400000);
    if (diffDays < 0) adj += 5; // follow-up masih di depan
    else if (diffDays === 0) adj += 10; // jatuh tempo hari ini
    else adj -= Math.min(25, diffDays * 3); // lewat, makin lama makin dingin
  }
  const last = customer.followUpActualDate ? new Date(customer.followUpActualDate + 'T00:00:00') : null;
  if (last) {
    const silent = Math.round((today - last) / 86400000);
    if (silent > 7) adj -= 10;
    if (silent > 14) adj -= 10;
  }
  const score = Math.max(0, Math.min(100, base + adj));
  return { score, label: score >= 70 ? 'Panas' : score >= 40 ? 'Hangat' : 'Dingin' };
}

export function urgencyOf(customer) {
  const today = new Date().toISOString().slice(0, 10);
  const fu = customer.followUpDate;
  if (!fu) return { key: 'tidak_ada', label: 'Tidak ada reminder' };
  if (fu < today) return { key: 'mendesak', label: 'Mendesak' };
  const diff = Math.round((new Date(fu) - new Date(today)) / 86400000);
  if (diff === 0) return { key: 'tinggi', label: 'Tinggi' };
  if (diff <= 3) return { key: 'sedang', label: 'Sedang' };
  return { key: 'rendah', label: 'Rendah' };
}

// Template WA — nada ramah di semua urgensi, maks ~3 baris inti + 1 pilihan konkret.
export const WA_TEMPLATES = {
  followup: (c) => `Selamat pagi ${greeting(c.gender)}, saya Maruf dari Kota Baru Land, lanjut ya.\n${greeting(c.gender)} kemarin sempat lihat info rumah subsidi di Wonosari, masih cari atau sudah dapat?\nKalau masih cari, boleh saya kirim denah unit ready-nya?`,
  survei: (c) => `Selamat pagi ${greeting(c.gender)}, lanjut ya.\nSurvei unitnya enaknya hari apa, ${greeting(c.gender)}? Pagi atau siang?\nSaya siapkan jadwalnya.`,
  bi_checking: (c) => `Selamat pagi ${greeting(c.gender)}, lanjut ya.\nBerkas untuk BI Checking sudah siap semua atau ada yang masih kurang?\nKalau sudah lengkap, saya bantu ajukan.`,
  booking: (c) => `Selamat pagi ${greeting(c.gender)}, lanjut ya.\nUnitnya sudah dipilih, booking fee Rp2 juta bisa dibayar hari ini atau besok?\nSaya kunci unitnya setelah booking masuk.`,
};
export const OBJECTION_TEMPLATES = {
  kemahalan: (c) => `Pagi ${greeting(c.gender)}, saya paham.\nTotal bayar Area Belakang cuma 4 juta all in, booking 2 juta dulu, sisanya 2 juta sebelum akad.\nMau saya kirim rincian biayanya?`,
  nanti_dulu: (c) => `Siap ${greeting(c.gender)}, tidak apa-apa.\nUnit ready jumlahnya terbatas, jadi kalau nanti berubah pikiran kabari saya aja ya.\nMau saya simpan dulu unit yang ${greeting(c.gender)} incar?`,
  bandingkan: (c) => `Pagi ${greeting(c.gender)}, wajar dibandingkan dulu.\nYang membedakan kami: total bayar sudah all in, tidak ada biaya tersembunyi di luar yang saya sebutkan.\nMau saya kirim perbandingan rinciannya?`,
  syarat_kpr: (c) => `Pagi ${greeting(c.gender)}, syaratnya saya bantu siapkan.\nYang utama KTP, KK, slip gaji/rekening koran, dan aplikasi SIKASEP.\nSaya bantu cek skemanya sampai pengajuan, tanpa janji hasil bank.`,
};

// Syarat Pemberkasan brosur TMB 2 (3 kelompok, untuk checklist pelanggan)
export const CHECKLIST_GROUPS = [
  { key: 'umum', label: 'Syarat Umum', items: ['FC KTP & FC KK suami istri (4 lembar berwarna)', 'FC Akta Nikah/Akta Cerai/Surat Lajang dari kelurahan (4)', 'Pas foto 3x4 suami istri (1 lembar berwarna)', 'FC NPWP & SPT (4 berwarna)', 'FC BPJS Kesehatan suami istri (4 berwarna)', 'Materai @10.000 — 16 lembar KPR / 5 lembar CASH', 'Surat keterangan tidak memiliki rumah dari kelurahan', 'Surat keterangan tidak bekerja dari kelurahan (bila pasangan tidak bekerja)', 'Instal aplikasi SIKASEP (KPR Subsidi)'] },
  { key: 'karyawan', label: 'PNS & Karyawan', items: ['Slip gaji 3 bulan terakhir', 'Rekening koran 3 bulan terakhir (wajib ada)', 'FC SK PNS pertama–terakhir', 'FC Surat Keterangan Kerja tetap (karyawan)', 'Surat kontrak minim 3 tahun (karyawan kontrak)', 'Sharelok + foto tempat kerja'] },
  { key: 'wirausaha', label: 'Wirausaha', items: ['SIUP/SKU/TDP/SITU/HO', 'Laporan keuangan 6 bulan terakhir (harian)', 'Foto tempat usaha & share lok', 'FC rekening transaksi usaha 6 bulan terakhir', 'FC NPWP', 'Usaha minim 5 tahun'] },
];
