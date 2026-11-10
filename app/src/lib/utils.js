export function formatDateId(iso) {
  if (!iso) return '-';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function todayId() {
  return new Date().toISOString().slice(0, 10);
}
export function waDisplay(phone) {
  return String(phone || '').replace(/^62/, '0');
}
export function unitStatusLabel(status) {
  return { ready: 'Ready', proses: 'Proses', soldout: 'Sold Out' }[status] || 'Belum dibangun';
}
