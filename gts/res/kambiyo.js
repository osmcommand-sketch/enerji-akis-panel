/* Yasal defter (TL) görünümü – kambiyo kârı/zararı (kullanıcı 02.11.2026 20:04):
   "kambiyo kârı/zararı ithalat beyannamesi açılış tarihindeki kur ile ilgili kargonun fatura vadesindeki kur arası farktan hesaplanmalı."
   Her gün açılan ithalat beyannamesi (Motorin_Gunluk / Benzin_Gunluk 'İthalat beyannamesi – transfer (m³)' × yoğunluk) FIFO ile kargolara
   dağıtılır (Kargolar 'Kümülatif alım önce/sonra'). Kargo fatura vadesi = tahliye bitişi (COD) + 'Alım ödeme vadesi: COD + gün'.
   Kambiyo (TL) = USD alış bedeli × (beyanname günü kuru − fatura vadesi kuru); + = kâr. Kur: Vergi_Nakit 'USD/TRY'.
   TL defterde ithalat maliyeti beyanname kuruyla yazılır, kambiyo bunu fiilen ödenen TL'ye düzeltir: net kâr değişmez (sınıflandırma).
   Girdi: sayfa(ad) → satır dizisi (indeks = satır no, sütun 0 tabanlı; hesap.js X.sayfa ile aynı). Tarihler Excel seri sayısı. */
