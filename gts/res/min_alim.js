/* Asgari müşteri alımı (kullanıcı 02.11.2026 17:01: "aylık 1 kt altında olanlara satış yapma").
   Pazar ve akış tablosundaki gibi: dağıtıcının 2027 alımı = KAYMA payı × modelin 2027 satışı; aylık = /12.
   Eşiğin altındaki dağıtıcıya satış yapılmaz; motorin (ve benzin açıksa benzin) satışı onların payı kadar düşer.
   Girdi: akis {oz, ky}, hedefYil (yıllık hedef, senaryo seçimi için), satM / satB (2027 satış, t), esik (t/ay), bz (benzin açık mı).
   ky satırı: [oi, şirket, il, ürün (1 motorin / 0 benzin), kaynak terminal, hedef terminal, ton, ...]; oz satırı [senaryo, vaka, ..., [9] motorin, [10] benzin]. */
(function (kok) {
  function sec(akis, hedefYil) {
    const sen = hedefYil && hedefYil <= 1125000 ? 'BAZ_075' : 'HEDEF_150';
    let oi = akis.oz.findIndex((r) => r[0] === sen && r[1] === 'GERCEKCI_200');
    if (oi < 0) oi = akis.oz.findIndex((r) => r[0] === sen && r[1] === 'REF');
    return { sen, oi };
  }
  function minAlim(akis, hedefYil, satM, satB, esik, bz) {
    if (!akis || !akis.oz || !akis.ky || !(esik > 0) || !(satM > 0)) return null;
    const { sen, oi } = sec(akis, hedefYil); if (oi < 0) return null;
    const o = akis.oz[oi], f = o[9] > 0 ? satM / o[9] : 1, fb = bz ? f : 0;
    const S = new Map();
    for (const r of akis.ky) { if (r[0] !== oi || r[1] < 0) continue; const x = S.get(r[1]) || S.set(r[1], [0, 0]).get(r[1]); x[r[3]] += r[6]; }
    let tm = 0, tb = 0, xm = 0, xb = 0; const sir = [];
    for (const [s, [b, m]] of S) { tm += m; tb += b; if ((m * f + b * fb) / 12 < esik) { sir.push(s); xm += m; xb += b; } }
    sir.sort((a, b) => a - b);
    return { esik, sen, vaka: o[1], sir, n: sir.length, sM: tm ? xm / tm : 0, sB: bz && tb ? xb / tb : 0, tonM: xm * f, tonB: xb * fb };
  }
  const api = { minAlim, sec };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.MinAlim = api;
})(this);
