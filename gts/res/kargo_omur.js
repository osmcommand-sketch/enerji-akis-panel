/* Kargo yaşam döngüsü (kullanıcı 03.11.2026 16:50: "kargolar sayfası; kargo filtrelenince tüm yaşam döngüsü: NOR, COD, antrepo beyannamesi
   tarihi ve miktarı, ithalat beyannameleri, günlük satış miktarları").
   Kaynak model sayfaları: <Ürün>_Kargolar (kargo satırları), <Ürün>_Gunluk (günlük satış, ithalat beyannamesi, beyanname kargosu, kambiyo),
   Fiyatlar (USD/TRY). Hem masaüstü hattı (X.sayfa) hem web derlemesi (web_hesap.js) kullanır.
   Çıktı: { urun: { k: [[...kargo]], g0: 'YYYY-MM-DD', sat: [t/gün], bey: [[gün, t, kargo, kambiyo TL, beyanname kuru, ödeme kuru]],
                    hg: { kargo no: { oran, t, kilit, kap, brut, isl, tem, net, baz, ac: [[gün, t, ICE, CIF]], kp: [[gün, t, ICE, CIF]] } } } }
   Kargo satırı: [no, gemi, ton, B/L t, fiyatlama, NOR/varış, antrepo beyannamesi (tahliye başlangıcı), COD (tahliye bitişi), ödeme, satışa hazır,
                  ilk satış, tükenme, yaşam gün, ort. stok gün, CIF $/t, alış $/t, değer $, brüt marj $/t, brüt marj $, net marj $, ÖTV teminatı TL,
                  kümülatif alım önce t, kümülatif alım sonra t, varış kuru,
                  satış $/t (tahsilat kuruyla), dönemde satılan t, finansman $, ürün hedge net $, kur hedge etkisi $, tahsilat kur kaybı $] */
