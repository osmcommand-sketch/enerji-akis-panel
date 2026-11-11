/* Model girdilerine panelin eklediği bağlantılar (hem masaüstü hem web derlemesi kullanır).
   1) Forward TL faizi = TL finansman faizi (kullanıcı 02.11.2026 17:47).
   2) Stok ve alacak finansmanı alım primi içinde (kullanıcı 02.11.2026 17:55: "bunu biz alım primi içinde hesaplıyoruz"):
      Motorin_Kargolar / Benzin_Kargolar R sütunu (kargo bedeli × USD faizi × (stok günü + satış vadesi − ödeme vadesi)) 0'lanır.
      Aynı USD faizi (Girdiler B47) hedge teminat finansmanında da kullanıldığı için B47 değiştirilmez.
   4) Rakip ithalatçıların alım primi (Ozet H44; kullanıcı 11.11.2026 17:34 "bunu değiştirebilelim"): modelde hiçbir formül H44'ü okumaz, rakip maliyetleri
      PDM tablosundan sabit değer olarak gelir. H44 değişince fark (USD/t) × TL/m³ karşılığı (Ozet H55; yoksa Gecis G3 × 0,845) şu sabitlere eklenir:
      Gecis I (bugünkü kaynak ithalat terminaliyse), Gecis T (Karadeniz ithal alımı), Dagiticilar P (× ithal payı K). Tüpraş kaynakları değişmez.
      Birinci derece yaklaşımdır (ithalat finansmanı ve vade etkisi hariç); kesin değer için PDM rakip zincirini yeniden koşar.
   Girdi anahtarı GTS!FinansmanPrimde: 'Alım priminde' (varsayılan) | 'Ayrıca hesapla'.
   3) Tek kur hedge anahtarı (kullanıcı 03.11.2026 19:29 "birleştir"): Ozet 'Kur hedge (Açık / Kapalı)' (H19, satış tahsilatı) alış tarafındaki
      'Kambiyo kur hedge' (H42, beyanname → fatura vadesi forward) hücresini de belirler; ikisi her zaman aynı değeri alır. */
