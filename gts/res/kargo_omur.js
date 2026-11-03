/* Kargo yaşam döngüsü (kullanıcı 03.11.2026 16:50: "kargolar sayfası; kargo filtrelenince tüm yaşam döngüsü: NOR, COD, antrepo beyannamesi
   tarihi ve miktarı, ithalat beyannameleri, günlük satış miktarları").
   Kaynak model sayfaları: <Ürün>_Kargolar (kargo satırları), <Ürün>_Gunluk (günlük satış, ithalat beyannamesi, beyanname kargosu, kambiyo),
   Fiyatlar (USD/TRY). Hem masaüstü hattı (X.sayfa) hem web derlemesi (web_hesap.js) kullanır.
   Çıktı: { urun: { k: [[...kargo]], g0: 'YYYY-MM-DD', sat: [t/gün], bey: [[gün, t, kargo, kambiyo TL, beyanname kuru, ödeme kuru]] } }
   Kargo satırı: [no, gemi, ton, B/L t, fiyatlama, NOR/varış, antrepo beyannamesi (tahliye başlangıcı), COD (tahliye bitişi), ödeme, satışa hazır,
                  ilk satış, tükenme, yaşam gün, ort. stok gün, CIF $/t, alış $/t, değer $, brüt marj $/t, brüt marj $, net marj $, ÖTV teminatı TL,
                  kümülatif alım önce t, kümülatif alım sonra t, varış kuru] */
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
      const ix = { no: c(/^Kargo no/), var: c(/^Var mı/), gemi: c(/^Gemi sınıfı/), ton: c(/^Ton$/), vr: c(/^Varış$/), fy: c(/^Fiyatlama günü/), cif: c(/^CIF Med/), al: c(/^Alış maliyeti/), dg: c(/^Değer \(USD\)/),
        L: c(/^Kümülatif alım önce/), M: c(/^Kümülatif alım sonra/), ilk: c(/^İlk satış/), son: c(/^Tükenme/), yas: c(/^Yaşam süresi/), stk: c(/^Ort\. stokta kalma/), bmt: c(/^Brüt marj \(USD\/t\)/),
        bm: c(/^Brüt marj \(USD\)$/), nm: c(/^Net marj \(USD\)$/), kv: c(/^Kur – varış/), hz: c(/^Satışa hazır/), ab: c(/^Tahliye başlangıcı/), cod: c(/^Tahliye bitişi/), bl: c(/^B\/L miktarı/), otv: c(/^ÖTV teminatı – antrepo/) };
      const v = (r, k) => (ix[k] >= 0 ? r[ix[k]] : null);
      const k = []; for (let i = 5; i < KG.length; i++) { const r = KG[i]; if (!r || typeof v(r, 'no') !== 'number' || (ix.var >= 0 && !v(r, 'var'))) continue; if (!(v(r, 'M') > v(r, 'L'))) continue;
        const cod = v(r, 'cod');
        k.push([v(r, 'no'), v(r, 'gemi'), r2(v(r, 'ton')), r2(v(r, 'bl')), iso(v(r, 'fy')), iso(v(r, 'vr')), iso(v(r, 'ab')), iso(cod), typeof cod === 'number' ? iso(cod + odv) : null, iso(v(r, 'hz')),
          iso(v(r, 'ilk')), iso(v(r, 'son')), r2(v(r, 'yas')), r2(v(r, 'stk'), 1), r2(v(r, 'cif'), 1), r2(v(r, 'al'), 1), r2(v(r, 'dg')), r2(v(r, 'bmt'), 1), r2(v(r, 'bm')), r2(v(r, 'nm')), r2(v(r, 'otv')),
          r2(v(r, 'L'), 1), r2(v(r, 'M'), 1), r2(v(r, 'kv'), 3)]); }
      if (!k.length) continue;
      const gT = g(/^Tarih/), gS = g(/^Günlük satış \(t\)/), gB = g(/^İthalat beyannamesi/), gC = g(/^Beyanname kargosu/), gF = g(/^Ödeme günü kuru/), gK = g(/^Yasal defter kambiyo/);
      const rows = GN.slice(5).filter((r) => r && typeof r[gT] === 'number'); if (!rows.length) continue;
      const d0 = rows[0][gT], sat = [], bey = [];
      for (const r of rows) { const i = Math.round(r[gT] - d0); sat[i] = r2(r[gS] || 0, 1);
        if (r[gB] > 0) { const t = r[gB] * yog[u]; bey.push([i, r2(t, 1), gC >= 0 ? r[gC] : null, gK >= 0 ? r2(r[gK] || 0) : null, r2(K(r[gT]), 4), gF >= 0 ? r2(r[gF], 4) : null]); } }
      for (let i = 0; i < sat.length; i++) if (sat[i] == null) sat[i] = 0;
      out[u] = { k, g0: iso(d0), sat, bey, yog: yog[u], odv };
    }
    return Object.keys(out).length ? out : null;
  }
  const api = { omur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.KargoOmur = api;
})(this);
