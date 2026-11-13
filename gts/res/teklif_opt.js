/* Müşteri başına kârı en çoğaltan GTS teklifi – CIF Med ± prim ($/t) ve tahsilat vadesi (gün). PDM tools/db2026/gts_teklif_opt.py (paket 166) ile aynı kural.
   Girdi: 'Müşteri avantajı' yöntemiyle hesaplanmış model (hesap.js sonucu). Çıktı: { sec: [müşteri başına seçilen teklif], egri: { Sirket_ID: [[p, kâr, devir t, v, il]] } } */
function opt(X, sec = {}) {
  const TABAN = sec.taban !== false, VADE_TOL = sec.vadeTol != null ? sec.vadeTol : 1000;
  const OZ = X.sayfa('Ozet'), GI = X.sayfa('Girdiler'), GC = X.sayfa('Gecis'), DG = X.sayfa('Dagiticilar'), AD = X.sayfa('Antrepo Devri');
  const n = (v) => (typeof v === 'number' ? v : v == null || v === '' ? NaN : Number(v));
  const H = {}; for (const r of [9, 15, 45, 52, 54, 55, 57, 58, 64, 66, 88, 51]) H[r] = n(OZ[r] && OZ[r][7]);
  if (!OZ[56] || OZ[56][7] !== 'Müşteri avantajı') return null;
  const B47 = n(GI[47][1]), E4 = n(GC[4][4]), I4 = n(GC[4][8]), G3 = n(DG[3][6]);
  const VMAX = Math.trunc(H[9] - H[64]);
  const P_TABAN = (H[58] / I4 - H[54] - H[52]) / H[55], C_DEG = P_TABAN - H[57];
  const oran = (p) => (H[54] + H[52] + p * H[55]) * I4, dvd = (v) => (E4 + H[54]) * B47 * (v - H[88]) / 365 * I4;
  const adv = (bas) => { for (let i = 5; i <= 26; i++) { const r = AD[i]; if (r && typeof r[0] === 'string' && r[0].startsWith(bas)) return n(r[3]); } return NaN; };
  const TON2 = adv('Satılan'), OTV_T = -adv('ÖTV teminat') / TON2, MAL_T = -adv('Ürün maliyeti') / TON2, LAM = TON2 / G3;
  const G = []; for (let i = 6; i < GC.length; i++) { const r = GC[i]; if (!r || !r[0]) continue; G.push({ sid: r[1], il: r[2], pot: n(r[5]) || 0, gec0: n(r[15]) || 0, al: n(r[37]) || 0 }); }
  const D = []; for (let i = 6; i <= 35; i++) { const r = DG[i]; if (!r || !r[0]) continue; D.push({ row: i, ad: r[0], sid: r[1], c0: n(r[2]) || 0, d0: n(r[3]) || 0, e0: r[4], f0: n(r[5]) || 0, R: n(r[17]) || 0, v0: r[21] }); }
  const kk = D.find((d) => d.c0 > 0); if (!kk) return null; const K27 = kk.d0 / kk.c0, K28 = kk.f0 / kk.c0;
  const PG = []; for (let k = -80; k <= 80; k++) PG.push(Math.round(k * 25) / 100);
  const out = [], egri = {};
  for (const s of D) { const f = G.filter((g) => g.sid === s.sid), pot = f.reduce((a, g) => a + g.pot, 0); if (!f.length || pot <= 0) continue;
    const CAND = [], E = new Map();
    for (let v = 0; v <= VMAX; v++) { const pmax = f.map((g) => ((g.al + dvd(v) + 0.01) / I4 - H[54] - H[52]) / H[55]);
      let grid = [...new Set([...PG, ...pmax.map((x) => Math.floor(x * 100) / 100)])].sort((a, b) => a - b); if (TABAN) grid = grid.filter((p) => p >= P_TABAN - 1e-9);
      for (const p of grid) { let ton = 0, il = 0, av = 0; f.forEach((g, j) => { if (pmax[j] >= p) { ton += g.pot; il++; av += (g.al + dvd(v) - oran(p)) * g.pot; } });
        const C = s.R * ton / pot, satis = H[15] <= 0 || Math.max(C * K27, C * K28) >= H[15];
        const marj = p - C_DEG - OTV_T - MAL_T * B47 * (v - H[88]) / 365, kar = satis ? LAM * C * marj : 0;
        const rec = { p, v, gec: ton, il, satis, ton: satis ? LAM * C : 0, marj, kar, avt: ton > 0 ? av / ton + H[45] * I4 : null };
        CAND.push(rec); if (PG.includes(p)) { const o = E.get(p); if (!o || kar > o[1]) E.set(p, [p, kar, rec.ton, v, il]); } } }
    const kmax = Math.max(...CAND.map((r) => r.kar)), yakin = CAND.filter((r) => r.kar >= kmax - VADE_TOL).sort((a, b) => Math.abs(a.v - H[88]) - Math.abs(b.v - H[88]) || b.kar - a.kar || b.gec - a.gec);
    let best = yakin[0]; const p0 = s.v0 != null && s.v0 !== '' ? (n(s.v0) / I4 - H[54] - H[52]) / H[55] : null;
    const kar0 = s.e0 === 'Satış' && p0 != null && isFinite(p0) ? LAM * s.c0 * (p0 - C_DEG - OTV_T) : 0;
    if (best && best.kar <= 0) best = { ...best, p: null, gec: 0, il: 0, satis: false, ton: 0, kar: 0 };
    if (best) out.push({ row: s.row, sid: s.sid, ad: s.ad, p: best.p, v: best.v, ton: best.ton, kar: best.kar, il: best.il, gec: best.gec, avt: best.avt, p0, ton0: s.e0 === 'Satış' ? LAM * s.c0 : 0, kar0, pot });
    egri[s.sid] = [...E.values()].sort((a, b) => a[0] - b[0]).map((x) => x.map((y) => (typeof y === 'number' ? Math.round(y * 100) / 100 : y))); }
  return { sec: out, egri, param: { C_DEG, P_TABAN, OTV_T, MAL_T, LAM, VMAX } };
}
module.exports = { opt };
