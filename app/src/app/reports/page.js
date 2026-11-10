import { requireUser } from '@/lib/auth';
import { all, mapCustomer, mapGuest, mapFlyering } from '@/lib/db';
import { STAGE_LABELS } from '@/lib/pricing';
import { formatDateId } from '@/lib/utils';
import ShareButton from './share-button';

const PURPOSE_LABELS = { tanya_unit: 'Tanya unit', survei: 'Survei', booking: 'Booking', lainnya: 'Lainnya' };
const PRESETS = [
  { key: '', label: 'Semua' },
  { key: 'harian', label: 'Harian' },
  { key: 'mingguan', label: 'Mingguan' },
  { key: 'bulanan', label: 'Bulanan' },
  { key: 'kuartal', label: 'Kuartal' },
  { key: 'tahunan', label: 'Tahunan' },
];

function periodRange(preset) {
  const today = new Date().toISOString().slice(0, 10);
  const d = new Date(today + 'T00:00:00Z');
  if (preset === 'harian') return { from: today, to: today };
  if (preset === 'mingguan') {
    const s = new Date(d); s.setUTCDate(s.getUTCDate() - 6);
    return { from: s.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'bulanan') return { from: today.slice(0, 7) + '-01', to: today };
  if (preset === 'kuartal') {
    const m = d.getUTCMonth();
    const s = new Date(Date.UTC(d.getUTCFullYear(), m - (m % 3), 1));
    return { from: s.toISOString().slice(0, 10), to: today };
  }
  if (preset === 'tahunan') return { from: today.slice(0, 4) + '-01-01', to: today };
  return { from: '', to: '' };
}

function inRange(date, from, to) {
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export default async function ReportsPage({ searchParams }) {
  await requireUser();
  const sp = await searchParams;
  const preset = sp?.preset || '';
  const ranged = periodRange(preset);
  const from = sp?.from || ranged.from;
  const to = sp?.to || ranged.to;
  const q = from || to ? `?from=${from}&to=${to}` : '';
  const periodLabel = from || to
    ? `Periode ${from ? formatDateId(from) : 'awal'} s/d ${to ? formatDateId(to) : 'hari ini'}`
    : 'Seluruh periode';

  // --- Ringkasan (sama filternya dengan PDF) ---
  let customers = (await all('SELECT * FROM customers ORDER BY contact_date ASC, id ASC')).map(mapCustomer);
  if (from || to) customers = customers.filter((c) => inRange(c.contactDate || '', from, to));
  const stageCounts = {};
  customers.forEach((c) => {
    const label = c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru';
    stageCounts[label] = (stageCounts[label] || 0) + 1;
  });
  const stageLine = Object.entries(stageCounts).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—';
  const waPelanggan = `Laporan Daftar Pelanggan — Kota Baru Land\n${periodLabel}\nTotal: ${customers.length} pelanggan\n${stageLine}`;

  let guests = (await all('SELECT * FROM guestbook ORDER BY visit_date ASC, id ASC')).map(mapGuest);
  if (from || to) guests = guests.filter((g) => inRange(g.visitDate || '', from, to));
  const purposeCounts = {};
  guests.forEach((g) => {
    const label = PURPOSE_LABELS[g.purpose] || g.purpose;
    purposeCounts[label] = (purposeCounts[label] || 0) + 1;
  });
  const purposeLine = Object.entries(purposeCounts).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—';
  const waBukutamu = `Laporan Buku Tamu — Kota Baru Land\n${periodLabel}\nTotal: ${guests.length} tamu\n${purposeLine}`;

  let logs = (await all('SELECT * FROM flyering ORDER BY date ASC, id ASC')).map(mapFlyering);
  if (from || to) logs = logs.filter((f) => inRange(f.date || '', from, to));
  const totalBrosur = logs.reduce((s, f) => s + (f.flyersGiven || 0), 0);
  const totalTanya = logs.reduce((s, f) => s + (f.askedContact || 0), 0);
  const totalTercatat = logs.reduce((s, f) => s + (f.customersRecorded || 0), 0);
  const spotCount = new Set(logs.map((f) => f.spot)).size;
  const waFlyering = `Laporan Flyering — Kota Baru Land\n${periodLabel}\nTotal: ${totalBrosur} brosur di ${spotCount} spot, ${logs.length} kegiatan\nTanya kontak: ${totalTanya} · Pelanggan tercatat: ${totalTercatat}`;

  return (
    <div>
      <h1>Laporan</h1>
      <p className="muted">Semua PDF dibuat di <b>sisi server</b> — tombol unduh/bagikan jalan di Chrome biasa. Nomor HP tampil lengkap tanpa sensor. Pilih periode dulu (opsional), lalu unduh atau bagikan.</p>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          {PRESETS.map((p) => (
            <a key={p.key || 'semua'} className={'btn small' + (preset === p.key ? '' : ' ghost')} href={'/reports' + (p.key ? `?preset=${p.key}` : '')}>{p.label}</a>
          ))}
        </div>
        <form method="get" className="row">
          <div><label>Dari tanggal</label><input name="from" type="date" defaultValue={from} /></div>
          <div><label>Sampai tanggal</label><input name="to" type="date" defaultValue={to} /></div>
          <div style={{ alignSelf: 'end' }}><button className="btn" type="submit">Terapkan Periode</button></div>
        </form>
        <p className="muted" style={{ marginTop: 8 }}>{periodLabel}.</p>
      </div>

      <div className="card">
        <h2>Laporan Daftar Pelanggan</h2>
        <p className="muted">Nama, HP lengkap, tahap pipeline, follow-up, sumber. {periodLabel} — {customers.length} pelanggan.</p>
        <pre>{waPelanggan}</pre>
        <div className="row">
          <a className="btn" href={'/api/reports/pelanggan' + q}>⬇️ Unduh PDF Daftar Pelanggan</a>
          <ShareButton href={'/api/reports/pelanggan' + q} filename={`Laporan-Daftar-Pelanggan-${from || 'awal'}-${to || 'hari-ini'}.pdf`} />
          <a className="wa" href={'https://wa.me/?text=' + encodeURIComponent(waPelanggan)} target="_blank" rel="noreferrer">💬 Kirim via WA</a>
        </div>
      </div>

      <div className="card">
        <h2>Laporan Buku Tamu</h2>
        <p className="muted">Nama tamu, HP lengkap, tanggal &amp; jam kunjungan, keperluan, unit. {periodLabel} — {guests.length} tamu.</p>
        <pre>{waBukutamu}</pre>
        <div className="row">
          <a className="btn" href={'/api/reports/bukutamu' + q}>⬇️ Unduh PDF Buku Tamu</a>
          <ShareButton href={'/api/reports/bukutamu' + q} filename={`Laporan-Buku-Tamu-${from || 'awal'}-${to || 'hari-ini'}.pdf`} />
          <a className="wa" href={'https://wa.me/?text=' + encodeURIComponent(waBukutamu)} target="_blank" rel="noreferrer">💬 Kirim via WA</a>
        </div>
      </div>

      <div className="card">
        <h2>Laporan Flyering</h2>
        <p className="muted">Catatan flyering per tanggal + rekap per spot. {periodLabel} — {totalBrosur} brosur, {logs.length} kegiatan.</p>
        <pre>{waFlyering}</pre>
        <div className="row">
          <a className="btn" href={'/api/reports/flyering' + q}>⬇️ Unduh PDF Flyering</a>
          <ShareButton href={'/api/reports/flyering' + q} filename={`Laporan-Flyering-${from || 'awal'}-${to || 'hari-ini'}.pdf`} />
          <a className="wa" href={'https://wa.me/?text=' + encodeURIComponent(waFlyering)} target="_blank" rel="noreferrer">💬 Kirim via WA</a>
        </div>
      </div>
    </div>
  );
}
