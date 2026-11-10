// GET /api/reports/flyering?from=YYYY-MM-DD&to=YYYY-MM-DD — PDF sisi server.
import { requireUser } from '@/lib/auth';
import { all, mapFlyering } from '@/lib/db';
import { buildTablePdf } from '@/lib/pdf';
import { formatDateId } from '@/lib/utils';

export async function GET(req) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  let logs = (await all('SELECT * FROM flyering ORDER BY date ASC, id ASC')).map(mapFlyering);
  if (from) logs = logs.filter((f) => f.date >= from);
  if (to) logs = logs.filter((f) => f.date <= to);
  const period = from || to ? `Periode ${from || 'awal'} s/d ${to || 'hari ini'}` : 'Seluruh periode (sejak awal kerja)';
  const totalFlyers = logs.reduce((a, f) => a + f.flyersGiven, 0);
  const rows = logs.map((f, i) => [
    String(i + 1), formatDateId(f.date), f.spot, String(f.flyersGiven),
    String(f.hours), String(f.askedContact), String(f.customersRecorded), f.notes || '-',
  ]);
  const bytes = await buildTablePdf({
    title: 'Laporan Flyering',
    subtitle: `Kota Baru Land — Taman Melati Bulan · ${period} · Total ${totalFlyers} brosur`,
    headers: ['No', 'Tanggal', 'Spot', 'Brosur', 'Jam', 'Tanya Kontak', 'Pelanggan', 'Catatan'],
    rows,
    colWidths: [24, 62, 110, 42, 34, 62, 52, 129],
    note: `Total kegiatan: ${logs.length} · Total brosur dibagikan: ${totalFlyers}.`,
  });
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan-Flyering-${from || 'awal'}-${to || 'hari-ini'}.pdf"`,
    },
  });
}
