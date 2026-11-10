/* Satışlar raporu – lot / alt lot / FIFO (kullanıcı 03.11.2026 19:59):
   "Günlük satış rakamlarını müşteri bazında, kârlılığı oluşturan tüm kalemler aynı satırda. Her gemi bir lot (antrepo beyannamesi),
    lotlar alt lotlara (ilgili geminin ithalat beyannameleri) bağlı; satışlar ilgili ithalat beyannamelerinden FIFO ile."
   Kaynak (model): <Ürün>_Gunluk (günlük satış, kümülatif satış, kümülatif ithalat beyannamesi, satış geliri TL, beyanname kambiyo / kur hedge TL),
   <Ürün>_Kargolar (lot: gemi, ton, antrepo beyannamesi = tahliye başlangıcı, alış USD/t, finansman, ürün hedge net, dönemde satılan t),
   Fiyatlar (USD/TRY = fatura günü kuru), Karlilik (faaliyet giderleri, kur farkı USD karşılığı kuru, mutabakat), Ozet (kaynak bazlı satış primi).
   FIFO: lot sırası = modelin kümülatif alım sırası (Kargolar 'Kümülatif alım önce/sonra'); alt lot = o lota düşen ithalat beyannamesi parçası
   (Gunluk 'Kümülatif ithalat beyannamesi (t)'); satış = kümülatif satış aralığının düştüğü alt lot(lar).
   Müşteri: paket 80+ modelin Musteri_Gunluk sayfası (gün × dağıtıcı satış t ve vergisiz gelir TL; pano sdt-gts-musteri-gunluk-satis) →
   mus: [[Şirket ID, Şirket, prim TL/m³, vade]] (yalnız Durum = 'Satış'), mg: [gün → [[mus indeksi, t, gelir TL], ...]].
   Sayfa yoksa (eski paket) müşteri dağılımı panelde akış payıyla yapılır.
   Çıktı (ürün başına):
     lot: [no, gemi, ton, B/L t, antrepo beyannamesi (iso), varış (iso), alış $/t, finansman $/t, ürün hedge net $/t, dönemde satılan t, COD (iso),
           alış kırılımı $/t (kullanıcı 04.11.2026 10:52): 11 CIF Med (fiyatlama günü), 12 alım primi / iskontosu, 13 navlun farkı, 14 ikinci liman,
           15 GTS elleçleme + ek seyir, 16 tahliye farkı (fire; alış − diğerleri), 17 gerçek yoğunluk t/m³ (paket 85: Kargolar 'Gerçek yoğunluk', yoksa 0,835)]
     tup: [gün → Tüpraş vergisiz TL/t], tupM3: [gün → Tüpraş vergisiz TL/m³] (satış fiyatı = satış günü Tüpraş + satış primi, TL/m³)
     alt: [lot no, gün, ton, beyanname sıra no (ürün içinde), kambiyo $/t, forward $/t, parça (aynı beyannamenin ikinci lotu = 1), ithalat beyannamesi günü kuru]
     sat: [gün, alt indeksi, ton]
     nak (paket 101+): gün → { fin USD finansman maliyeti ($, + = gider), kmb USD kredi kur farkı ($), tlg TL tahsilat getirisi ($) } – yıl ortalama kuruyla
     g0 (iso), gTL: [gün → satış geliri TL/t, model ağırlıklı primle], kur: [gün → USD/TRY], yog
   Ortak: yil {2027: {faal $/t, satT}}, prim {M, D, B, K, ort} (TL/m³), mut (Karlilik kalemleri, mutabakat için). */
