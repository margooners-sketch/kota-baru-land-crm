import { requireUser } from '@/lib/auth';
import { all, get, getSetting, mapCustomer, mapUnit } from '@/lib/db';
import { leadScore, STAGE_LABELS, waLink, WA_TEMPLATES } from '@/lib/pricing';
import { formatDateId, unitStatusLabel } from '@/lib/utils';

export default async function DashboardPage() {
  const user = await requireUser();
  const today = new Date().toISOString().slice(0, 10);
  const units = (await all('SELECT * FROM units ORDER BY cluster, code')).map(mapUnit);
  const customers = (await all('SELECT * FROM customers ORDER BY follow_up_date ASC')).map(mapCustomer);
  const flyering = await all('SELECT * FROM flyering ORDER BY date DESC LIMIT 5');
  const target = Number((await getSetting('closingTarget', '4')) || 4);
  const closing = customers.filter((c) => c.stages.includes('akad')).length;
  const ready = units.filter((u) => u.status === 'ready').length;
  const proses = units.filter((u) => u.status === 'proses').length;
  const sold = units.filter((u) => u.status === 'soldout').length;
  const booked = units.filter((u) => u.bookedByCustomerId).length;
  const totalFlyers = (await get('SELECT COALESCE(SUM(flyers_given),0) AS s FROM flyering')).s;

  const due = customers.filter((c) => c.followUpDate && c.followUpDate <= today).sort((a, b) => (a.followUpDate < b.followUpDate ? -1 : 1));
  const upcoming = customers.filter((c) => c.followUpDate && c.followUpDate > today).slice(0, 5);
  const scored = customers.map((c) => ({ c, ...leadScore(c) })).sort((a, b) => b.score - a.score);
  const noReply = customers.filter((c) => c.followUpResult && /belum|tidak ada respon|belum dibalas/i.test(c.followUpResult));
  // Perlu Dicek — macet >7 hari: follow-up lewat lebih dari 7 hari, atau tanpa
  // jadwal follow-up tapi sudah dikontak lebih dari 7 hari lalu (belum Akad).
  const sevenAgo = new Date(); sevenAgo.setUTCDate(sevenAgo.getUTCDate() - 7);
  const sevenAgoStr = sevenAgo.toISOString().slice(0, 10);
  const stalled = customers.filter((c) => !c.stages.includes('akad') && (
    (c.followUpDate && c.followUpDate <= sevenAgoStr) ||
    (!c.followUpDate && c.contactDate && c.contactDate <= sevenAgoStr)
  )).sort((a, b) => ((a.followUpDate || a.contactDate) < (b.followUpDate || b.contactDate) ? -1 : 1));

  return (
    <div>
      <h1>Selamat pagi, {user.name} 👋</h1>
      <p className="muted">{formatDateId(today)} — Target closing bulan ini: {closing}/{target}</p>

      <div className="grid">
        <div className="stat"><b>{units.length}</b><span>Unit (TMB 2 + TMB 1)</span></div>
        <div className="stat"><b>{ready}</b><span>Ready</span></div>
        <div className="stat"><b>{proses}</b><span>Proses dibangun</span></div>
        <div className="stat"><b>{booked}</b><span>Dipesan (booking)</span></div>
        <div className="stat"><b>{sold}</b><span>Sold Out</span></div>
        <div className="stat"><b>{customers.length}</b><span>Pelanggan</span></div>
        <div className="stat"><b>{totalFlyers}</b><span>Brosur dibagikan</span></div>
        <div className="stat"><b>{closing}/{target}</b><span>Closing bulan ini</span></div>
      </div>

      <h2>☀️ Briefing Pagi — Follow-up jatuh tempo ({due.length})</h2>
      {due.length === 0 ? (
        <div className="card">Tidak ada follow-up jatuh tempo hari ini. 🎉</div>
      ) : (
        <div className="card"><table>
          <thead><tr><th>Pelanggan</th><th>Tahap</th><th>Jatuh tempo</th><th>Skor</th><th>WA</th></tr></thead>
          <tbody>{due.map((c) => {
            const s = leadScore(c);
            return <tr key={c.id}>
              <td><a href={'/customers/' + c.id}>{c.name}</a><br /><span className="muted">{c.phone}</span></td>
              <td>{c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru'}</td>
              <td>{formatDateId(c.followUpDate)}{c.followUpDate < today ? ' (lewat)' : ' (hari ini)'}</td>
              <td><span className={'badge ' + s.label.toLowerCase()}>{s.label} {s.score}</span></td>
              <td><a className="wa" href={waLink(c.phone, WA_TEMPLATES.followup(c))} target="_blank" rel="noreferrer">WA Bisnis</a></td>
            </tr>;
          })}</tbody>
        </table></div>
      )}

      <h2>⚠️ Perlu Dicek — macet &gt;7 hari ({stalled.length})</h2>
      {stalled.length === 0 ? (
        <div className="card">Tidak ada pelanggan yang macet. 🎉</div>
      ) : (
        <div className="card"><table>
          <thead><tr><th>Pelanggan</th><th>Tahap</th><th>Terakhir</th><th>Skor</th><th>WA</th></tr></thead>
          <tbody>{stalled.map((c) => {
            const s = leadScore(c);
            return <tr key={c.id}>
              <td><a href={'/customers/' + c.id}>{c.name}</a><br /><span className="muted">{c.phone}</span></td>
              <td>{c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru'}</td>
              <td>{c.followUpDate ? 'Follow-up ' + formatDateId(c.followUpDate) : 'Kontak ' + formatDateId(c.contactDate)}</td>
              <td><span className={'badge ' + s.label.toLowerCase()}>{s.label} {s.score}</span></td>
              <td><a className="wa" href={waLink(c.phone, WA_TEMPLATES.followup(c))} target="_blank" rel="noreferrer">WA Bisnis</a></td>
            </tr>;
          })}</tbody>
        </table></div>
      )}

      <div className="row">
        <div className="card" style={{ flex: 1 }}>
          <h3>🔥 Leads terpanas</h3>
          {scored.slice(0, 5).map(({ c, score, label }) => (
            <p key={c.id}><a href={'/customers/' + c.id}>{c.name}</a> — <span className={'badge ' + label.toLowerCase()}>{label} {score}</span> <span className="muted">{c.stages.length ? STAGE_LABELS[c.stages[c.stages.length - 1]] : 'Baru'}</span></p>
          ))}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3>📅 Follow-up berikutnya</h3>
          {upcoming.length === 0 ? <p className="muted">Belum ada jadwal.</p> : upcoming.map((c) => (
            <p key={c.id}><a href={'/customers/' + c.id}>{c.name}</a> — {formatDateId(c.followUpDate)}</p>
          ))}
          <h3>🔕 Belum dibalas ({noReply.length})</h3>
          {noReply.slice(0, 5).map((c) => (
            <p key={c.id}><a href={'/customers/' + c.id}>{c.name}</a> <span className="muted">— {c.followUpResult}</span></p>
          ))}
        </div>
      </div>

      <h2>📣 Flyering terakhir</h2>
      <div className="card"><table>
        <thead><tr><th>Tanggal</th><th>Spot</th><th>Brosur</th><th>Jam</th><th>Tanya kontak</th></tr></thead>
        <tbody>{flyering.map((f) => (
          <tr key={f.id}><td>{formatDateId(f.date)}</td><td>{f.spot}</td><td>{f.flyersGiven}</td><td>{f.hours}</td><td>{f.askedContact}</td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
