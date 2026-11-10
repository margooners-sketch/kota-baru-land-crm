import { getSessionUser } from '@/lib/auth';
import { logoutAction } from '@/app/actions';

export const metadata = { title: 'CRM Kota Baru Land — Taman Melati Bulan', description: 'Dashboard Marketing Property Kota Baru Land (TMB 2 & TMB 1)' };

export default async function RootLayout({ children }) {
  const user = await getSessionUser();
  return (
    <html lang="id">
      <body>
        <header className="topbar">
          <a className="brand" href="/dashboard"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.5 10.5V20h13v-9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Kota Baru Land <span>Taman Melati Bulan</span></a>
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
          /* Hallmark · modern-minimal · CRM Kota Baru Land · tokens first, no emoji icons, no tracked caps */
          :root{
            --bg:#fafaf9; --surface:#ffffff; --ink:#1b1b18; --muted:#6f6f68; --faint:#9a9a92;
            --line:#e8e8e3; --line-strong:#d9d9d2;
            --green:#0e4d26; --green-ink:#0b3d1e; --green-soft:#eef5ef;
            --amber-bg:#fdf6e3; --amber-ink:#7a5b00;
            --red:#9b2222; --red-bg:#fdf0ef;
            --blue-bg:#eef3f8; --blue-ink:#2b4a7a;
            --radius:12px; --radius-sm:8px;
            --shadow:0 1px 2px rgba(16,24,16,.05);
            --font:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
          }
          *{box-sizing:border-box}
          html,body{overflow-x:clip}
          body{margin:0;font-family:var(--font);background:var(--bg);color:var(--ink);line-height:1.55;font-size:15px}
          a{color:var(--green);text-decoration:none} a:hover{text-decoration:underline}
          a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid var(--green);outline-offset:2px}
          .topbar{position:sticky;top:0;z-index:10;background:rgba(255,255,255,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);padding:12px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between}
          .brand{color:var(--ink);font-weight:650;font-size:17px;letter-spacing:-.01em} .brand:hover{text-decoration:none}
          .brand svg{vertical-align:-3px;margin-right:8px;color:var(--green)}
          .brand span{font-weight:400;font-size:13px;color:var(--muted);border-left:1px solid var(--line-strong);padding-left:10px;margin-left:10px}
          nav{display:flex;flex-wrap:wrap;gap:2px;align-items:center} nav a{color:var(--muted);font-size:14px;padding:6px 10px;border-radius:var(--radius-sm);transition:background-color .15s,color .15s} nav a:hover{color:var(--ink);background:#f0f0ec;text-decoration:none}
          .who{color:var(--muted);font-size:13px;padding:6px 8px}
          main{max-width:1120px;margin:0 auto;padding:28px 20px 48px}
          footer{text-align:center;color:var(--faint);font-size:12px;padding:20px;border-top:1px solid var(--line)}
          h1{font-size:24px;font-weight:650;letter-spacing:-.02em;margin:8px 0 16px} h2{font-size:17px;font-weight:650;letter-spacing:-.01em;margin:24px 0 10px} h3{font-size:15px;font-weight:650;margin:18px 0 8px}
          .card{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:18px 20px;margin:12px 0;box-shadow:var(--shadow)}
          .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
          .stat{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}
          .stat b{font-size:26px;font-weight:650;letter-spacing:-.02em;display:block;color:var(--ink)} .stat span{font-size:12.5px;color:var(--muted)}
          table{width:100%;border-collapse:collapse;font-size:14px;background:var(--surface)}
          th,td{padding:10px 12px;text-align:left;vertical-align:top}
          th{font-size:12px;font-weight:600;color:var(--muted);border-bottom:1px solid var(--line-strong)}
          td{border-bottom:1px solid var(--line)}
          tbody tr:hover{background:#fafaf9}
          .btn{display:inline-block;background:var(--green);color:#fff;border:0;border-radius:var(--radius-sm);padding:9px 16px;font-size:14px;font-weight:600;cursor:pointer;transition:background-color .15s,border-color .15s,box-shadow .15s}
          .btn:hover{background:var(--green-ink);text-decoration:none} .btn.small{padding:6px 11px;font-size:13px}
          .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line-strong)}
          .btn.ghost:hover{background:#f4f4f1}
          .btn.danger{background:var(--red)}
          .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--green-soft);color:var(--green)}
          .badge.panas{background:var(--red-bg);color:var(--red)} .badge.hangat{background:var(--amber-bg);color:var(--amber-ink)} .badge.dingin{background:var(--blue-bg);color:var(--blue-ink)}
          .badge.promo{background:var(--amber-bg);color:var(--amber-ink)} .badge.sold{background:var(--red-bg);color:var(--red)}
          .badge.special{background:var(--red);color:#fff;font-weight:700}
          .badge.ready{background:var(--green-soft);color:var(--green)} .badge.proses{background:var(--blue-bg);color:var(--blue-ink)}
          .tabs{display:flex;gap:20px;flex-wrap:wrap;margin:16px 0 4px;border-bottom:1px solid var(--line)}
          .tabs a{padding:8px 2px;font-size:14px;color:var(--muted);border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s,border-color .15s}
          .tabs a.on{color:var(--green);border-color:var(--green);font-weight:600} .tabs a:hover{text-decoration:none;color:var(--ink)}
          label{display:block;font-size:13px;font-weight:600;color:#55554e;margin:10px 0 4px}
          input,select,textarea{width:100%;padding:10px 12px;border:1px solid var(--line-strong);border-radius:var(--radius-sm);font-size:14px;background:#fff;font-family:var(--font);transition:border-color .15s,box-shadow .15s}
          input:focus,select:focus,textarea:focus{border-color:var(--green);outline:none;box-shadow:0 0 0 3px rgba(14,77,38,.12)}
          input[type=checkbox]{width:auto} .row{display:flex;gap:10px;flex-wrap:wrap} .row>div{flex:1;min-width:140px}
          .muted{color:var(--muted);font-size:13px} .err{background:var(--red-bg);color:var(--red);padding:10px 12px;border-radius:var(--radius-sm);margin:10px 0}
          .ok{background:var(--green-soft);color:var(--green);padding:10px 12px;border-radius:var(--radius-sm);margin:10px 0}
          .stages{display:flex;flex-wrap:wrap;gap:6px} .stage{border:1px solid var(--line-strong);border-radius:999px;padding:6px 12px;font-size:13px;background:#fff;transition:background-color .15s,color .15s,border-color .15s}
          .stage.on{background:var(--green);color:#fff;border-color:var(--green)}
          .wa{background:#25d366;color:#fff;border-radius:var(--radius-sm);padding:8px 14px;display:inline-block;font-size:14px;font-weight:600;transition:filter .15s}
          .wa:hover{text-decoration:none;filter:brightness(.95)}
          pre{white-space:pre-wrap;background:#f6f6f3;border:1px solid var(--line);border-radius:var(--radius-sm);padding:12px;font-size:13px}
          @media (prefers-reduced-motion: reduce){ *{transition:none !important} }
        `}</style>
      </body>
    </html>
  );
}
