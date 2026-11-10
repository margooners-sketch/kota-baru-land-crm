// Laporan PDF dibuat di SISI SERVER (pdf-lib) — tombol unduh/bagikan jalan di Chrome
// biasa, tanpa Web Share API / download client-side yang gagal di browser Muse.
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const MARGIN = 40;
const LINE = 15;

function header(page, font, bold, title, sub, width) {
  page.drawText('KOTA BARU LAND — TAMAN MELATI BULAN', { x: MARGIN, y: 800, size: 11, font: bold, color: rgb(0.05, 0.35, 0.15) });
  page.drawText(title, { x: MARGIN, y: 782, size: 15, font: bold });
  page.drawText(sub, { x: MARGIN, y: 766, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawLine({ start: { x: MARGIN, y: 756 }, end: { x: width - MARGIN, y: 756 }, thickness: 1, color: rgb(0.05, 0.35, 0.15) });
  return 736;
}
function footer(page, font, n, width) {
  page.drawText(`Halaman ${n} — Dokumen internal Kota Baru Land | Dicetak ${new Date().toLocaleString('id-ID')}`, { x: MARGIN, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  page.drawText('Syarat dan ketentuan berlaku, DP/plafon ditentukan bank.', { x: width - MARGIN - 250, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
}
function wrap(text, font, size, maxW) {
  const words = String(text ?? '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (font.widthOfTextAtSize(t, size) <= maxW) cur = t;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// rows: array array string; cols: lebar kolom (jumlah = lebar halaman - 2*margin)
export async function buildTablePdf({ title, subtitle, headers, rows, colWidths, note }) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89; // A4 portrait
  let page = doc.addPage([W, H]);
  let y = header(page, font, bold, title, subtitle, W);
  let n = 1;
  const drawHeaderRow = () => {
    let x = MARGIN;
    headers.forEach((h, i) => { page.drawText(h, { x: x + 2, y, size: 9, font: bold }); x += colWidths[i]; });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.7 });
    y -= LINE - 2;
  };
  drawHeaderRow();
  for (const row of rows) {
    const cells = row.map((c, i) => wrap(c, font, 9, colWidths[i] - 6));
    const h = Math.max(...cells.map((c) => c.length)) * 12;
    if (y - h < 60) {
      footer(page, font, n, W); n++;
      page = doc.addPage([W, H]);
      y = header(page, font, bold, title, subtitle + ' (lanjutan)', W);
      drawHeaderRow();
    }
    let x = MARGIN;
    cells.forEach((lines, i) => {
      lines.forEach((ln, j) => page.drawText(ln, { x: x + 2, y: y - j * 12, size: 9, font }));
      x += colWidths[i];
    });
    y -= h + 2;
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: W - MARGIN, y: y + 2 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) });
  }
  if (note) {
    y -= 10;
    wrap(note, font, 9, W - 2 * MARGIN).forEach((ln) => { page.drawText(ln, { x: MARGIN, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) }); y -= 12; });
  }
  footer(page, font, n, W);
  return await doc.save();
}
