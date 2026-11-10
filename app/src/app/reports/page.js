import { requireUser } from '@/lib/auth';

export default async function ReportsPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const from = sp?.from || '';
  const to = sp?.to || '';
  const q = from || to ? `?from=${from}&to=${to}` : '';
  return (
    <div>
      <h1>Laporan</h1>
      <p className="muted">Semua PDF dibuat di <b>sisi server</b> — tombol unduh/bagikan jalan di Chrome biasa. Nomor HP tampil lengkap tanpa sensor. Pilih periode dulu (opsional), lalu unduh.</p>
      <div className="card">
        <form method="get" className="row">
          <div><label>Dari tanggal</label><input name="from" type="date" defaultValue={from} /></div>
          <div><label>Sampai tanggal</label><input name="to" type="date" defaultValue={to} /></div>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Terapkan Periode</button></div>
        </form>
      </div>
      <div className="card">
        <h2>Laporan Daftar Pelanggan</h2>
        <p className="muted">Nama, HP lengkap, tahap pipeline, follow-up, sumber.{from || to ? ` Periode ${from || 'awal'} s/d ${to || 'hari ini'}.` : ' Seluruh periode.'}</p>
        <a className="btn" href={'/api/reports/pelanggan' + q}>⬇️ Unduh PDF Daftar Pelanggan</a>
      </div>
      <div className="card">
        <h2>Laporan Buku Tamu</h2>
        <p className="muted">Nama tamu, HP lengkap, tanggal & jam kunjungan, keperluan, unit.</p>
        <a className="btn" href={'/api/reports/bukutamu' + q}>⬇️ Unduh PDF Buku Tamu</a>
      </div>
      <div className="card">
        <h2>Laporan Flyering</h2>
        <p className="muted">Catatan flyering per tanggal + rekap per spot.</p>
        <a className="btn" href={'/api/reports/flyering' + q}>⬇️ Unduh PDF Flyering</a>
      </div>
    </div>
  );
}
