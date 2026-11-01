'use strict';
/* GTS Dörtyol proje panosu – veri hattı (masaüstü). Girdi: PDM teslimat zip'i (Enerji_Master_DB_2026_paket_NN.zip).
   İçinden: enerji_master_2026.db (SCN_GTS_* + panel veri hattı), GTS_Dortyol_*_Senaryo_Modeli.xlsx (hesaplanmış değerler),
   tools/db2026/gts_mc_*.csv (Monte Carlo), README_2026.md (kararlar). Veri bilgisayardan çıkmaz. */
const path = require('path');
const zlib = require('zlib');

/* ---------- zip ---------- */
function zipAc(buf) {
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Zip dosyası okunamadı (bozuk ya da eksik indirilmiş olabilir).');
  let n = buf.readUInt16LE(e + 10), cd = buf.readUInt32LE(e + 16);
  if (cd === 0xFFFFFFFF || n === 0xFFFF) { const l = buf.readUInt32LE(e - 20) === 0x07064b50 ? Number(buf.readBigUInt64LE(e - 12)) : -1; if (l < 0) throw new Error('Zip64 okunamadı.');
    n = Number(buf.readBigUInt64LE(l + 32)); cd = Number(buf.readBigUInt64LE(l + 48)); }
  const g = [];
  for (let i = 0, p = cd; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const met = buf.readUInt16LE(p + 10); let cs = buf.readUInt32LE(p + 20), us = buf.readUInt32LE(p + 24); const fl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32);
    let lo = buf.readUInt32LE(p + 42); const ad = buf.toString('utf8', p + 46, p + 46 + fl);
    if (cs === 0xFFFFFFFF || us === 0xFFFFFFFF || lo === 0xFFFFFFFF) { let x = p + 46 + fl; const xe = x + xl;
      while (x < xe) { const id = buf.readUInt16LE(x), sz = buf.readUInt16LE(x + 2); if (id === 1) { let q = x + 4;
        if (us === 0xFFFFFFFF) { us = Number(buf.readBigUInt64LE(q)); q += 8; } if (cs === 0xFFFFFFFF) { cs = Number(buf.readBigUInt64LE(q)); q += 8; } if (lo === 0xFFFFFFFF) lo = Number(buf.readBigUInt64LE(q)); } x += 4 + sz; } }
    g.push({ ad, met, cs, lo }); p += 46 + fl + xl + kl;
  }
  const oku = (x) => { const h = x.lo, v = h + 30 + buf.readUInt16LE(h + 26) + buf.readUInt16LE(h + 28), ham = buf.subarray(v, v + x.cs);
    if (x.met === 0) return Buffer.from(ham); if (x.met === 8) return zlib.inflateRawSync(ham); throw new Error('Zip sıkıştırma yöntemi desteklenmiyor (' + x.met + ').'); };
  const temiz = g.filter((x) => !/__MACOSX|\/$/.test(x.ad));
  return { list: temiz.map((x) => x.ad), bul: (re) => temiz.filter((x) => re.test(x.ad)), oku };
}

