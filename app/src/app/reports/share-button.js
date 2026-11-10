// Tombol "Bagikan PDF" — pakai Web Share API (Chrome Android), fallback unduh biasa.
// 'use client' karena butuh navigator.share + fetch dari browser.
'use client';
import { useState } from 'react';

export default function ShareButton({ href, filename, label }) {
  const [busy, setBusy] = useState(false);
  async function share() {
    setBusy(true);
    try {
      const res = await fetch(href);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      // Dibatalkan pengguna atau gagal — diam saja, tidak ada data yang berubah.
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="btn ghost" type="button" onClick={share} disabled={busy}>
      {busy ? 'Menyiapkan…' : (label || 'Bagikan PDF')}
    </button>
  );
}
