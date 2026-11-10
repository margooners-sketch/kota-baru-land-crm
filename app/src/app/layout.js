import { getSessionUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions';

export const metadata = { title: 'CRM Kota Baru Land — Taman Melati Bulan', description: 'Dashboard Marketing Property Kota Baru Land (TMB 2 & TMB 1)' };

export default async function RootLayout({ children }) {
  const user = await getSessionUser();
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <a className="brand" href="/dashboard">🏠 Kota Baru Land <span>· Taman Melati Bulan</span></a>
          {user && (
            <nav>
              <a href="/dashboard">Beranda</a>
              <a href="/units">Daftar Unit</a>
              <a href="/customers">Pelanggan</a>
              <a href="/flyering">Flyering</a>
              <a href="/guestbook">Buku Tamu</a>
              <a href="/reports">Laporan</a>
              <a href="/settings">Pengaturan</a>
              <span className="who">{user.name} ({user.role})</span>
              <form action={logoutAction} style={{ display: 'inline' }}><button className="btn small" type="submit">Keluar</button></form>
            </nav>
          )}
        </header>
        <main>{children}</main>
        <footer>CRM internal Kota Baru Land — syarat dan ketentuan berlaku, DP/plafon ditentukan bank.</footer>
        <style>{`
          *{box-sizing:border-box} body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4f6f2;color:#1c2b1e;line-height:1.5}
          a{color:#14663a;text-decoration:none} a:hover{text-decoration:underline}
          .topbar{background:#0d4d26;color:#fff;padding:10px 16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
          .brand{color:#fff;font-weight:700;font-size:18px} .brand span{font-weight:400;font-size:13px;opacity:.85}
          nav{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center} nav a{color:#d7f0dd;font-size:14px} nav a:hover{color:#fff}
          .who{color:#ffe9a8;font-size:13px}
          main{max-width:1080px;margin:0 auto;padding:18px 16px 40px}
          footer{text-align:center;color:#7a8a7d;font-size:12px;padding:18px}
          h1{font-size:22px;margin:4px 0 12px} h2{font-size:17px;margin:22px 0 8px} h3{font-size:15px;margin:16px 0 6px}
          .card{background:#fff;border:1px solid #dfe7de;border-radius:10px;padding:14px 16px;margin:10px 0}
          .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
          .stat{background:#fff;border:1px solid #dfe7de;border-radius:10px;padding:12px;text-align:center}
          .stat b{font-size:24px;display:block;color:#0d4d26} .stat span{font-size:12px;color:#5b6b5e}
          table{width:100%;border-collapse:collapse;font-size:14px;background:#fff}
          th,td{border-bottom:1px solid #e6ebe5;padding:7px 8px;text-align:left;vertical-align:top}
          th{background:#eef5ee;font-size:12px;text-transform:uppercase;letter-spacing:.03em}
          .btn{display:inline-block;background:#0d4d26;color:#fff;border:0;border-radius:7px;padding:8px 14px;font-size:14px;cursor:pointer}
          .btn:hover{background:#14663a;text-decoration:none} .btn.small{padding:5px 10px;font-size:13px}
          .btn.ghost{background:#fff;color:#0d4d26;border:1px solid #0d4d26}
          .btn.danger{background:#8f1d1d}
          .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:12px;background:#e8f2e9;color:#0d4d26}
          .badge.panas{background:#fde8e8;color:#8f1d1d} .badge.hangat{background:#fff3d6;color:#7a5b00} .badge.dingin{background:#e6eef7;color:#2b4a7a}
          .badge.promo{background:#fff3d6;color:#7a5b00} .badge.sold{background:#fde8e8;color:#8f1d1d}
          .badge.special{background:#8f1d1d;color:#fff;font-weight:700}
          .tabs{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px} .tabs a{border:1px solid #c8d2c6;border-radius:20px;padding:6px 14px;font-size:14px;background:#fff;color:#1c2b1e}
          .tabs a.on{background:#0d4d26;color:#fff;border-color:#0d4d26} .tabs a:hover{text-decoration:none}
          .badge.ready{background:#e8f2e9;color:#0d4d26} .badge.proses{background:#e6eef7;color:#2b4a7a}
          label{display:block;font-size:13px;color:#43513f;margin:8px 0 3px}
          input,select,textarea{width:100%;padding:8px 10px;border:1px solid #c8d2c6;border-radius:7px;font-size:14px;background:#fff}
          input[type=checkbox]{width:auto} .row{display:flex;gap:10px;flex-wrap:wrap} .row>div{flex:1;min-width:140px}
          .muted{color:#6b7a6d;font-size:13px} .err{background:#fde8e8;color:#8f1d1d;padding:10px;border-radius:8px;margin:10px 0}
          .ok{background:#e8f2e9;color:#0d4d26;padding:10px;border-radius:8px;margin:10px 0}
          .stages{display:flex;flex-wrap:wrap;gap:6px} .stage{border:1px solid #c8d2c6;border-radius:20px;padding:5px 10px;font-size:13px;background:#fff}
          .stage.on{background:#0d4d26;color:#fff;border-color:#0d4d26}
          .wa{background:#25d366;color:#fff;border-radius:7px;padding:7px 12px;display:inline-block;font-size:14px}
          .wa:hover{text-decoration:none;filter:brightness(.95)}
          pre{white-space:pre-wrap;background:#f4f6f2;border:1px solid #dfe7de;border-radius:8px;padding:10px;font-size:13px}
        `}</style>
      </body>
    </html>
  );
}
