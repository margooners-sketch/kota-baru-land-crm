// GET /api/documents/[id] — lihat/unduh soft file berkas pelanggan.
// File disimpan di database (customer_document_files). Login wajib.
import { requireUser } from '@/lib/auth';
import { get } from '@/lib/db';

export async function GET(req, { params }) {
  await requireUser();
  const { id } = await params;
  const doc = await get(
    'SELECT d.file_name, f.mime_type, f.file_size, f.file_data FROM customer_documents d LEFT JOIN customer_document_files f ON f.document_id = d.id WHERE d.id = ?',
    [id]
  );
  if (!doc || !doc.file_data) return new Response('File tidak ditemukan.', { status: 404 });
  const data = Buffer.from(doc.file_data);
  const safeName = String(doc.file_name || 'berkas').replace(/["\r\n]/g, '');
  return new Response(data, {
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${safeName}"`,
      'Content-Length': String(data.length),
    },
  });
}