/* ---------- xlsx (yalnız hesaplanmış değerler) ---------- */
const xmlCoz = (s) => s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, k) => k === 'lt' ? '<' : k === 'gt' ? '>' : k === 'amp' ? '&' : k === 'quot' ? '"' : k === 'apos' ? "'" : k[1] === 'x' || k[1] === 'X' ? String.fromCodePoint(parseInt(k.slice(2), 16)) : String.fromCodePoint(+k.slice(1)));
function xlsxAc(buf) {
  const z = zipAc(buf), al = (n) => { const x = z.bul(new RegExp('^' + n.replace(/[.]/g, '\\.') + '$'))[0]; return x ? z.oku(x).toString('utf8') : null; };
  const ss = []; const sx = al('xl/sharedStrings.xml');
  if (sx) for (const m of sx.matchAll(/<si>([\s\S]*?)<\/si>/g)) ss.push(xmlCoz([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const wb = al('xl/workbook.xml'), rel = al('xl/_rels/workbook.xml.rels'), R = {};
  for (const m of rel.matchAll(/<Relationship\b([^>]*)\/?>/g)) { const id = /Id="([^"]+)"/.exec(m[1]), t = /Target="([^"]+)"/.exec(m[1]); if (id && t) R[id[1]] = t[1].replace(/^\/?xl\//, '').replace(/^\//, ''); }
  const S = {}; for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) { const ad = /name="([^"]+)"/.exec(m[1]), id = /r:id="([^"]+)"/.exec(m[1]); if (ad && id) S[xmlCoz(ad[1])] = 'xl/' + R[id[1]]; }
  const kol = (r) => { let c = 0; for (const ch of r.replace(/\d+$/, '')) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };
  const cache = {};
  /* satırlar: dizi (1 tabanlı satır numarası → hücre dizisi); sayılar Number, metin String, boş null */
  function sayfa(ad) {
    if (cache[ad]) return cache[ad];
    const x = al(S[ad]); if (!x) throw new Error('Excel modelinde "' + ad + '" sayfası yok.');
    const rows = [];
    for (const rm of x.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = []; const ic = rm[2] || '';
      for (const cm of ic.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const at = cm[1], ref = /\br="([A-Z]+\d+)"/.exec(at), t = (/\bt="(\w+)"/.exec(at) || [])[1], body = cm[2] || '';
        if (!ref) continue; const v = /<v>([\s\S]*?)<\/v>/.exec(body); let val = null;
        if (t === 's') val = v ? ss[+v[1]] : null;
        else if (t === 'str' || t === 'e') val = v ? xmlCoz(v[1]) : null;
        else if (t === 'inlineStr') { const is = /<is>([\s\S]*?)<\/is>/.exec(body); val = is ? xmlCoz([...is[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((q) => q[1]).join('')) : null; }
        else if (t === 'b') val = v ? v[1] === '1' : null;
        else val = v ? Number(v[1]) : null;
        if (t === 'e') val = null;
        r[kol(ref[1])] = val;
      }
      rows[+rm[1]] = r;
    }
    return (cache[ad] = rows);
  }
  return { sayfa, sayfalar: Object.keys(S) };
}
const serial = (v) => typeof v === 'number' && v > 30000 && v < 80000;
const tarih = (v) => { if (!serial(v)) return v; const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v * 864e5)); return d.toISOString().slice(0, 10); };

/* Python round (yarıda çifte) – masaüstü ve web verisi aynı olsun */
function pr(x, n = 0) { if (typeof x !== 'number' || !isFinite(x)) return x; const m = Math.pow(10, n), y = x * m, f = Math.floor(y), d = y - f;
  const r = Math.abs(d - 0.5) < 1e-9 && d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(y); return n ? r / m : r; }

/* ---------- csv ---------- */
function csvOku(t) { const L = t.replace(/^﻿/, '').split(/\r?\n/).filter((x) => x.length); const h = L[0].split(','); return L.slice(1).map((l) => { const a = l.split(','); const o = {}; h.forEach((k, i) => (o[k] = a[i])); return o; }); }

function run(SQL, zipBuf, resDir, log = () => {}, opt = {}) {
  const fs = require('fs');
  const Z = zipAc(zipBuf);
  const dbX = Z.bul(/\.(db|sqlite3?)$/i).sort((a, b) => b.cs - a.cs)[0];
  if (!dbX) throw new Error('Zip içinde veritabanı (.db) yok. PDM teslimatındaki Enerji_Master_DB_2026_paket_NN.zip dosyasını seçin.');
  const xl = Z.bul(/(^|\/)GTS_Dortyol_[\w]*Senaryo_Modeli\.xlsx$/i).sort((a, b) => { const y = (s) => (s.ad.match(/20\d\d/g) || []); return y(b).length - y(a).length || (Math.max(...y(b).map(Number), 0) - Math.max(...y(a).map(Number), 0)); })[0];
  if (!xl) throw new Error('Bu pakette GTS Excel modeli (GTS_Dortyol_…_Senaryo_Modeli.xlsx) yok. GTS modelini içeren paketi (ör. paket 56) seçin.');
  log('Veritabanı açılıyor');
  const dbBuf = Z.oku(dbX);
  // panel veri hattı: terminal, il, şirket, ilçe ve SCN_GTS_* (gts) anahtarları
  const P = require(path.join(opt.kok || __dirname, 'pipeline.js'));
  const D = P.run(SQL, dbBuf, resDir, (m) => log('Panel verisi: ' + m)).data;
  if (!D.gts || !D.gts.oz || !D.gts.oz.length) throw new Error('Veritabanında GTS senaryo tabloları (SCN_GTS_*) yok.');
  const O = {};
  const G = D.gts, used = new Set();
  for (const r of G.tm) used.add(r[1]); for (const r of G.ky) { used.add(r[4]); used.add(r[5]); }
  const TM = {}; for (const t of [...used].filter((x) => x >= 0).sort((a, b) => a - b)) { const T = D.term[t], h = D.hub[T[2]]; TM[t] = [T[0], T[1], h.ad, h.lat, h.lon]; }
  O.akis = { oz: G.oz, tm: G.tm, ky: G.ky, ik: G.ik, pr: G.pr }; O.term = TM;
  O.sir = {}; D.sir.forEach((s, i) => (O.sir[i] = s[1]));
  O.il = {}; for (const r of D.il) O.il[r[0]] = r[1];
  const g = JSON.parse(fs.readFileSync(path.join(resDir, 'tr_svg.json'), 'utf8')); O.geo = { p: g.p, c: g.c, proj: g.proj, w: g.w, h: g.h };
  // SCN_GTS_TANK_GENEL / BENZIN_LOT
  const db = new SQL.Database(new Uint8Array(dbBuf));
  const has = (t) => db.exec(`select count(*) from sqlite_master where name='${t}'`)[0].values[0][0] > 0;
  const Q = (s) => { const r = db.exec(s); if (!r.length) return []; const { columns, values } = r[0]; return values.map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]]))); };
  O.tk_genel = has('SCN_GTS_TANK_GENEL') ? Q('select * from SCN_GTS_TANK_GENEL').map((r) => [r.Gosterge, r.Deger]) : [];
  O.blot = has('SCN_GTS_BENZIN_LOT') ? Q('select * from SCN_GTS_BENZIN_LOT order by 2,3').map((r) => [r.Senaryo_ID, pr(r.Benzin_lot_ton), pr(r.Lot_gun_tuketim, 1), pr(r.Varis_sayisi), pr(r.Ort_stok_ton), pr(r.Tepe_stok_ton), pr(r.Finansman_USD_yil), pr(r.Finansman_USD_t, 2), pr(r.Sok5_tepe_USD)]) : [];
  db.close();
  // Excel modeli
  log('Excel modeli okunuyor: ' + path.basename(xl.ad));
  O.model = path.basename(xl.ad);
  const X = xlsxAc(Z.oku(xl));
  const satir = (ad, a, b, mc) => { const R = X.sayfa(ad), out = []; const son = b || R.length - 1; for (let i = a; i <= son; i++) { const r = R[i] || []; const q = []; const n = mc || r.length; for (let j = 0; j < n; j++) q[j] = r[j] === undefined ? null : r[j]; out.push(q); } return out; };
  const R2 = (x, n = 0) => pr(x, n);
  const oz = satir('Ozet', 1, 83, 5);
  O.oz_bas = oz.slice(1, 4).map((x) => x[0]);
  O.oz = oz.slice(4).filter((x) => x[0] != null).map((x) => [x[0], R2(x[1], 2), R2(x[2], 2), R2(x[3], 2), x[4]]);
  O.gir = satir('Girdiler', 1, 146, 3).filter((x) => x[0] != null).map((x) => [x[0], x[1], x[2]]);
  const gunluk = (ad) => satir(ad, 4).filter((r) => serial(r[0])).map((r) => [R2(r[2] || 0), R2(r[6] || 0), R2(r[7] || 0), R2(r[9] || 0), R2(r[10] || 0), R2(r[17] || 0), R2(r[18] || 0, 4), R2(r[22] || 0), R2(r[23] || 0)]);
  O.g0 = tarih(satir('Motorin_Gunluk', 4).find((r) => serial(r[0]))[0]);
  O.gm = gunluk('Motorin_Gunluk'); O.gb = gunluk('Benzin_Gunluk');
  const hdr = satir('Fiyatlar', 4, 4)[0], ix = {}; hdr.forEach((h, i) => { if (h) ix[h] = i; });
  const t2027 = Date.UTC(2027, 0, 1) / 864e5 + 25569;
  O.fiy = satir('Fiyatlar', 5).filter((r) => serial(r[0]) && r[0] >= t2027 - 0.5).map((r) => { const row = [R2(r[1], 1), R2(r[2], 1), R2(r[3], 3), R2(r[6], 1), R2(r[7], 1), R2(r[8]), R2(r[9])];
    for (const s of ['Baz', 'Ayı', 'Boğa']) for (const p of ['P10', 'P50', 'P90', 'Yol']) row.push(R2(r[ix[`${s} · CIF motorin ${p}`]], 1));
    for (const s of ['Baz', 'Ayı', 'Boğa']) for (const p of ['P10', 'P50', 'P90', 'Yol']) row.push(R2(r[ix[`${s} · USD/TRY ${p}`]], 3));
    return row; });
  const kargo = (ad) => satir(ad, 4).filter((r) => typeof r[0] === 'number' && r[1] === 1).map((r) => [r[0], r[2], R2(r[3]), tarih(r[4]), tarih(r[39]), tarih(r[13]), tarih(r[14]), R2(r[15]), R2(r[16], 1), R2(r[6], 1), R2(r[9], 1), R2(r[18], 1), R2(r[20]), R2(r[21]), R2(r[31]), R2(r[17])]);
  O.km = kargo('Motorin_Kargolar'); O.kb = kargo('Benzin_Kargolar');
  O.vn = satir('Vergi_Nakit', 4).filter((r) => serial(r[0])).map((r) => [R2((r[13] || 0) / 1e6), R2((r[24] || 0) / 1e6)]);
  O.tplan = satir('Tank_Plani', 4, 18, 4).filter((x) => typeof x[0] === 'number').map((x) => [x[0], x[1], x[2], x[3]]);
  O.tank = []; for (const r of satir('Tank', 3)) { if (!serial(r[0])) continue; O.tank.push([R2(r[1]), R2(r[4]), R2(r[8]), R2(r[11])]); if (!O.tkap) O.tkap = [R2(r[2]), R2(r[5]), R2(r[9]), R2(r[12])]; }
  O.mev = satir('Mevsimsellik', 4, 27, 10).filter((x) => typeof x[6] === 'number').map((x) => [x[6], tarih(x[7]), R2(x[8], 4)]);
  // Monte Carlo (önceki model sürümleri)
  const LAB = { mc_dav: { K: 'Davranış yok', A: 'Davranış, tavan yok', T15: 'Satış tavanı 1,5×', T12: 'Satış tavanı 1,2×', T11: 'Satış tavanı 1,1×', T10: 'Satış tavanı 1,0×', Q50: 'Bayi kotası %50' },
    mc_gemi: { A: 'LR2 kısmi 46 kt + Handy 10 kt', B: 'MR + Handy 10 kt', C: 'LR2 kısmi 46 kt + Kıyı 5 kt' } };
  const mc = (f, key, lab) => { const x = Z.bul(new RegExp('(^|/)' + f.replace('.', '\\.') + '$'))[0]; if (!x) return [];
    const gg = new Map(), ad = {};
    for (const r of csvOku(Z.oku(x).toString('utf8'))) { if (r.err && r.err !== '0') continue; const k = r[key] + '|' + r.sen; (gg.get(k) || gg.set(k, []).get(k)).push(Number(r.toplam)); ad[r[key]] = (lab || {})[r[key]] || r.ad || r[key]; }
    const out = []; for (const [k, v0] of gg) { const [a, s] = k.split('|'), v = [...v0].sort((p, q) => p - q), n = v.length, q = (p) => v[Math.min(n - 1, Math.max(0, pr(p * (n - 1))))];
      out.push([a, ad[a], s, n, pr(v.reduce((p, c) => p + c, 0) / n, 2), pr(q(0.1), 2), pr(q(0.5), 2), pr(q(0.9), 2), pr(v.filter((z) => z < 0).length / n, 3), v.map((z) => pr(z, 1))]); }
    return out; };
  O.mc_hedge = mc('gts_mc_hedge_2027.csv', 'mode'); O.mc_tank = mc('gts_mc_tank_2027.csv', 'cfg');
  O.mc_dav = mc('gts_mc_davranis_2027.csv', 'mode', LAB.mc_dav); O.mc_gemi = mc('gts_mc_sonuc_2027.csv', 'cfg', LAB.mc_gemi);
  // Kararlar: README'deki GTS bölüm başlıkları (kullanıcı kararları tarihleriyle)
  O.karar = [];
  const rd = Z.bul(/(^|\/)README[^/]*\.md$/i)[0];
  if (rd) { const t = Z.oku(rd).toString('utf8'), i0 = t.search(/^## .*GTS/m);
    if (i0 >= 0) for (const m of t.slice(i0).matchAll(/^## (.+)$/gm)) { const h = m[1].trim(); if (!(/GTS|kullanıcı|hedge/i.test(h)) || /FACT_|düzeltme/i.test(h)) continue; const d = /(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}:\d{2}))?/.exec(h);
      O.karar.push([d ? `${d[1]}.${d[2]}${d[4] ? ' ' + d[4] : ''}` : '', h.replace(/\s*\((?:PDM|kullanıcı)[^)]*\)/g, '').replace(/\s+–\s+SENARYO.*$/, '').trim()]); } }
  log('Hazır');
  return O;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { run, zipAc, xlsxAc };
