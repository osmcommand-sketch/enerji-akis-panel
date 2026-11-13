/* Model girdilerine panelin eklediği bağlantılar (hem masaüstü hem web derlemesi kullanır).
   1) Forward TL faizi = TL finansman faizi (kullanıcı 02.11.2026 17:47).
   2) Stok ve alacak finansmanı alım primi içinde (kullanıcı 02.11.2026 17:55: "bunu biz alım primi içinde hesaplıyoruz"):
      Motorin_Kargolar / Benzin_Kargolar R sütunu (kargo bedeli × USD faizi × (stok günü + satış vadesi − ödeme vadesi)) 0'lanır.
      Aynı USD faizi (Girdiler B47) hedge teminat finansmanında da kullanıldığı için B47 değiştirilmez.
   4) Rakip ithalatçıların alım primi (Ozet H44; kullanıcı 11.11.2026 17:34 "bunu değiştirebilelim"): modelde hiçbir formül H44'ü okumaz, rakip maliyetleri
      PDM tablosundan sabit değer olarak gelir. H44 değişince fark (USD/t) × TL/m³ karşılığı (Ozet H55; yoksa Gecis G3 × 0,845) şu sabitlere eklenir:
      Gecis I (bugünkü kaynak ithalat terminaliyse), Gecis T (Karadeniz ithal alımı), Dagiticilar P (× ithal payı K). Tüpraş kaynakları değişmez.
      Paket 144+: Gecis I formüldür (Ozet H60 paçal ? AN : AM); sabit değerler AM'ye yazılır, AN şirketin AM değişiminin hacim ağırlıklı ortalaması kadar kaydırılır (yaklaşık);
      paket 146+ tabloda AM / AN sütunları varsa ikisi de tablodan kesin.
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
    /* kullanıcı 13.11.2026 10:56: rakiplerin ithal alım koşulları satır satır modelde (SCN_GTS_RAKIP_ITHAL_KOSUL) → genel rakip primi (Ozet H44) kaydırması kapalı */
    const RAKIP_H44 = false;
    let RP = null; { const O = W.Ozet, Gc = W.Gecis, D = W.Dagiticilar; if (RAKIP_H44 && O && Gc) { let adr = null, v0 = null, f = null;
      for (const [k, x] of O.cells) { if (k % 16384 !== 6 || typeof x.v !== 'string') continue; const h = O.cells.get(k + 1);
        if (/^Rakip ithalatçıların alım primi/.test(x.v)) { adr = 'Ozet!H' + (Math.floor(k / 16384) + 1); v0 = h && typeof h.v === 'number' ? h.v : null; }
        else if (/^TL\/m³ karşılığı – 1 USD\/t/.test(x.v) && h && typeof h.v === 'number') f = h.v; }
      if (f == null) { const g3 = Gc.cells.get(2 * 16384 + 6); if (g3 && typeof g3.v === 'number') f = g3.v * 0.845; }
      /* paket 144+: Gecis I formül (Ozet H60 paçal ? AN : AM) → sabitler AM'de (terminal maliyeti); AN (şirket paçalı) şirketin AM değişiminin hacim (F) ağırlıklı ortalaması kadar kayar */
      const i6 = Gc.cells.get(5 * 16384 + 8), iForm = !!(i6 && i6.f);
      if (adr && v0 != null && f) { const L = [];
        for (const [k, x] of Gc.cells) { const c = k % 16384, rw = Math.floor(k / 16384) + 1; if (rw < 6 || typeof x.v !== 'number' || x.f) continue;
          if (c === 8 || (c === 38 && iForm)) { const t = Gc.cells.get(k - c + 3); if (t && typeof t.v === 'string' && !/Tüpraş/.test(t.v)) L.push(['Gecis!' + (c === 8 ? 'I' : 'AM') + rw, x.v, 1]); }
          else if (c === 19) L.push(['Gecis!T' + rw, x.v, 1]); }
        if (D) for (const [k, x] of D.cells) { const c = k % 16384, rw = Math.floor(k / 16384) + 1; if (c !== 15 || rw < 6 || typeof x.v !== 'number' || x.f) continue;
          const pay = D.cells.get(k - 5); if (pay && typeof pay.v === 'number' && pay.v > 0) L.push(['Dagiticilar!P' + rw, x.v, pay.v]); }
        RP = { adr, v0, f, L, PC: null };
        if (iForm) { const PC = new Map(); for (const [k] of Gc.cells) { const rw = Math.floor(k / 16384) + 1; if (k % 16384 !== 1 || rw < 6) continue;
            const sid = Gc.cells.get(k).v, F = Gc.cells.get(k + 4), am = Gc.cells.get(k + 37), an = Gc.cells.get(k + 38); if (!sid || !F || typeof F.v !== 'number') continue;
            const e = PC.get(sid) || PC.set(sid, { sf: 0, R: [] }).get(sid); e.sf += F.v; e.R.push({ rw, F: F.v, am0: am && typeof am.v === 'number' && !am.f ? am.v : null, an: an && typeof an.v === 'number' && !an.f ? an.v : null }); }
          RP.PC = PC; }
        /* paket 141+: PDM'nin kesin parçalı doğrusal tablosu varsa yaklaşımın yerine geçer (Gecis I/T/W/AD, Dagiticilar P; satır anahtarı Şirket ID + İl + Terminal ID) */
        const PP = opt && opt.parca; if (PP && PP.length) { const SUT = { I_Alternatif_eksi_Tupras: 'I', T_Karadeniz_alim_eksi_Tupras: 'T', W_Batman_eksi_Tupras: 'W', AD_Kirikkale_eksi_Tupras: 'AD', P_Rakip_eksi_Tupras_Izmit: 'P', AM_Terminal_eksi_Tupras: 'AM', AN_Pacal_eksi_Tupras: 'AN' }, M = new Map();
          for (const p of PP) { const k = p.Sayfa + '|' + p.Sirket_ID + '|' + (p.Il || '') + '|' + (p.Terminal_ID || '') + '|' + SUT[p.Sutun]; (M.get(k) || M.set(k, []).get(k)).push(p); }
          const st = (S, rw, c) => { const x = S.cells.get((rw - 1) * 16384 + c); return x ? x.v : null; }, K = [];
          for (const [k] of Gc.cells) { const rw = Math.floor(k / 16384) + 1; if (k % 16384 !== 1 || rw < 6) continue; const sid = st(Gc, rw, 1), il = st(Gc, rw, 2), tid = st(Gc, rw, 4); if (!sid) continue;
            /* paket 146+: tablo AM (terminal) ve AN (paçal) sütunlarını doğrudan verir; eski tablolarda I → (formülse) AM */
            const kk = (h) => M.get('Gecis|' + sid + '|' + il + '|' + tid + '|' + h);
            for (const [h, c, a] of [['AM', 38, 'AM'], ['AN', 39, 'AN'], ['I', iForm ? 38 : 8, iForm ? 'AM' : 'I'], ['T', 19, 'T'], ['W', 22, 'W'], ['AD', 29, 'AD']]) {
              if (h === 'I' && kk('AM')) continue; const s = kk(h), x = Gc.cells.get(k - 1 + c); if (s && x && typeof x.v === 'number' && !x.f) K.push(['Gecis!' + a + rw, s, x.v]); } }
          if (D) for (const [k] of D.cells) { const rw = Math.floor(k / 16384) + 1; if (k % 16384 !== 1 || rw < 6) continue; const s = M.get('Dagiticilar|' + st(D, rw, 1) + '|||P'), x = D.cells.get(k + 14); if (s && x && !x.f) K.push(['Dagiticilar!P' + rw, s, x.v]); }
          if (K.length) RP.K = K; if (K.some((e) => /^Gecis!AN/.test(e[0]))) RP.PC = null; /* AN tablodan kesin → paçal yaklaşımı kapalı */ } } } }
    // dağıtıcı alım ritmi (kullanıcı 04.11.2026 10:27 "alımlar günlük"): paket 81'den itibaren modelin varsayılanı Günlük; GTS!AlimRitmi girilirse Dagiticilar H sütunu ona çekilir
    const RT = []; { const D = W.Dagiticilar; if (D) for (const [k, x] of D.cells) if (k % 16384 === 7 && typeof x.v === 'string' && /^(Günlük|2 günde bir|Haftalık)$/.test(x.v)) RT.push('Dagiticilar!H' + (Math.floor(k / 16384) + 1)); }
    const bag = (g) => { const o = { ...g };
      if (KH) o[KH.b] = KH.a in g ? g[KH.a] : KH.a0;
      { const rt = g['GTS!AlimRitmi']; if (rt && rt !== 'Model') for (const a of RT) if (!(a in g)) o[a] = rt; }   // paket 81+: model varsayılanı Günlük → panel yalnız açık girdiyle değiştirir
      if (FW) o['Girdiler!B' + FW.ft] = ('Girdiler!B' + FW.tl) in g ? g['Girdiler!B' + FW.tl] : FW.tl0;
      if ((g['GTS!FinansmanPrimde'] || 'Alım priminde') === 'Alım priminde') for (const a of FR) o[a] = 0;
      if (RP && RP.adr in g && Number(g[RP.adr]) !== RP.v0 && isFinite(Number(g[RP.adr]))) { const h = Number(g[RP.adr]);
        if (RP.K) { /* parça seçimi: aralık içi; tam sayı boşluğunda (−27 … −26 arası) en yakın parça.
            Paket 143+: tablo ölçek ekonomisi öncesi kurulmuş olabilir → tablonun değişimi (değer(h) − değer(v0)) modeldeki sabit değere eklenir */
          const pv = (P, h) => { let b = null, bd = Infinity; for (const p of P) { const lo = p.H44_alt == null ? -Infinity : p.H44_alt, hi = p.H44_ust == null ? Infinity : p.H44_ust, d = h < lo ? lo - h : h > hi ? h - hi : 0; if (d < bd) { bd = d; b = p; } } return b ? b.Sabit_TL_m3 + b.Egim_TL_m3_USD_t * h : null; };
          for (const [a, P, x0] of RP.K) { if (a in g) continue; const v1 = pv(P, h), v0 = pv(P, RP.v0); if (v1 != null && v0 != null) o[a] = Math.round((x0 + v1 - v0) * 100) / 100; } }
        else { const d = (h - RP.v0) * RP.f; for (const [a, v, w] of RP.L) if (!(a in g)) o[a] = v + d * w; }
        if (RP.PC) for (const [, e] of RP.PC) { if (!e.sf) continue; let s = 0; for (const r of e.R) { const a = 'Gecis!AM' + r.rw; if (r.am0 != null && a in o && !(a in g)) s += r.F * (o[a] - r.am0); }
          if (s) { const dd = s / e.sf; for (const r of e.R) { const a = 'Gecis!AN' + r.rw; if (r.an != null && !(a in g)) o[a] = Math.round((r.an + dd) * 100) / 100; } } } }
      return o; };
    return { bag, FW, FR, modelFW, modelFin, KH, RT, RP };
  }
  const api = { kur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.GirdiBag = api;
})(this);