(function (kok) {
  const iso = (d) => (typeof d === 'number' ? new Date(Date.UTC(1899, 11, 30) + Math.round(d) * 864e5).toISOString().slice(0, 10) : null);
  const r2 = (v, n = 0) => (typeof v === 'number' && isFinite(v) ? Math.round(v * 10 ** n) / 10 ** n : null);
  function satislar(sayfa) {
    const bas = (R, re) => (R && R[4] ? R[4].findIndex((h) => typeof h === 'string' && re.test(h)) : -1);
    const G = sayfa('Girdiler') || [], gi = (re) => G.findIndex((r) => r && typeof r[0] === 'string' && re.test(r[0]));
    const yi = gi(/^Yoğunluk \(t\/m³\)/), yog = { Motorin: 0.845, Benzin: 0.745 };
    if (yi > 0) for (let i = yi + 1; i < yi + 4; i++) { const r = G[i]; if (r && (r[0] === 'Motorin' || r[0] === 'Benzin') && typeof r[1] === 'number') yog[r[0]] = r[1]; }
    const ov = gi(/^Alım ödeme vadesi: COD \+ gün/), odv = ov > 0 && typeof G[ov][1] === 'number' ? G[ov][1] : 0;
    const F = sayfa('Fiyatlar'), kur = new Map(); if (F) { const fT = Math.max(0, bas(F, /^Tarih/)), fK = bas(F, /^USD\/TRY/) >= 0 ? bas(F, /^USD\/TRY/) : 3; for (const r of F) if (r && typeof r[fT] === 'number' && typeof r[fK] === 'number') kur.set(Math.floor(r[fT]), r[fK]); }
    const K = (d) => { for (let x = Math.floor(d); x > Math.floor(d) - 10; x--) if (kur.has(x)) return kur.get(x); return null; };
    const yil = (d) => new Date(Date.UTC(1899, 11, 30) + d * 864e5).getUTCFullYear();
    // Karlilik: faaliyet giderleri (stok ve alacak finansmanı hariç – lotta), satılan ton, kur farkı USD kuru, mutabakat kalemleri
    const KL = sayfa('Karlilik') || [], bul = (re) => KL.find((r) => r && typeof r[0] === 'string' && re.test(r[0].trim())), v = (r, j) => (r && typeof r[j] === 'number' ? r[j] : 0);
    const kFa = bul(/^FAALİYET GİDERLERİ/), kSf = bul(/^Stok ve alacak finansmanı/), kVf = bul(/^ÖTV ve KDV finansmanı/), kSt = bul(/^Gerçekleşen satış – bayi alımı/) || bul(/^PLANLANAN SATIŞ/);
    const kKt = bul(/^Yasal defter: kambiyo/), kKi = kKt ? KL.indexOf(kKt) : -1, kKu = kKi >= 0 ? KL.slice(kKi + 1, kKi + 3).find((r) => r && typeof r[0] === 'string' && /USD eşdeğeri/.test(r[0])) : null;
    const yil0 = {}; for (const [y, j] of [[2027, 1], [2028, 2]]) { const st = v(kSt, j); yil0[y] = { satT: st, faal: st ? (v(kFa, j) - v(kSf, j) - v(kVf, j)) / st : 0, faiz: st ? -v(kVf, j) / st : 0,   // kullanıcı 04.11.2026 12:23: faaliyet giderleri ile faiz (ÖTV/KDV nakdi, + gelir) ayrı
       kk: kKt && kKu && v(kKu, j) ? v(kKt, j) / v(kKu, j) : null }; }
    const ort = {}; for (const [d, k] of kur) { const y = yil(d), o = ort[y] || (ort[y] = [0, 0]); o[0] += k; o[1]++; }
    const yk = (y) => (yil0[y] && yil0[y].kk) || (ort[y] ? ort[y][0] / ort[y][1] : null);
    const mut = {}; for (const [ad, re] of [['net', /^NET SATIŞLAR/], ['smm', /^SATILAN MALIN MALİYETİ/], ['hedge', /^Ürün hedge sonucu/i], ['brut', /^BRÜT KÂR/], ['faal', /^FAALİYET GİDERLERİ/], ['kur', /^KUR FARKI/], ['kmb', /^Kambiyo kârı/], ['hdg', /^Kur hedge sonucu/], ['nk', /^NET KÂR/],
      ['gtl', /^NET SATIŞLAR \(TL\)/], ['stl', /^SATILAN MALIN MALİYETİ \(TL\)/], ['btl', /^BRÜT KÂR \(TL\)/], ['bus', /^BRÜT KÂR \(USD\)/]]) { const r = bul(re); if (r) mut[ad] = [v(r, 1), v(r, 2)]; }
    mut.tl = !!mut.btl;   // paket 85+: model kullanıcı hesap şablonunda (TL); ürün hedge satırı + = kazanç
    if (mut.tl) { const h = bul(/^ÜRÜN HEDGE SONUCU/); if (h) mut.hedge = [-v(h, 1), -v(h, 2)]; }   // eski işaretle (− = kazanç) tutarlı tut
    // kaynak bazlı satış primi (Ozet G/H): M Mersin üçüncü taraf, D Tüpraş Mersin, B Batman, K Kırıkkale; ort = ağırlıklı (H13)
    const Oz = sayfa('Ozet') || [], oz = (re) => { const r = Oz.find((x) => x && typeof x[6] === 'string' && re.test(x[6])); return r && typeof r[7] === 'number' ? r[7] : null; };
    const prim = { M: oz(/^Mersin üçüncü taraf/), D: oz(/^Tüpraş Mersin/), B: oz(/^Tüpraş Batman/), K: oz(/^Tüpraş Kırıkkale/), ort: oz(/^Satış fiyatı – motorin/) };
    const out = { yil: yil0, prim, mut, odv };
    // paket 125+: GTS ITT (USD/t) satış modu (Ozet H50); satış fiyatı günlük USD/t × kur (Gunluk geliri), Tüpraş + prim değil
    { const r = Oz.find((x) => x && typeof x[6] === 'string' && /^Satış şekli/.test(x[6])); out.itt = !!(r && typeof r[7] === 'string' && /^ITT/.test(r[7])); }
    const gb = (re) => { const i = gi(re); return i > 0 && typeof G[i][1] === 'number' ? G[i][1] : 0; }, ELS = gb(/^GTS elleçleme tarifesi/) + gb(/^İthal kargo ek seyir/);
    const FI = F ? F[4] || [] : [], tupK = { Motorin: FI.findIndex((h) => typeof h === 'string' && /^Tüpraş motorin vergisiz \(TL\/m³\)/.test(h)), Benzin: FI.findIndex((h) => typeof h === 'string' && /^Tüpraş benzin vergisiz \(TL\/m³\)/.test(h)) };
    for (const u of ['Motorin', 'Benzin']) {
      const KG = sayfa(u + '_Kargolar'), GN = sayfa(u + '_Gunluk'); if (!KG || !GN) continue;
      const c = (re) => bas(KG, re), g = (re) => bas(GN, re);
      const ix = { no: c(/^Kargo no/), var: c(/^Var mı/), gemi: c(/^Gemi sınıfı/), ton: c(/^Ton$/), vr: c(/^Varış$/), al: c(/^Alış maliyeti/), L: c(/^Kümülatif alım önce/), M: c(/^Kümülatif alım sonra/),
        ab: c(/^Tahliye başlangıcı/), cif: c(/^CIF Med/), yg: c(/^Gerçek yoğunluk/), nf: c(/^Navlun farkı \(USD\/t\)/), il: c(/^İkinci liman \(USD\/t\)/), cod: c(/^Tahliye bitişi/), bl: c(/^B\/L miktarı/), at: c(/^Dönem içinde satılan/), fin: c(/^Finansman – tedarikçi/), hn: c(/^Ürün hedge net/) };
      if ([ix.no, ix.L, ix.M, ix.al].some((x) => x < 0)) continue;
      const kv = (r, k) => (ix[k] >= 0 ? r[ix[k]] : null), L = [], APR = gb(u === 'Motorin' ? /^Alım primi \/ iskontosu – motorin/ : /^Alım primi \/ iskontosu – benzin/);
      for (let i = 5; i < KG.length; i++) { const r = KG[i]; if (!r || typeof kv(r, 'no') !== 'number' || (ix.var >= 0 && !kv(r, 'var'))) continue; if (!(kv(r, 'M') > kv(r, 'L'))) continue;
        const at = kv(r, 'at') || 0; L.push({ r: [kv(r, 'no'), kv(r, 'gemi'), r2(kv(r, 'ton'), 1), r2(kv(r, 'bl'), 1), iso(kv(r, 'ab')), iso(kv(r, 'vr')), r2(kv(r, 'al'), 4),
          at ? r2((kv(r, 'fin') || 0) / at, 4) : 0, at ? r2((kv(r, 'hn') || 0) / at, 4) : 0, r2(at, 1), iso(kv(r, 'cod'))].concat((() => {
            const al = kv(r, 'al') || 0, cf = kv(r, 'cif') || 0, nv = kv(r, 'nf') || 0, ik = kv(r, 'il') || 0; return [r2(cf, 4), r2(APR, 4), r2(nv, 4), r2(ik, 4), r2(ELS, 4), r2(al - cf - APR - nv - ik - ELS, 4), typeof kv(r, 'yg') === 'number' ? kv(r, 'yg') : 0.835]; })()), a: kv(r, 'L'), b: kv(r, 'M') }); }
      if (!L.length) continue;
      const gT = g(/^Tarih/), gS = g(/^Günlük satış \(t\)/), gKS = g(/^Kümülatif satış/), gKB = g(/^Kümülatif ithalat beyannamesi/), gR = g(/^Satış geliri, vergisiz/), gK = g(/^Yasal defter kambiyo/), gH = g(/^Kur hedge sonucu \(TL/);
      // paket 101+: finansman ve kur farkı satış günü nakit akışından (PDM 09.11.2026; kullanıcı 11:28): TL tahsilat getirisi, USD finansman maliyeti, USD kredi kur farkı
      const gI = g(/^TL tahsilat getirisi/), gL = g(/^USD finansman maliyeti/), gM = g(/^USD kredi kur farkı/), nak = gI >= 0 && gL >= 0 && gM >= 0, dfin = [], dkm = [], dtl = [];
      if ([gT, gS, gKS, gKB].some((x) => x < 0)) continue;
      const rows = GN.slice(5).filter((r) => r && typeof r[gT] === 'number'); if (!rows.length) continue;
      const d0 = rows[0][gT], gTL = [], kr = [], alt = [], sat = [], tup = [], tupM3 = [], fT = F ? Math.max(0, bas(F, /^Tarih/)) : 0, tupM = new Map();
      if (F && tupK[u] >= 0) for (const r of F) if (r && typeof r[fT] === 'number' && typeof r[tupK[u]] === 'number') tupM.set(Math.floor(r[fT]), r[tupK[u]] / yog[u]);
      // alt lotlar: kümülatif ithalat beyannamesi artışları (ilk gün = açılış stoğundaki beyanname edilmiş milli ürün)
      let onc = 0, li = 0, sira = 0;
      for (const r of rows) { const i = Math.round(r[gT] - d0), cb = r[gKB] || 0, t = cb - onc; gTL[i] = r[gS] > 0 && gR >= 0 ? r2(r[gR] / r[gS], 2) : null; kr[i] = r2(K(r[gT]), 4); if (nak) { const k = yk(yil(r[gT])); dfin[i] = r2(r[gL] || 0, 2); dkm[i] = k ? r2((r[gM] || 0) / k, 2) : 0; dtl[i] = k ? r2((r[gI] || 0) / k, 2) : 0; } tup[i] = tupM.has(Math.floor(r[gT])) ? r2(tupM.get(Math.floor(r[gT])), 2) : null; tupM3[i] = tupM.has(Math.floor(r[gT])) ? r2(tupM.get(Math.floor(r[gT])) * yog[u], 2) : null;
        if (t > 0.01) { sira++; const y = yil(r[gT]), k = yk(y), kmb = gK >= 0 && k ? (r[gK] || 0) / t / k : 0, fwd = gH >= 0 && k ? (r[gH] || 0) / t / k : 0;
          let a = onc, p = 0; while (li < L.length && L[li].b <= a + 1e-6) li++;
          for (let j = li; j < L.length && L[j].a < cb - 1e-6; j++) { const o = Math.min(cb, L[j].b) - Math.max(a, L[j].a); if (o <= 0.01) continue; alt.push([L[j].r[0], i, r2(o, 2), sira, r2(kmb, 4), r2(fwd, 4), p++, r2(K(r[gT]), 4)]); a = Math.max(a, L[j].a) + o; }
          onc = cb; } }
      // satışlar: kümülatif satış aralığı → alt lotlar (FIFO)
      const AC = []; { let c0 = 0; for (const x of alt) { AC.push([c0, c0 + x[2]]); c0 += x[2]; } }
      let s0 = 0, ai = 0;
      for (const r of rows) { const s = r[gS] || 0; if (!(s > 0)) continue; const i = Math.round(r[gT] - d0), a = s0, b = s0 + s; s0 = b;
        while (ai < AC.length && AC[ai][1] <= a + 1e-6) ai++;
        for (let j = ai; j < AC.length && AC[j][0] < b - 1e-6; j++) { const o = Math.min(b, AC[j][1]) - Math.max(a, AC[j][0]); if (o > 0.01) sat.push([i, j, r2(o, 2)]); } }
      for (let i = 0; i < gTL.length; i++) { if (gTL[i] === undefined) gTL[i] = null; if (kr[i] === undefined) kr[i] = null; if (tup[i] === undefined) tup[i] = null; if (tupM3[i] === undefined) tupM3[i] = null; }
      // müşteri (dağıtıcı) bazında günlük satış – modelin Musteri_Gunluk sayfası
      let mus = null, mg = null; const MG = sayfa('Musteri_Gunluk');
      if (MG) { const m = (re) => bas(MG, re), mT = m(/^Tarih/), mI = m(/^Şirket ID/), mA = m(/^Şirket$/), mU = m(/^Ürün/), mD = m(/^Durum/), mS = m(/^Satış \(t\)/), mP = m(/^Uygulanan satış primi/), mR = m(/^Satış geliri/), mV = m(/^Vade/);
        if ([mT, mI, mS, mR].every((x) => x >= 0)) { const ix = new Map(); mus = []; mg = [];
          for (let k = 5; k < MG.length; k++) { const r = MG[k]; if (!r || typeof r[mT] !== 'number') continue; if (mU >= 0 && r[mU] && r[mU] !== u) continue; if (mD >= 0 && r[mD] !== 'Satış') continue;
            const t = r[mS]; if (!(t > 0)) continue; let j = ix.get(r[mI]); if (j == null) { j = mus.length; ix.set(r[mI], j); mus.push([r[mI], mA >= 0 ? r[mA] : r[mI], mP >= 0 ? r2(r[mP], 2) : null, mV >= 0 ? r[mV] : null]); }
            const i = Math.round(r[mT] - d0); (mg[i] || (mg[i] = [])).push([j, r2(t, 3), r2(r[mR] || 0)]); }
          for (let i = 0; i < gTL.length; i++) if (!mg[i]) mg[i] = null; if (!mus.length) { mus = null; mg = null; } } }
      if (nak) for (let i = 0; i < gTL.length; i++) { if (dfin[i] == null) dfin[i] = 0; if (dkm[i] == null) dkm[i] = 0; if (dtl[i] == null) dtl[i] = 0; }
      out[u] = { lot: L.map((x) => x.r), alt, sat, g0: iso(d0), gTL, kur: kr, yog: yog[u], mus, mg, tup, tupM3, nak: nak ? { fin: dfin, kmb: dkm, tlg: dtl } : null };
    }
    return out.Motorin || out.Benzin ? out : null;
  }
  const api = { satislar };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.Satislar = api;
})(this);
