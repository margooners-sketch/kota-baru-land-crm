// Kartu acuan harga + NOTE — dipakai di Pengaturan dan di halaman detail pelanggan.
// Satu sumber kebenaran: ubah di sini, berubah di kedua tempat.
export default function AcuanBrosur() {
  return (
    <div className="card">
      <h2>Acuan Brosur TMB 2</h2>
      <p><b>Taman Melati Bulan 2 — Wonosari, Klaten.</b> Rumah 6×10 m, include pompa air (air sumur).</p>
      <ul>
        <li><b>Area Depan (pink) — All in Rp12.760.000:</b> booking Rp2.000.000, kekurangan Rp10.760.000.</li>
        <li><b>Area Belakang (hijau) — All in Rp4.000.000:</b> booking Rp2.000.000, kekurangan Rp2.000.000.</li>
        <li><b>H05/H07 promo khusus — All in Rp2.000.000</b> (Ready). H05 hook +Rp10.000.000 di luar all in.</li>
        <li><b>Naik SHM +Rp3.500.000</b> ke Total Bayar &amp; kekurangan. Tetap SHGB tanpa tambahan.</li>
        <li>Kelebihan tanah Rp2.000.000/m² di luar all in — konfirmasi luas ke kantor sebelum angka final.</li>
        <li><b>TMB 1 G10 (36/70):</b> Cash Rp160.000.000 + biaya Rp7.800.000 = Rp167.800.000 (HM Rp171.300.000); KPR all in Rp12.700.000. Rincian Harga PT/kekurangan belum diberikan kantor.</li>
      </ul>
      <p className="muted">Skema reguler brosur (ilustrasi FLPP): DP 5% Rp8.300.000, KPR Rp157.700.000; angsuran 10 th Rp1.701.900 / 15 th Rp1.266.100 / 20 th Rp1.054.500. Booking fee kembali Rp1.500.000 bila bank menolak (dengan surat penolakan); batal sepihak = booking fee hilang. DP/plafon sepenuhnya ditentukan bank.</p>
      <h3>Catatan (NOTE)</h3>
      <ul>
        <li>Jangan janjikan SBUM. Jangan tulis “166 jadi 160”. Jangan tulis angsuran pasti untuk skema promo all in — angsuran ditentukan bank/BTN.</li>
        <li>Jangan campur skema TMB 2 dengan TMJ / Kurung / Juwiring. Setiap iklan promo: “syarat dan ketentuan berlaku, DP/plafon ditentukan bank”.</li>
        <li>Jangan janjikan DP 0%, biaya KPR gratis, bebas banjir, atau SHM/PBG termasuk — sampai kantor mengonfirmasi.</li>
        <li>Jangan janjikan “dijamin/sampai lolos” BI Checking.</li>
      </ul>
    </div>
  );
}
