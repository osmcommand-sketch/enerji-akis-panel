/* Model girdilerine panelin eklediği bağlantılar (hem masaüstü hem web derlemesi kullanır).
   1) Forward TL faizi = TL finansman faizi (kullanıcı 02.11.2026 17:47).
   2) Stok ve alacak finansmanı alım primi içinde (kullanıcı 02.11.2026 17:55: "bunu biz alım primi içinde hesaplıyoruz"):
      Motorin_Kargolar / Benzin_Kargolar R sütunu (kargo bedeli × USD faizi × (stok günü + satış vadesi − ödeme vadesi)) 0'lanır.
      Aynı USD faizi (Girdiler B47) hedge teminat finansmanında da kullanıldığı için B47 değiştirilmez.
   Girdi anahtarı GTS!FinansmanPrimde: 'Alım priminde' (varsayılan) | 'Ayrıca hesapla'.
   3) Tek kur hedge anahtarı (kullanıcı 03.11.2026 19:29 "birleştir"): Ozet 'Kur hedge (Açık / Kapalı)' (H19, satış tahsilatı) alış tarafındaki
      'Kambiyo kur hedge' (H42, beyanname → fatura vadesi forward) hücresini de belirler; ikisi her zaman aynı değeri alır. */
(function (kok) {
  function kur(HS, xb) {
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
    const bag = (g) => { const o = { ...g };
      if (KH) o[KH.b] = KH.a in g ? g[KH.a] : KH.a0;
      if (FW) o['Girdiler!B' + FW.ft] = ('Girdiler!B' + FW.tl) in g ? g['Girdiler!B' + FW.tl] : FW.tl0;
      if ((g['GTS!FinansmanPrimde'] || 'Alım priminde') === 'Alım priminde') for (const a of FR) o[a] = 0;
      return o; };
    return { bag, FW, FR, modelFW, modelFin, KH };
  }
  const api = { kur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.GirdiBag = api;
})(this);
