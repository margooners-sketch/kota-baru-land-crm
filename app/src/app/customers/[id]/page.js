import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { get, all, mapCustomer, mapUnit } from '@/lib/db';
import { updateCustomer, updateStages, cancelBooking, setChecklistItem, addDocument, deleteDocument, deleteCustomer } from '@/app/actions';
import { STAGES, STAGE_LABELS, calcPrice, priceScheme, greeting, waLink, WA_TEMPLATES, OBJECTION_TEMPLATES, CHECKLIST_GROUPS, leadScore, rupiah } from '@/lib/pricing';
import { formatDateId, waDisplay, todayId } from '@/lib/utils';
import AcuanBrosur from '@/app/acuan-brosur';

const CHECKLIST_STATES = [
  { key: 'belum', label: 'Belum', next: 'soft' },
  { key: 'soft', label: '✓ Soft File', next: 'hard' },
  { key: 'hard', label: 'Hardfile', next: 'belum' },
];

const TABS = [
  { key: 'pipeline', label: 'Pipeline & WA' },
  { key: 'berkas', label: 'Berkas' },
  { key: 'acuan', label: 'Acuan Brosur & NOTE' },
];

export default async function CustomerDetailPage({ params, searchParams }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp?.tab || 'pipeline';
  const c = mapCustomer(await get('SELECT * FROM customers WHERE id = ?', [id]));
  if (!c) notFound();
  const units = (await all('SELECT * FROM units ORDER BY cluster, code')).map(mapUnit);
  const bookedUnit = units.find((u) => u.bookedByCustomerId === c.id) || null;
  const s = leadScore(c);

  // Kalkulator harga (via query param, tanpa JS)
  const calcUnitId = sp?.unit ? Number(sp.unit) : (bookedUnit?.id || null);
  const calcUnit = units.find((u) => u.id === calcUnitId) || null;
  const calcCert = sp?.cert || c.certificateChoice || null;
  const calcExcess = Number(sp?.excess || 0);
  const calc = calcUnit ? calcPrice(calcUnit, { certificate: calcCert, excessM2: calcExcess }) : null;

  const stageAction = updateStages.bind(null, c.id);
  const cancelAction = cancelBooking.bind(null, c.id);
  const saveAction = updateCustomer.bind(null, c.id);
  const addDocAction = addDocument.bind(null, c.id);
  const deleteAction = deleteCustomer.bind(null, c.id);
  const docs = await all('SELECT d.*, (CASE WHEN f.document_id IS NOT NULL THEN 1 ELSE 0 END) AS has_file FROM customer_documents d LEFT JOIN customer_document_files f ON f.document_id = d.id WHERE d.customer_id = ? ORDER BY d.received_at DESC, d.id DESC', [c.id]);

  return (
    <div>
      <p><a href="/customers">← Daftar Pelanggan</a></p>
      {sp?.err && <div className="err">{sp.err}</div>}
      {sp?.msg && <div className="ok">{sp.msg}</div>}
      <h1>{c.name} <span className={'badge ' + s.label.toLowerCase()}>{`${s.label} ${s.score}`}</span></h1>
      <p className="muted">HP {waDisplay(c.phone)} · Kontak {formatDateId(c.contactDate)} · Sumber: {c.sourceSpot || '—'} · {c.gender === 'laki_laki' ? 'Laki-laki' : c.gender === 'perempuan' ? 'Perempuan' : 'Jenis kelamin belum diisi'}</p>

      <div className="tabs">
        {TABS.map((t) => (
          <a key={t.key} href={'/customers/' + c.id + '?tab=' + t.key} className={tab === t.key ? 'on' : ''}>{t.label}</a>
        ))}
      </div>

      {tab === 'pipeline' && (
        <>
          <div className="row">
            <div className="card" style={{ flex: 2 }}>
              <h2>Pipeline 10 Tahap</h2>
              <form action={stageAction}>
                <div className="stages">
                  {STAGES.map((st) => (
                    <label key={st.key} className={'stage' + (c.stages.includes(st.key) ? ' on' : '')}>
                      <input type="checkbox" name={'stage_' + st.key} defaultChecked={c.stages.includes(st.key)} /> {st.label}
                    </label>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <div><label>Unit untuk Booking</label>
                    <select name="unit_id" defaultValue={bookedUnit?.id || ''}>
                      <option value="">— pilih unit —</option>
                      {units.filter((u) => !u.bookedByCustomerId || u.bookedByCustomerId === c.id).filter((u) => u.status !== 'soldout').map((u) => (
                        <option key={u.id} value={u.id}>{u.code} — {u.cluster} {u.type} ({u.status || 'Belum dibangun'}){(u.code === 'H05' || u.code === 'H07') ? ' · PROMO KHUSUS 2jt All in' : u.isPromo ? ' · Promo' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div><label>Sertifikat</label>
                    <select name="certificate_choice" defaultValue={c.certificateChoice || ''}>
                      <option value="">—</option><option value="shgb">Tetap SHGB</option><option value="shm">Naik SHM (+Rp3.500.000)</option>
                    </select>
                  </div>
                </div>
                <p className="muted">Aturan urutan: Booking wajib sudah Minat, Survei, dan Lolos BI Checking. Akad wajib sudah Berkas, Bank/KPR, SP3K, dan kekurangan bayar lunas. Serah Terima dan Naik SHM wajib Akad dulu. Bila Booking disimpan, DP &amp; berkas jatuh tempo terisi otomatis = tanggal booking + 14 hari (bila masih kosong). Berkas bersifat opsional, tidak mengunci.</p>
                <button className="btn" type="submit">Simpan Tahap</button>
                {bookedUnit && user.role === 'owner' && (
                  <span style={{ marginLeft: 10 }}><button className="btn danger" type="submit" formAction={cancelAction}>Batalkan Booking/Closing (Owner)</button></span>
                )}
              </form>
              {bookedUnit && <p style={{ marginTop: 10 }}>Unit dipesan: <b>{bookedUnit.code}</b> ({bookedUnit.cluster}) — {priceScheme(bookedUnit)?.label}</p>}
            </div>

            <div className="card" style={{ flex: 1 }}>
              <h2>Template WA (WA Bisnis)</h2>
              <p className="muted">Nada ramah, maks ~3 baris inti, tutup 1 pilihan konkret.</p>
              {Object.entries(WA_TEMPLATES).map(([k, fn]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <b>{STAGE_LABELS[k === 'followup' ? 'minat' : k] || k}</b>
                  <pre>{fn(c)}</pre>
                  <a className="wa" href={waLink(c.phone, fn(c))} target="_blank" rel="noreferrer">Kirim via WA Bisnis</a>
                </div>
              ))}
              <h3>Keberatan umum</h3>
              {Object.entries(OBJECTION_TEMPLATES).map(([k, fn]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <b>{k}</b><pre>{fn(c)}</pre>
                  <a className="wa" href={waLink(c.phone, fn(c))} target="_blank" rel="noreferrer">Kirim via WA Bisnis</a>
                </div>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="card" style={{ flex: 1 }}>
              <h2>Kalkulator Harga</h2>
              <form method="get">
                <input type="hidden" name="tab" value="pipeline" />
                <label>Unit</label>
                <select name="unit" defaultValue={calcUnitId || ''}>{units.map((u) => <option key={u.id} value={u.id}>{u.code} — {u.cluster} {u.type}{u.isPromo ? ' · Promo' : ''}</option>)}</select>
                <label>Sertifikat</label>
                <select name="cert" defaultValue={calcCert || ''}><option value="">Tetap SHGB</option><option value="shm">Naik SHM (+Rp3.500.000)</option></select>
                <label>Kelebihan tanah (m²) — TMB 2 Rp2.000.000/m², di luar all in</label>
                <input name="excess" type="number" min="0" defaultValue={calcExcess} />
                <div style={{ marginTop: 10 }}><button className="btn" type="submit">Hitung</button></div>
              </form>
              {calc && (
                <div style={{ marginTop: 12 }}>
                  <p><b>{calc.label}</b></p>
                  <p className="muted">{calc.note}</p>
                  <table><tbody>
                    <tr><td>Total Bayar Konsumen</td><td><b>{rupiah(calc.totalBayar)}</b></td></tr>
                    <tr><td>Booking Fee</td><td>{rupiah(calc.bookingFee)}</td></tr>
                    <tr><td>Kekurangan bayar</td><td>{rupiah(calc.kekurangan)}</td></tr>
                    {calc.hook ? <tr><td>Hook (di luar all in)</td><td>{rupiah(calc.hook)}</td></tr> : null}
                    {calc.kelebihanTanah ? <tr><td>Kelebihan tanah</td><td>{rupiah(calc.kelebihanTanah)}</td></tr> : null}
                    {calc.shmFee ? <tr><td>Naik SHM</td><td>{rupiah(calc.shmFee)}</td></tr> : null}
                  </tbody></table>
                  <p className="muted">Syarat dan ketentuan berlaku, DP/plafon ditentukan bank.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'berkas' && (
        <>
          <div className="row">
            <div className="card" style={{ flex: 1 }}>
              <h2>Checklist Berkas (opsional)</h2>
              <p className="muted">Berkas tidak mengunci tahap Berkas maupun Closing. Klik status untuk mengganti: Belum → Soft File → Hardfile → Belum. Lampirkan file untuk menandai Soft File sekaligus.</p>
              {CHECKLIST_GROUPS.map((g) => (
                <div key={g.key}>
                  <h3>{g.label}</h3>
                  {g.items.map((item) => {
                    const key = g.key + ':' + item;
                    const state = c.checklist[key] || 'belum';
                    const cur = CHECKLIST_STATES.find((s) => s.key === state);
                    return (
                      <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0' }}>
                        <form action={async () => { 'use server'; await setChecklistItem(c.id, key, cur.next); }} style={{ flex: 1 }}>
                          <button type="submit" title={'Status: ' + cur.label + ' — klik untuk ubah'} style={{ background: state === 'belum' ? '#fff' : state === 'soft' ? '#eef5ef' : '#fdf6e3', border: '1px solid #c8d2c6', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                            <b>[{cur.label}]</b> {item}
                          </button>
                        </form>
                        <form action={addDocAction} style={{ flexShrink: 0 }}>
                          <input type="hidden" name="kind" value={key} />
                          <input type="hidden" name="doc_type" value="soft" />
                          <input type="file" name="file" accept="application/pdf,image/*" required style={{ width: 180, padding: '4px 6px' }} />
                          <button className="btn small ghost" type="submit" style={{ marginLeft: 4 }}>Lampirkan</button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="row">
            <div className="card" style={{ flex: 1 }}>
              <h2>Tambah Berkas</h2>
              <form action={addDocAction}>
                <div className="row">
                  <div><label>Jenis berkas *</label>
                    <input name="kind" list="checklist-kinds" required placeholder="pilih dari daftar atau ketik sendiri" />
                    <datalist id="checklist-kinds">
                      {CHECKLIST_GROUPS.map((g) => g.items.map((item) => (
                        <option key={g.key + ':' + item} value={g.key + ':' + item}>{g.label} — {item}</option>
                      )))}
                    </datalist>
                  </div>
                  <div><label>Tipe</label>
                    <select name="doc_type"><option value="soft">Soft File (unggah)</option><option value="hard">Hardfile (fisik)</option></select>
                  </div>
                  <div><label>Tanggal terima</label><input name="received_at" type="date" defaultValue={todayId()} /></div>
                </div>
                <div className="row">
                  <div><label>File (PDF/gambar, maks 10 MB — wajib bila Soft File)</label><input type="file" name="file" accept="application/pdf,image/*" /></div>
                  <div><label>Catatan</label><input name="notes" placeholder="mis. diterima di kantor" /></div>
                </div>
                <p className="muted">Bila jenis berkas cocok dengan item checklist di atas, item itu sekaligus ditandai diterima.</p>
                <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Berkas</button></div>
              </form>
            </div>
          </div>

          <div className="card">
            <h2>Daftar Berkas ({docs.length})</h2>
            {docs.length === 0 ? <p className="muted">Belum ada berkas tercatat.</p> : (
              <table><thead><tr><th>Jenis</th><th>Nama file</th><th>Diterima</th><th>Tipe</th><th>Catatan</th><th></th></tr></thead>
              <tbody>{docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.kind}</td><td>{d.file_name || '—'}</td><td>{formatDateId(d.received_at)}</td>
                  <td>{d.hardfile ? 'Hardfile' : 'Soft File'}</td><td className="muted">{d.notes || '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {d.has_file ? <a href={'/api/documents/' + d.id} target="_blank" rel="noreferrer">Lihat</a> : <span className="muted">—</span>}
                    {' '}
                    <form action={async () => { 'use server'; await deleteDocument(d.id, c.id); }} style={{ display: 'inline' }}>
                      <button className="btn small ghost" type="submit">Hapus</button>
                    </form>
                  </td>
                </tr>
              ))}</tbody></table>
            )}
          </div>
        </>
      )}

      {tab === 'acuan' && <AcuanBrosur />}

      <div className="card">
        <h2>Data &amp; Follow-up</h2>
        <form action={saveAction}>
          <div className="row">
            <div><label>Nama</label><input name="name" defaultValue={c.name} /></div>
            <div><label>No. HP</label><input name="phone" defaultValue={waDisplay(c.phone)} /></div>
            <div><label>Jenis kelamin</label><select name="gender" defaultValue={c.gender || ''}><option value="">—</option><option value="laki_laki">Laki-laki</option><option value="perempuan">Perempuan</option></select></div>
          </div>
          <div className="row">
            <div><label>Tanggal kontak</label><input name="contact_date" type="date" defaultValue={c.contactDate || ''} /></div>
            <div><label>Follow-up berikutnya</label><input name="follow_up_date" type="date" defaultValue={c.followUpDate || ''} /></div>
            <div><label>Follow-up aktual</label><input name="follow_up_actual_date" type="date" defaultValue={c.followUpActualDate || ''} /></div>
          </div>
          <div className="row">
            <div><label>Tanggal booking</label><input name="booking_date" type="date" defaultValue={c.bookingDate || ''} /></div>
            <div><label>DP jatuh tempo</label><input name="dp_due_date" type="date" defaultValue={c.dpDueDate || ''} /></div>
            <div><label>Berkas jatuh tempo</label><input name="berkas_due_date" type="date" defaultValue={c.berkasDueDate || ''} /></div>
          </div>
          <div className="row">
            <div>
              <label><input type="checkbox" name="procedure_signed" value="1" defaultChecked={c.procedureSigned} /> Prosedur pembelian ditandatangani</label>
              <input type="hidden" name="procedure_signed" value="" />
              {c.procedureSignedDate && <span className="muted"> — {formatDateId(c.procedureSignedDate)}</span>}
            </div>
            <div>
              <label><input type="checkbox" name="shortfall_paid" value="1" defaultChecked={c.shortfallPaid} /> Kekurangan bayar lunas</label>
              <input type="hidden" name="shortfall_paid" value="" />
              {c.shortfallPaidDate && <span className="muted"> — {formatDateId(c.shortfallPaidDate)}</span>}
              <p className="muted">Wajib dicentang sebelum tahap Akad bisa disimpan.</p>
            </div>
          </div>
          <label>Hasil follow-up terakhir</label>
          <input name="follow_up_result" defaultValue={c.followUpResult || ''} placeholder="mis. Belum ada respon lebih lanjut" />
          <label>Catatan</label>
          <textarea name="notes" rows={3} defaultValue={c.notes || ''} />
          <div style={{ marginTop: 10 }}><button className="btn" type="submit">Simpan Data</button></div>
        </form>
      </div>

      {user.role === 'owner' && (
        <div className="card" style={{ borderColor: '#c0392b' }}>
          <h2 style={{ color: '#8f1d1d' }}>Hapus Pelanggan</h2>
          <p className="muted">Menghapus pelanggan ini secara permanen, termasuk berkasnya. Unit yang dipegang dilepas ke status semula. Entri buku tamu yang tertaut tetap ada di Buku Tamu.</p>
          <form action={deleteAction}>
            <label><input type="checkbox" required /> Saya paham pelanggan ini akan dihapus permanen.</label>
            <div style={{ marginTop: 10 }}><button className="btn danger" type="submit">Hapus Pelanggan</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
