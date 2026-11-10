// GET /api/reports/bukutamu?from=YYYY-MM-DD&to=YYYY-MM-DD — PDF sisi server.
import { requireUser } from '@/lib/auth';
import { all, mapGuest } from '@/lib/db';
import { buildTablePdf } from '@/lib/pdf';
import { formatDateId } from '@/lib/utils';

const PURPOSE = { tanya_unit: 'Tanya unit', survei: 'Survei', booking: 'Booking', lainnya: 'Lainnya' };

export async function GET(req) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  let guests = (await all('SELECT * FROM guestbook ORDER BY visit_date ASC, id ASC')).map(mapGuest);
  if (from) guests = guests.filter((g) => g.visitDate >= from);
  if (to) guests = guests.filter((g) => g.visitDate <= to);
  const period = from || to ? `Periode ${from || 'awal'} s/d ${to || 'hari ini'}` : 'Seluruh periode (sejak awal kerja)';
  const rows = guests.map((g, i) => [
    String(i + 1), g.guestName, g.phone, formatDateId(g.visitDate), g.arrivalTime || '-',
    PURPOSE[g.purpose] || g.purpose, g.unitLabel || '-', g.notes || '-',
  ]);
  const bytes = await buildTablePdf({
    title: 'Laporan Buku Tamu',
    subtitle: `Kota Baru Land — Taman Melati Bulan · ${period} · Total ${guests.length} kunjungan`,
    headers: ['No', 'Nama Tamu', 'No. HP', 'Kunjungan', 'Jam', 'Keperluan', 'Unit', 'Catatan'],
    rows,
    colWidths: [24, 90, 82, 62, 38, 62, 42, 115],
    note: `Total kunjungan: ${guests.length}. Nomor HP tampil lengkap tanpa sensor (dokumen internal).`,
  });
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan-Buku-Tamu-${from || 'awal'}-${to || 'hari-ini'}.pdf"`,
    },
  });
}
