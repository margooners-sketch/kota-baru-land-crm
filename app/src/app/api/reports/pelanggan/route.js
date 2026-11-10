// GET /api/reports/pelanggan?from=YYYY-MM-DD&to=YYYY-MM-DD
// PDF dibuat di SISI SERVER (pdf-lib) — unduh langsung, tanpa Web Share API.
import { requireUser } from '@/lib/auth';
import { all, mapCustomer } from '@/lib/db';
import { buildTablePdf } from '@/lib/pdf';
import { STAGE_LABELS } from '@/lib/pricing';
import { formatDateId } from '@/lib/utils';

export async function GET(req) {
  await requireUser();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  let customers = (await all('SELECT * FROM customers ORDER BY contact_date ASC, id ASC')).map(mapCustomer);
  if (from) customers = customers.filter((c) => (c.contactDate || '') >= from);
  if (to) customers = customers.filter((c) => (c.contactDate || '') <= to);
  const period = from || to ? `Periode ${from || 'awal'} s/d ${to || 'hari ini'}` : 'Seluruh periode (sejak awal kerja)';
  const rows = customers.map((c, i) => [
    String(i + 1), c.name, c.phone,
    c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru',
    c.contactDate ? formatDateId(c.contactDate) : '-',
    c.followUpDate ? formatDateId(c.followUpDate) : '-',
    c.sourceSpot || '-',
  ]);
  const bytes = await buildTablePdf({
    title: 'Laporan Daftar Pelanggan',
    subtitle: `Kota Baru Land — Taman Melati Bulan · ${period} · Total ${customers.length} pelanggan`,
    headers: ['No', 'Nama', 'No. HP', 'Tahap', 'Kontak', 'Follow-up', 'Sumber'],
    rows,
    colWidths: [28, 110, 88, 80, 62, 62, 85],
    note: `Total pelanggan: ${customers.length}. Nomor HP tampil lengkap tanpa sensor (dokumen internal).`,
  });
  return new Response(bytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Laporan-Daftar-Pelanggan-${from || 'awal'}-${to || 'hari-ini'}.pdf"`,
    },
  });
}