(function (kok) {
  function kambiyo(sayfa) {
    const bas = (R, re) => (R && R[4] ? R[4].findIndex((h) => typeof h === 'string' && re.test(h)) : -1);
    const G = sayfa('Girdiler') || [], VN = sayfa('Vergi_Nakit'); if (!VN) return null;
    const gi = (re) => G.findIndex((r) => r && typeof r[0] === 'string' && re.test(r[0]));
    const yi = gi(/^Yoğunluk \(t\/m³\)/), yog = { Motorin: 0.845, Benzin: 0.745 };
    if (yi > 0) for (let i = yi + 1; i < yi + 4; i++) { const r = G[i]; if (r && (r[0] === 'Motorin' || r[0] === 'Benzin') && typeof r[1] === 'number') yog[r[0]] = r[1]; }
    const ov = gi(/^Alım ödeme vadesi: COD \+ gün/), odv = ov > 0 && typeof G[ov][1] === 'number' ? G[ov][1] : 0;
    const iT = bas(VN, /^Tarih/), iK = bas(VN, /^USD\/TRY/), kur = new Map(); let k0 = Infinity, k1 = -Infinity;
    for (const r of VN) if (r && typeof r[iT] === 'number' && typeof r[iK] === 'number') { kur.set(Math.floor(r[iT]), r[iK]); k0 = Math.min(k0, r[iT]); k1 = Math.max(k1, r[iT]); }
    if (!kur.size) return null;
    const K = (d) => { d = Math.floor(Math.min(Math.max(d, k0), k1)); for (let x = d; x >= k0; x--) if (kur.has(x)) return kur.get(x); return kur.get(k0); };
    const yil = (d) => new Date(Date.UTC(1899, 11, 30) + d * 864e5).getUTCFullYear();
    const out = {};
    // paket 75+: model kambiyoyu kendisi hesaplıyor (Gunluk AB–AG, Karlilik 'Yasal defter: kambiyo'); tablo bu sütunlardan okunur → tek rakam
    let model = false;
    for (const u of ['Motorin', 'Benzin']) { const GN = sayfa(u + '_Gunluk'); if (!GN) continue;
      const gT = bas(GN, /^Tarih/), gB = bas(GN, /^İthalat beyannamesi/), gC = bas(GN, /^Beyanname kargosu/), gJ = bas(GN, /^Kargo alış \(USD\/t\)/), gV = bas(GN, /^Kargo ödeme tarihi/), gF = bas(GN, /^Ödeme günü kuru/), gK = bas(GN, /^Yasal defter kambiyo/);
      if ([gT, gB, gC, gJ, gV, gF, gK].some((x) => x < 0)) continue; model = true;
      for (let i = 5; i < GN.length; i++) { const r = GN[i]; if (!r || typeof r[gT] !== 'number' || !(r[gC] > 0) || !(r[gB] > 0) || typeof r[gV] !== 'number') continue;
        const usd = r[gB] * yog[u] * r[gJ]; if (!usd) continue; const kv = r[gF], ktl = r[gK] || 0, kb = kv + ktl / usd, y = yil(r[gT]);
        const Y = out[y] || (out[y] = { usd: 0, tlOdeme: 0, tlBeyan: 0, ktl: 0, kusd: 0, gun: 0 });
        Y.usd += usd; Y.tlOdeme += usd * kv; Y.tlBeyan += usd * kb; Y.ktl += ktl; Y.kusd += ktl / kb; Y.gun += usd * (r[gT] - r[gV]); } }
    if (model) { const KL = sayfa('Karlilik') || [], ki = KL.findIndex((r) => r && typeof r[0] === 'string' && /^Yasal defter: kambiyo/.test(r[0].trim()));
      const ue = ki >= 0 ? KL.slice(ki + 1, ki + 3).find((r) => r && typeof r[0] === 'string' && /USD eşdeğeri/.test(r[0])) : null;
      if (ue) { if (out[2027] && typeof ue[1] === 'number') out[2027].kusd = ue[1]; if (out[2028] && typeof ue[2] === 'number') out[2028].kusd = ue[2]; }
      for (const Y of Object.values(out)) { Y.gun = Y.usd ? Y.gun / Y.usd : 0; Y.kurOdeme = Y.usd ? Y.tlOdeme / Y.usd : 0; Y.kurBeyan = Y.usd ? Y.tlBeyan / Y.usd : 0; }
      return { yil: out, odv, model: true, usdKur: ue ? 'yıl ortalama kuru' : 'beyanname günü kuru' }; }
    for (const u of ['Motorin', 'Benzin']) {
      const GN = sayfa(u + '_Gunluk'), KG = sayfa(u + '_Kargolar'); if (!GN || !KG) continue;
      const gT = bas(GN, /^Tarih/), gB = bas(GN, /^İthalat beyannamesi/), cV = bas(KG, /^Var mı/), cL = bas(KG, /^Kümülatif alım önce/), cM = bas(KG, /^Kümülatif alım sonra/), cJ = bas(KG, /^Alış maliyeti \(USD\/t/), cP = bas(KG, /^Tahliye bitişi/);
      if ([gT, gB, cL, cM, cJ, cP].some((x) => x < 0)) continue;
      const C = []; for (let i = 5; i < KG.length; i++) { const r = KG[i]; if (!r || typeof r[cL] !== 'number' || typeof r[cM] !== 'number' || !(r[cM] > r[cL]) || (cV >= 0 && !r[cV])) continue; C.push({ L: r[cL], M: r[cM], J: r[cJ], v: (typeof r[cP] === 'number' ? r[cP] : 0) + odv }); }
      let cum = 0, ci = 0;
      for (let i = 5; i < GN.length; i++) { const r = GN[i]; if (!r || typeof r[gT] !== 'number' || !(r[gB] > 0)) continue;
        const d = r[gT], t = r[gB] * yog[u], a = cum, b = cum + t; cum = b; const kb = K(d), y = yil(d);
        while (ci < C.length && C[ci].M <= a) ci++;
        for (let j = ci; j < C.length && C[j].L < b; j++) { const c = C[j], o = Math.min(b, c.M) - Math.max(a, c.L); if (o <= 0) continue;
          const usd = o * c.J, kv = K(c.v), Y = out[y] || (out[y] = { usd: 0, tlOdeme: 0, tlBeyan: 0, ktl: 0, kusd: 0, gun: 0 });
          Y.usd += usd; Y.tlOdeme += usd * kv; Y.tlBeyan += usd * kb; Y.ktl += usd * (kb - kv); Y.kusd += usd * (kb - kv) / kb; Y.gun += usd * (d - c.v); } } }
    for (const Y of Object.values(out)) { Y.gun = Y.usd ? Y.gun / Y.usd : 0; Y.kurOdeme = Y.usd ? Y.tlOdeme / Y.usd : 0; Y.kurBeyan = Y.usd ? Y.tlBeyan / Y.usd : 0; }
    return { yil: out, odv };
  }
  const api = { kambiyo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else kok.Kambiyo = api;
})(this);