(function (kok) {
  const iso = (d) => (typeof d === 'number' ? new Date(Date.UTC(1899, 11, 30) + Math.round(d) * 864e5).toISOString().slice(0, 10) : null);
  const r2 = (v, n = 0) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 10 ** n) / 10 ** n : null);
  function omur(sayfa) {
    const bas = (R, re) => (R && R[4] ? R[4].findIndex((h) => typeof h === 'string' && re.test(h)) : -1);
    const G = sayfa('Girdiler') || [], gi = (re) => G.findIndex((r) => r && typeof r[0] === 'string' && re.test(r[0]));
    const yi = gi(/^Yoğunluk \(t\/m³\)/), yog = { Motorin: 0.845, Benzin: 0.745 };
    if (yi > 0) for (let i = yi + 1; i < yi + 4; i++) { const r = G[i]; if (r && (r[0] === 'Motorin' || r[0] === 'Benzin') && typeof r[1] === 'number') yog[r[0]] = r[1]; }
    const ov = gi(/^Alım ödeme vadesi: COD \+ gün/), odv = ov > 0 && typeof G[ov][1] === 'number' ? G[ov][1] : 0;
    const F = sayfa('Fiyatlar'), kur = new Map(); if (F) { const fT = bas(F, /^Tarih/) >= 0 ? bas(F, /^Tarih/) : 0; for (const r of F) if (r && typeof r[fT] === 'number' && typeof r[3] === 'number') kur.set(Math.floor(r[fT]), r[3]); }
    const K = (d) => { for (let x = Math.floor(d); x > Math.floor(d) - 10; x--) if (kur.has(x)) return kur.get(x); return null; };
    const out = {};
    for (const u of ['Motorin', 'Benzin']) {
      const KG = sayfa(u + '_Kargolar'), GN = sayfa(u + '_Gunluk'); if (!KG || !GN) continue;
      const c = (re) => bas(KG, re), g = (re) => bas(GN, re);
      const ix = { no: c(/^Kargo no/), var: c(/^Var mı/), gemi: c(/^Gemi sınıfı/), ton: c(/^Ton$/), vr: c(/^Varış$/), fy: c(/^Fiyatlama (günü|başlangıcı)/), fyb: c(/^Fiyatlama bitişi/), cif: c(/^CIF Med/), al: c(/^Alış maliyeti/), dg: c(/^Değer \(USD\)/),
        L: c(/^Kümülatif alım önce/), M: c(/^Kümülatif alım sonra/), ilk: c(/^İlk satış/), son: c(/^Tükenme/), yas: c(/^Yaşam süresi/), stk: c(/^Ort\. stokta kalma/), bmt: c(/^Brüt marj \(USD\/t\)/),
        bm: c(/^Brüt marj \(USD\)$/), nm: c(/^Net marj \(USD\)$/), kv: c(/^Kur – varış/), hz: c(/^Satışa hazır/), ab: c(/^Tahliye başlangıcı/), cod: c(/^Tahliye bitişi/), bl: c(/^B\/L miktarı/), otv: c(/^ÖTV teminatı – antrepo/),
        sus: c(/^Satış – Tüpraş ort\. \(USD\/t\)/), at: c(/^Dönem içinde satılan/), fin: c(/^Finansman – tedarikçi/), hn: c(/^Ürün hedge net/), kh: c(/^Kur hedge etkisi/), tk: c(/^Tahsilat kur kaybı/), bz: c(/^Baz etkisi/), sm3: c(/^Satış \(m³, FIFO/), gtl: c(/^Satış geliri \(TL\)/), stl: c(/^SMM \(TL\)/), btl: c(/^Brüt kâr \(TL\)/), bus: c(/^Brüt kâr \(USD/), yg: c(/^Gerçek yoğunluk/) };
      const v = (r, k) => (ix[k] >= 0 ? r[ix[k]] : null);
      const k = []; for (let i = 5; i < KG.length; i++) { const r = KG[i]; if (!r || typeof v(r, 'no') !== 'number' || (ix.var >= 0 && !v(r, 'var'))) continue; if (!(v(r, 'M') > v(r, 'L'))) continue;
        const cod = v(r, 'cod');
        k.push([v(r, 'no'), v(r, 'gemi'), r2(v(r, 'ton')), r2(v(r, 'bl')), iso(v(r, 'fy')), iso(v(r, 'vr')), iso(v(r, 'ab')), iso(cod), typeof cod === 'number' ? iso(cod + odv) : null, iso(v(r, 'hz')),
          iso(v(r, 'ilk')), iso(v(r, 'son')), r2(v(r, 'yas')), r2(v(r, 'stk'), 1), r2(v(r, 'cif'), 1), r2(v(r, 'al'), 1), r2(v(r, 'dg')), r2(v(r, 'bmt'), 1), r2(v(r, 'bm')), r2(v(r, 'nm')), r2(v(r, 'otv')),
          r2(v(r, 'L'), 1), r2(v(r, 'M'), 1), r2(v(r, 'kv'), 3), r2(v(r, 'sus'), 2), r2(v(r, 'at'), 1), r2(v(r, 'fin')), r2(v(r, 'hn')), r2(v(r, 'kh')), r2(v(r, 'tk')), ix.bz >= 0 ? r2(v(r, 'bz')) : null, ix.fyb >= 0 ? iso(v(r, 'fyb')) : null,
          // paket 85 (kullanıcı hesap şablonu): 32 satış m³, 33 gelir TL, 34 SMM TL, 35 brüt TL, 36 brüt $, 37 gerçek yoğunluk
          ...(ix.btl >= 0 ? [r2(v(r, 'sm3'), 1), r2(v(r, 'gtl')), r2(v(r, 'stl')), r2(v(r, 'btl')), r2(v(r, 'bus')), v(r, 'yg')] : [])]); }
      if (!k.length) continue;
      const gT = g(/^Tarih/), gS = g(/^Günlük satış \(t\)/), gB = g(/^İthalat beyannamesi/), gC = g(/^Beyanname kargosu/), gF = g(/^Ödeme günü kuru/), gK = g(/^Yasal defter kambiyo/), gH = g(/^Kur hedge sonucu \(TL/);
      const rows = GN.slice(5).filter((r) => r && typeof r[gT] === 'number'); if (!rows.length) continue;
      const d0 = rows[0][gT], sat = [], bey = [];
      for (const r of rows) { const i = Math.round(r[gT] - d0); sat[i] = r2(r[gS] || 0, 1);
        if (r[gB] > 0) { const t = r[gB] * yog[u]; bey.push([i, r2(t, 1), gC >= 0 ? r[gC] : null, gK >= 0 ? r2(r[gK] || 0) : null, r2(K(r[gT]), 4), gF >= 0 ? r2(r[gF], 4) : null, gH >= 0 ? r2(r[gH] || 0) : null]); } }
      for (let i = 0; i < sat.length; i++) if (sat[i] == null) sat[i] = 0;
      /* beyanname FIFO ofseti: dönem başında zaten beyan edilmiş (milli tank) açılış stoğu = ilk satırın kümülatif beyannamesi − o günkü beyanname */
      const gAB = g(/^Kümülatif ithalat beyannamesi/); let by0 = null; if (gAB >= 0 && typeof rows[0][gAB] === 'number') by0 = r2(rows[0][gAB] - (rows[0][gB] > 0 ? rows[0][gB] * yog[u] : 0), 1);
      /* ürün hedge işlemleri (kullanıcı 12.11.2026 10:14 "hangi tarihte ne kadar pozisyon açılıyor ve kapanıyor"): modelde pozisyon = oran × ton;
         kilit fiyatı fiyatlama günlerinin (iş günü, tatil hariç) eşit ağırlıklı ortalaması → her fiyatlama günü eşit miktar açılır;
         kapanış satış penceresinin (ilk satış … tükenme, takvim günü) eşit ağırlıklı ortalaması → her gün eşit miktar kapanır. */
      const hx = { cb: c(/^Hedge kapanış ağırlığı/), ab: c(/^Hedge kilit fiyatı/), ac: c(/^Satış penceresi CIF ort/), ad: c(/^Ürün hedge brüt/), ae: c(/^Hedge işlem maliyeti/), ak: c(/^Hedge teminat finansmanı/), am: c(/^Ürün hedge oranı/) };
      const hg = {}; if (hx.am >= 0 && hx.ab >= 0) {
        const TT = sayfa('Tatiller') || [], tat = new Set(); for (const r of TT) if (r && typeof r[0] === 'number') tat.add(Math.floor(r[0]));
        const fT = F ? Math.max(0, bas(F, /^Tarih/)) : 0, fI = F ? bas(F, /^ICE LSGO front/) : -1, fC = F ? bas(F, /^CIF Med/) : -1, ice = new Map(), cif = new Map();
        if (F) for (const r of F) if (r && typeof r[fT] === 'number') { if (fI >= 0 && typeof r[fI] === 'number') ice.set(Math.floor(r[fT]), r[fI]); if (fC >= 0 && typeof r[fC] === 'number') cif.set(Math.floor(r[fT]), r[fC]); }
        for (let i = 5; i < KG.length; i++) { const r = KG[i]; if (!r || typeof v(r, 'no') !== 'number') continue; const o = r[hx.am]; if (typeof o !== 'number' || !(o > 0)) continue;
          const t = (v(r, 'ton') || 0) * o, f0 = v(r, 'fy'), f1 = ix.fyb >= 0 ? v(r, 'fyb') : f0, n0 = v(r, 'ilk'), n1 = v(r, 'son'); if (!(t > 0) || typeof f0 !== 'number') continue;
          const ac = []; for (let d = Math.floor(f0); d <= Math.floor(typeof f1 === 'number' ? f1 : f0); d++) { const w = new Date(Date.UTC(1899, 11, 30) + d * 864e5).getUTCDay(); if (w === 0 || w === 6 || tat.has(d)) continue; ac.push(d); }
          if (!ac.length) ac.push(Math.floor(f0));
          const kp = []; let kpT = null;
          /* paket 148+ (Kargolar CB var): kapanış FIFO satış ağırlıklı – w = MAX(0, MIN(M, D) − MAX(L, D − C)); hedgenin tamamı satılan kısmın ağırlığıyla kapanır */
          if (hx.cb >= 0) { const L0 = v(r, 'L'), M0 = v(r, 'M'); let cum = 0; const W = [];
            for (let j = 0; j < sat.length; j++) { const a = cum, b = cum + (sat[j] || 0); cum = b; const w = Math.max(0, Math.min(M0, b) - Math.max(L0, a)); if (w > 0.05) W.push([j, w]); }
            const sw = W.reduce((p, x) => p + x[1], 0); if (sw > 0) kpT = W.map(([j, w]) => [j, (w * t) / sw]); }
          else if (typeof n0 === 'number') for (let d = Math.floor(n0); d <= Math.floor(typeof n1 === 'number' ? n1 : n0); d++) kp.push(d);
          hg[v(r, 'no')] = { oran: o, t: r2(t, 1), kilit: r2(r[hx.ab], 2), kap: hx.ac >= 0 ? r2(r[hx.ac], 2) : null, brut: hx.ad >= 0 ? r2(r[hx.ad]) : null, isl: hx.ae >= 0 ? r2(r[hx.ae]) : null, tem: hx.ak >= 0 ? r2(r[hx.ak]) : null, net: r2(v(r, 'hn')), baz: ix.bz >= 0 ? r2(v(r, 'bz')) : null,
            ac: ac.map((d) => [Math.round(d - d0), r2(t / ac.length, 1), r2(ice.get(d), 2), r2(cif.get(d), 2)]), kp: kpT ? kpT.map(([j, q]) => [j, r2(q, 1), r2(ice.get(Math.round(d0) + j), 2), r2(cif.get(Math.round(d0) + j), 2)]) : kp.map((d) => [Math.round(d - d0), r2(t / kp.length, 1), r2(ice.get(d), 2), r2(cif.get(d), 2)]), sat: !!kpT }; } }
      out[u] = { k, g0: iso(d0), sat, bey, yog: yog[u], odv, hg, by0 };
    }
    return Object.keys(out).length ? out : null;
  }
  const api = { omur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.KargoOmur = api;
})(this);