(function (kok) {
  function kur(HS, xb, opt) {
    const W = HS.kitapAc(xb), K = W.Girdiler; if (!K) return { bag: (g) => g, FW: null, FR: [] };
    const lab = new Map(); for (const [k, x] of K.cells) if (typeof x.v === 'string' && !lab.has(x.v)) lab.set(x.v, k);
    const aIdx = lab.size ? [...lab.values()][0] % 16384 : 0;
    const sat = (l) => lab.has(l) ? Math.floor(lab.get(l) / 16384) + 1 : 0, deg = (l) => { const x = lab.has(l) && K.cells.get(lab.get(l) + 1); return x && typeof x.v === 'number' ? x.v : null; };
    const tl = sat('TL finansman faizi (yıllık)'), ft = sat('Forward için TL faizi (yıllık)'), fu = sat('Forward için USD faizi (yıllık)'), fm = sat('Forward banka marjı');
    // paket 75+: model forward TL faizini (B106 = B73) ve finansman seçimini (B158) kendisi bağlıyor → panel bağlantısı kapalı
    const fFt = ft && K.cells.get(lab.get('Forward için TL faizi (yıllık)') + 1), modelFW = !!(fFt && fFt.f), modelFin = lab.has('Stok ve alacak finansmanı');
    const FW = tl && ft && !modelFW ? { tl, ft, fu, fm, tl0: deg('TL finansman faizi (yıllık)'), fu0: deg('Forward için USD faizi (yıllık)'), fm0: deg('Forward banka marjı') } : null;
    const harf = (i) => { let n = i - aIdx + 1, s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
    const FR = []; if (!modelFin) // kargo finansmanı hücreleri: B47 × (stok günü + B72 vade ...)
    for (const sh of ['Motorin_Kargolar', 'Benzin_Kargolar']) { const S = W[sh]; if (!S) continue;
      for (const [k, x] of S.cells) if (x.f && /Girdiler!\$B\$47\*\(/.test(x.f) && /Girdiler!\$B\$72/.test(x.f)) FR.push(sh + '!' + harf(k % 16384) + (Math.floor(k / 16384) + 1)); }
    // tek kur hedge anahtarı: Ozet G sütununda etiketler, H sütununda değerler
    let KH = null; { const O = W.Ozet; if (O) { let a = null, b = null, a0 = null;
      for (const [k, x] of O.cells) { if (k % 16384 !== 6 || typeof x.v !== 'string') continue; const r = Math.floor(k / 16384) + 1;
        if (/^Kur hedge \(Açık/.test(x.v)) { a = 'Ozet!H' + r; const h = O.cells.get(k + 1); a0 = h ? h.v : null; } else if (/^Kambiyo kur hedge/.test(x.v)) b = 'Ozet!H' + r; }
      if (a && b) KH = { a, b, a0 }; } }
    let RP = null; { const O = W.Ozet, Gc = W.Gecis, D = W.Dagiticilar; if (O && Gc) { let adr = null, v0 = null, f = null;
      for (const [k, x] of O.cells) { if (k % 16384 !== 6 || typeof x.v !== 'string') continue; const h = O.cells.get(k + 1);
        if (/^Rakip ithalatçıların alım primi/.test(x.v)) { adr = 'Ozet!H' + (Math.floor(k / 16384) + 1); v0 = h && typeof h.v === 'number' ? h.v : null; }
        else if (/^TL\/m³ karşılığı – 1 USD\/t/.test(x.v) && h && typeof h.v === 'number') f = h.v; }
      if (f == null) { const g3 = Gc.cells.get(2 * 16384 + 6); if (g3 && typeof g3.v === 'number') f = g3.v * 0.845; }
      if (adr && v0 != null && f) { const L = [];
        for (const [k, x] of Gc.cells) { const c = k % 16384, rw = Math.floor(k / 16384) + 1; if (rw < 6 || typeof x.v !== 'number' || x.f) continue;
          if (c === 8) { const t = Gc.cells.get(k - 5); if (t && typeof t.v === 'string' && !/Tüpraş/.test(t.v)) L.push(['Gecis!I' + rw, x.v, 1]); }
          else if (c === 19) L.push(['Gecis!T' + rw, x.v, 1]); }
        if (D) for (const [k, x] of D.cells) { const c = k % 16384, rw = Math.floor(k / 16384) + 1; if (c !== 15 || rw < 6 || typeof x.v !== 'number' || x.f) continue;
          const pay = D.cells.get(k - 5); if (pay && typeof pay.v === 'number' && pay.v > 0) L.push(['Dagiticilar!P' + rw, x.v, pay.v]); }
        RP = { adr, v0, f, L };
        /* paket 141+: PDM'nin kesin parçalı doğrusal tablosu varsa yaklaşımın yerine geçer (Gecis I/T/W/AD, Dagiticilar P; satır anahtarı Şirket ID + İl + Terminal ID) */
        const PP = opt && opt.parca; if (PP && PP.length) { const SUT = { I_Alternatif_eksi_Tupras: 'I', T_Karadeniz_alim_eksi_Tupras: 'T', W_Batman_eksi_Tupras: 'W', AD_Kirikkale_eksi_Tupras: 'AD', P_Rakip_eksi_Tupras_Izmit: 'P' }, M = new Map();
          for (const p of PP) { const k = p.Sayfa + '|' + p.Sirket_ID + '|' + (p.Il || '') + '|' + (p.Terminal_ID || '') + '|' + SUT[p.Sutun]; (M.get(k) || M.set(k, []).get(k)).push(p); }
          const st = (S, rw, c) => { const x = S.cells.get((rw - 1) * 16384 + c); return x ? x.v : null; }, K = [];
          for (const [k] of Gc.cells) { const rw = Math.floor(k / 16384) + 1; if (k % 16384 !== 1 || rw < 6) continue; const sid = st(Gc, rw, 1), il = st(Gc, rw, 2), tid = st(Gc, rw, 4); if (!sid) continue;
            for (const [h, c] of [['I', 8], ['T', 19], ['W', 22], ['AD', 29]]) { const s = M.get('Gecis|' + sid + '|' + il + '|' + tid + '|' + h); const x = Gc.cells.get(k - 1 + c); if (s && x && !x.f) K.push(['Gecis!' + h + rw, s]); } }
          if (D) for (const [k] of D.cells) { const rw = Math.floor(k / 16384) + 1; if (k % 16384 !== 1 || rw < 6) continue; const s = M.get('Dagiticilar|' + st(D, rw, 1) + '|||P'), x = D.cells.get(k + 14); if (s && x && !x.f) K.push(['Dagiticilar!P' + rw, s]); }
          if (K.length) RP.K = K; } } } }
    // dağıtıcı alım ritmi (kullanıcı 04.11.2026 10:27 "alımlar günlük"): paket 81'den itibaren modelin varsayılanı Günlük; GTS!AlimRitmi girilirse Dagiticilar H sütunu ona çekilir
    const RT = []; { const D = W.Dagiticilar; if (D) for (const [k, x] of D.cells) if (k % 16384 === 7 && typeof x.v === 'string' && /^(Günlük|2 günde bir|Haftalık)$/.test(x.v)) RT.push('Dagiticilar!H' + (Math.floor(k / 16384) + 1)); }
    const bag = (g) => { const o = { ...g };
      if (KH) o[KH.b] = KH.a in g ? g[KH.a] : KH.a0;
      { const rt = g['GTS!AlimRitmi']; if (rt && rt !== 'Model') for (const a of RT) if (!(a in g)) o[a] = rt; }   // paket 81+: model varsayılanı Günlük → panel yalnız açık girdiyle değiştirir
      if (FW) o['Girdiler!B' + FW.ft] = ('Girdiler!B' + FW.tl) in g ? g['Girdiler!B' + FW.tl] : FW.tl0;
      if ((g['GTS!FinansmanPrimde'] || 'Alım priminde') === 'Alım priminde') for (const a of FR) o[a] = 0;
      if (RP && RP.adr in g && Number(g[RP.adr]) !== RP.v0 && isFinite(Number(g[RP.adr]))) { const h = Number(g[RP.adr]);
        if (RP.K) { for (const [a, P] of RP.K) { if (a in g) continue; /* parça seçimi: aralık içi; tam sayı boşluğunda (−27 … −26 arası) en yakın parça */
            let b = null, bd = Infinity; for (const p of P) { const lo = p.H44_alt == null ? -Infinity : p.H44_alt, hi = p.H44_ust == null ? Infinity : p.H44_ust, d = h < lo ? lo - h : h > hi ? h - hi : 0; if (d < bd) { bd = d; b = p; } }
            if (b) o[a] = Math.round((b.Sabit_TL_m3 + b.Egim_TL_m3_USD_t * h) * 100) / 100; } }
        else { const d = (h - RP.v0) * RP.f; for (const [a, v, w] of RP.L) if (!(a in g)) o[a] = v + d * w; } }
      return o; };
    return { bag, FW, FR, modelFW, modelFin, KH, RT, RP };
  }
  const api = { kur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.GirdiBag = api;
})(this);
