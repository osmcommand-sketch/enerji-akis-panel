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

/* Hedge_Kalibrasyon: ufuk tablosu, baz göstergeleri, geriye dönük test, okuma notları */
function hkalOku(rows) { const o = { ufuk: [], baz: [], bt: [], okuma: [], baslik: null }; let mod = '';
  for (const r of rows) { if (!r || r.every((x) => x == null || x === '')) continue; const a = r[0];
    if (!o.baslik && typeof a === 'string' && /kalibrasyon/i.test(a)) { o.baslik = a; continue; }
    if (typeof a === 'string' && /^Ufuk/.test(a)) { mod = 'u'; continue; }
    if (typeof a === 'string' && /^Geriye dönük test/.test(a)) { mod = 'b0'; o.btBaslik = a; continue; }
    if (mod === 'b0' && a === 'Hedge') { mod = 'b'; continue; }
    if (typeof a === 'string' && /^Okuma/.test(a)) { mod = 'o'; continue; }
    if (mod === 'u' && typeof a === 'number') { o.ufuk.push(r.slice(0, 10)); continue; }
    if (mod === 'u' && typeof a === 'string') { o.baz.push([a, r[3]]); continue; }
    if (mod === 'b' && typeof a === 'string' && typeof r[3] === 'number') { o.bt.push([a, r[1], r[2], r[3]]); continue; }
    if (mod === 'o' && typeof a === 'string') o.okuma.push(a.replace(/^•\s*/, '')); }
  return o.ufuk.length || o.bt.length ? o : null; }

/* ---------- csv ---------- */
function csvOku(t) { const L = t.replace(/^﻿/, '').split(/\r?\n/).filter((x) => x.length); const h = L[0].split(','); return L.slice(1).map((l) => { const a = l.split(','); const o = {}; h.forEach((k, i) => (o[k] = a[i])); return o; }); }

function girdiYolu(kok) {
  if (/[\\/]guncel[\\/][^\\/]+[\\/]?$/.test(kok)) return path.join(kok, '..', '..', 'girdiler.json');
  if (process.env.GTS_GIRDI_DIR) return path.join(process.env.GTS_GIRDI_DIR, 'girdiler.json');
  const os = require('os'); const b = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : path.join(os.homedir(), '.config'));
  return path.join(b, 'GTS Dörtyol', 'girdiler.json');
}
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
  { const ks = new Set(G.ky.map((r) => r[1])), sa = new Map(); for (const r of D.af || []) if (r[3] === 1 && ks.has(r[0])) { const k = r[0] + '|' + r[1]; sa.set(k, (sa.get(k) || 0) + r[6]); }
    O.saf = [...sa].filter(([, v]) => v >= 500).map(([k, v]) => { const [a, b] = k.split('|').map(Number); return [a, b, Math.round(v)]; }); for (const r of O.saf) used.add(r[1]); }
  const TM = {}; for (const t of [...used].filter((x) => x >= 0).sort((a, b) => a - b)) { const T = D.term[t], h = D.hub[T[2]], tp = ((h.t || []).find((x) => x[0] === T[0]) || [])[4] || ''; TM[t] = [T[0], T[1], h.ad, h.lat, h.lon, /Rafineri/.test(tp) ? 'R' : 'T']; }
  O.akis = { oz: G.oz, tm: G.tm, ky: G.ky, ik: G.ik, pr: G.pr }; O.term = TM;
  O.sir = {}; O.sirg = {}; D.sir.forEach((s, i) => { O.sir[i] = s[1]; if (s[2] && s[2] !== s[1]) O.sirg[i] = s[2]; });
  O.il = {}; for (const r of D.il) O.il[r[0]] = r[1];
  const g = JSON.parse(fs.readFileSync(path.join(resDir, 'tr_svg.json'), 'utf8')); O.geo = { p: g.p, c: g.c, proj: g.proj, w: g.w, h: g.h };
  // SCN_GTS_TANK_GENEL / BENZIN_LOT
  const db = new SQL.Database(new Uint8Array(dbBuf));
  const has = (t) => db.exec(`select count(*) from sqlite_master where name='${t}'`)[0].values[0][0] > 0;
  const Q = (s) => { const r = db.exec(s); if (!r.length) return []; const { columns, values } = r[0]; return values.map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]]))); };
  // kayma satırları bayinin bugünkü kaynağıyla (SCN_GTS_KAYMA.Kaynak; paket 70+): [10] = M / D (Tüpraş Mersin deposu) / B / K
  if (Q("select count(*) n from pragma_table_info('SCN_GTS_KAYMA') where name='Kaynak'")[0].n) {
    const oi = new Map(G.oz.map((r, i) => [r[0] + '|' + r[1], i])), si = new Map(D.sir.map((r, i) => [r[0], i])), ti = new Map(D.term.map((r, i) => [r[0], i])), KK = { MERSIN: 'M', T31_TUPRAS_DEPO: 'D', TUPRAS_MERSIN: 'D', T13: 'B', T21: 'K' };
    O.akis.ky = Q('select Senaryo_ID a,Vaka_ID b,Sirket_ID s,Il_ID i,Urun u,Kaynak_Terminal_ID k,Hedef_Terminal_ID h,Kaynak q,sum(Kayan_ton) v,sum(Ithal_ton) m,sum(Kayan_ton*Km_once) o,sum(Kayan_ton*Km_sonra) n from SCN_GTS_KAYMA where Kayan_ton>0.5 group by 1,2,3,4,5,6,7,8 order by 1,2,3,4,5,6,7,8')
      .map((r) => [oi.has(r.a + '|' + r.b) ? oi.get(r.a + '|' + r.b) : -1, si.has(r.s) ? si.get(r.s) : -1, r.i, r.u === 'Benzin' ? 0 : 1, ti.has(r.k) ? ti.get(r.k) : -1, ti.has(r.h) ? ti.get(r.h) : -1, pr(r.v), pr(r.m), pr(r.o / r.v), pr(r.n / r.v), KK[r.q] || 'M']); }
  O.tk_genel = has('SCN_GTS_TANK_GENEL') ? Q('select * from SCN_GTS_TANK_GENEL').map((r) => [r.Gosterge, r.Deger]) : [];
  O.blot = has('SCN_GTS_BENZIN_LOT') ? Q('select * from SCN_GTS_BENZIN_LOT order by 2,3').map((r) => [r.Senaryo_ID, pr(r.Benzin_lot_ton), pr(r.Lot_gun_tuketim, 1), pr(r.Varis_sayisi), pr(r.Ort_stok_ton), pr(r.Tepe_stok_ton), pr(r.Finansman_USD_yil), pr(r.Finansman_USD_t, 2), pr(r.Sok5_tepe_USD)]) : [];
  // Rakip analizi (kullanıcı 09.11.2026 10:04): GTS etki alanında dağıtıcı × yükleme noktası × kaynak alım maliyeti (SCN_GTS_RAKIP_MALIYET_V2, PDM analizi – resmî değil)
  try { if (has('SCN_GTS_RAKIP_MALIYET_V2')) { const K = ['Yil', 'Sirket', 'Rafineri_alicisi', 'Yukleme_noktasi', 'Il', 'Kaynak', 'Tip', 'Hacim_t', 'Leg2_km', 'CIF', 'Kur', 'Tupras_Izmit', 'Fiyat_bazi', 'Liste_TL_m3', 'Prim_orani', 'Prim_TL_m3', 'Vade_gun', 'Vade_degeri_TL_m3', 'Urun_TL_m3', 'Ic_gider_TL_m3', 'Vergi_fin_TL_m3', 'Ellecleme_TL_m3', 'Tasima_TL_m3', 'Alim_maliyeti_TL_m3', 'Alim_maliyeti_vergi_vadeli_TL_m3', 'Bolgeye_teslim_TL_m3', 'GTS_farki_TL_m3', 'GTS_farki_teslim_TL_m3', 'Not'];
      const yv = (v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
      O.rakip = { kol: K, satir: Q('select ' + K.map((k) => '"' + k + '"').join(',') + ' from SCN_GTS_RAKIP_MALIYET_V2 order by Yil, Sirket, Yukleme_noktasi').map((r) => K.map((k) => yv(r[k]))), durum: (Q('select Durum from SCN_GTS_RAKIP_MALIYET_V2 limit 1')[0] || {}).Durum || '' }; } } catch (e) { O.rakip = null; log('Rakip analizi: ' + e.message); }
  db.close();
  // Excel modeli
  log('Excel modeli okunuyor: ' + path.basename(xl.ad));
  O.model = path.basename(xl.ad);
  // kullanıcı girdileri (Ticari koşullar paneli) – userData/girdiler.json; model bunlarla yeniden hesaplanır
  const gy = girdiYolu(opt.kok || __dirname); let girdi = {};
  try { if (fs.existsSync(gy)) girdi = JSON.parse(fs.readFileSync(gy, 'utf8')) || {}; } catch { girdi = {}; }
  const HS = require(path.join(resDir, 'hesap.js'));
  const xb = Z.oku(xl);
  log(Object.keys(girdi).length ? 'Model sizin girdilerinizle yeniden hesaplanıyor' : 'Model hesaplanıyor');
  // Forward faizleri (kullanıcı 02.11.2026 17:47): forward TL faizi = Genel bakıştaki TL faizi; USD faizi panelden girilir
  // panel bağlantıları: forward TL faizi = TL faizi; stok ve alacak finansmanı alım priminde (res/girdi_bag.js)
  const GB = require(path.join(resDir, 'girdi_bag.js')).kur(HS, xb), FW = GB.FW, bag = GB.bag;
  const HSh = (g) => HS.hesapla(xb, bag(g));
  let X = HSh(girdi);
  // Girdiler'deki bir hücre artık Ozet panelinden besleniyorsa (=Ozet!$H$n), eski girdi anahtarını panele taşı
  { const tas = {}; for (const k of Object.keys(girdi)) { const [sh, adr] = k.split('!'); if (sh !== 'Girdiler') continue; const f = X.formulMetni(sh, adr), m = f && /^=?\s*(?:IF\(\s*)?Ozet!\$?H\$?(\d+)/.exec(f); if (m && !(('Ozet!H' + m[1]) in girdi)) tas[k] = 'Ozet!H' + m[1]; }
    if (Object.keys(tas).length) { for (const [a, b] of Object.entries(tas)) { girdi[b] = girdi[a]; delete girdi[a]; }
      try { fs.writeFileSync(gy, JSON.stringify(girdi, null, 1)); } catch {} log('Girdiler yeni panele taşındı'); X = HSh(girdi); } }
  // Satış hedefi (hedef tonajın %'si; kullanıcı 02.11.2026 12:37): seçili senaryonun yıllık hedefi (Girdiler B9) bu oranla ölçeklenir
  // paket 75+: panelin geçici anahtarları modele taşındı (asgari alım Ozet H15, finansman H41)
  { const R = X.sayfa('Ozet'), oz = (re) => { const i = R.findIndex((x) => x && typeof x[6] === 'string' && re.test(x[6])); return i > 0 ? 'Ozet!H' + i : null; };
    const tas = [['GTS!MinAylik', oz(/^Asgari aylık alım/)], ['GTS!FinansmanPrimde', oz(/^Stok ve alacak finansmanı/)], ['GTS!KambiyoHedge', oz(/^Kambiyo kur hedge/)]]; let d = false;
    for (const [a, b] of tas) if (b && a in girdi) { if (!(b in girdi)) girdi[b] = girdi[a]; delete girdi[a]; d = true; }
    // paket 83: Ozet 'Fiyatlama' girdisi 'COD + gün' yerine 'COD sonrası kotasyon sayısı' (1–20); eski 0 / negatif gün değeri geçersiz → model varsayılanı
    { const fk = oz(/^Fiyatlama: COD sonrası kotasyon sayısı/); if (fk && fk in girdi && !(typeof girdi[fk] === 'number' && girdi[fk] >= 1 && girdi[fk] <= 20)) { delete girdi[fk]; d = true; } }
    if (d) { try { fs.writeFileSync(gy, JSON.stringify(girdi, null, 1)); } catch {} log('Girdiler modeldeki yeni hücrelere taşındı'); X = HSh(girdi); } }
  const SY = 'GTS!SatisYuzde', sy = typeof girdi[SY] === 'number' ? girdi[SY] : 1; O.hedef = null;
  let HK = 'Girdiler!B9';   // paket 75+: B9 = ham hedef (B157) × satış yapılan pay → hedef yüzdesi ham hedefe uygulanır
  { const G0 = X.sayfa('Girdiler'), hh = G0.findIndex((x) => x && typeof x[0] === 'string' && /^Seçili motorin – ham hedef/.test(x[0])); if (hh > 0) HK = 'Girdiler!B' + hh;
    const r = +HK.slice(10), b9 = G0[r] && G0[r][0] && /^Seçili motorin/.test(G0[r][0]) ? G0[r][1] : null;
    if (typeof b9 === 'number') { O.hedef = { tam: b9, oran: sy };
      if (Math.abs(sy - 1) > 1e-9 && !(HK in girdi)) { log('Satış hedefi %' + Math.round(sy * 100) + ' ile yeniden hesaplanıyor'); X = HSh({ ...girdi, [HK]: b9 * sy }); } } }
  // Asgari müşteri alımı (kullanıcı 02.11.2026 17:01): aylık alımı eşiğin altındaki dağıtıcıya satış yok; satış onların payı kadar düşer
  const MA = 'GTS!MinAylik', esik = typeof girdi[MA] === 'number' ? girdi[MA] : 1000, ekG = {}; O.minAlim = null;
  { const MAm = require(path.join(resDir, 'min_alim.js')), R = X.sayfa('Ozet'), G0 = X.sayfa('Girdiler');
    const sat = (l) => { const r = R.find((x) => x && x[0] === l); return r && typeof r[1] === 'number' ? r[1] : 0; };
    const b9 = G0[9] && typeof G0[9][1] === 'number' ? G0[9][1] : null, b10 = G0[10] && typeof G0[10][1] === 'number' ? G0[10][1] : 0, bz = b10 > 0;
    const modelMA = R.some((x) => x && typeof x[6] === 'string' && /^Asgari aylık alım/.test(x[6])); O.minAlimModel = modelMA;
    const m = modelMA ? MAm.modelden((n) => { try { return X.sayfa(n); } catch { return null; } }, new Map(D.sir.map((r, i) => [r[1], i])), sat('Motorin satışı (t)'))
      : MAm.minAlim(O.akis, b9, sat('Motorin satışı (t)'), sat('Benzin satışı (t)'), esik, bz);
    O.minAlim = m || { esik, n: 0, sir: [] };
    if (m && m.n && b9 && !modelMA && !('Girdiler!B9' in girdi)) { ekG['Girdiler!B9'] = b9 * (1 - m.sM); if (bz && m.sB > 0 && !('Girdiler!B10' in girdi)) ekG['Girdiler!B10'] = b10 * (1 - m.sB);
      log(`Aylık ${Math.round(esik)} t altındaki ${m.n} dağıtıcı çıkarıldı; satış %${(m.sM * 100).toFixed(1)} düşük hesaplanıyor`);
      X = HSh({ ...girdi, ...(O.hedef && Math.abs(sy - 1) > 1e-9 ? { [HK]: O.hedef.tam * sy } : {}), ...ekG }); } }
  // Risk tablolarını kullanıcının girdileriyle yeniden hesapla (istek bayrağı Risk sekmesindeki düğmeden; sonuç önbellekte)
  { const IST = 'GTS!RiskHesapla', cy = path.join(path.dirname(gy), 'risk_hesap.json'), temel = {}; for (const [k, v] of Object.entries(girdi)) if (k !== IST) temel[k] = v;
    const anahtar = JSON.stringify(Object.keys(temel).sort().map((k) => [k, temel[k]])) + '|' + path.basename(xl.ad) + '|' + xb.length + '|netkar-tl-defter-1';
    let RH = null; try { const c = JSON.parse(fs.readFileSync(cy, 'utf8')); if (c && c.anahtar === anahtar) RH = c; else if (c) O.riskEski = c.zaman || true; } catch {}
    if (girdi[IST] || !RH) { const t0 = Date.now()   /* kullanıcı 03.11.2026: geçerli önbellek yoksa Risk tabloları kendiliğinden hesaplanır (tüm sayfalar aynı girdi ve net kâr tanımıyla) */, G0 = X.sayfa('Girdiler'), b9 = O.hedef ? O.hedef.tam : null, taban = {};
      for (const [k, v] of Object.entries(temel)) if (!k.startsWith('GTS!') || k === 'GTS!FinansmanPrimde') taban[k] = v;
      if (b9 && Math.abs(sy - 1) > 1e-9 && !(HK in taban)) taban[HK] = b9 * sy;
      Object.assign(taban, ekG);
      const bulB = (re) => { const i = G0.findIndex((x) => x && typeof x[0] === 'string' && re.test(x[0])); return i > 0 ? 'Girdiler!B' + i : null; };
      const LIM = bulB(/^İkinci liman uğrak maliyeti/), SEN = bulB(/^Fiyat senaryosu$/);
      // net kâr TL defter tanımıyla (kullanıcı 03.11.2026 22:31; pano.js V.tld ile aynı): + tahsilat kur farkı + kambiyo + kur hedge (beyanname → vade)
      const modelTLD = (Y) => { try { return Y.sayfa('Karlilik').some((x) => x && typeof x[0] === 'string' && /^KUR FARKI – YASAL DEFTER/.test(x[0].trim())); } catch { return false; } };
      const KBm = require(path.join(resDir, 'kambiyo.js')), hAc = GB.KH ? (taban[GB.KH.a] || girdi[GB.KH.a] || GB.KH.a0) === 'Açık' : (taban['GTS!KambiyoHedge'] || girdi['GTS!KambiyoHedge'] || 'Açık') === 'Açık';
      const nk = (Y) => { const R = Y.sayfa('Ozet'), r = R.find((x) => x && typeof x[0] === 'string' && /^Toplam: (net kâr|şirket sonucu) \(USD\)$/.test(x[0])); if (!r) return [null, null];
        const v = [r[1], r[2]]; if (modelTLD(Y)) return v; try { const KL = Y.sayfa('Karlilik'), t = KL.find((x) => x && typeof x[0] === 'string' && /^Tahsilat kur farkı/.test(x[0].trim())), K = KBm.kambiyo((n) => { try { return Y.sayfa(n); } catch { return null; } });
          if (t && K && K.yil) [2027, 2028].forEach((y, j) => { const k = K.yil[y] || {}; v[j] += (typeof t[j + 1] === 'number' ? t[j + 1] : 0) + (k.kusd || 0) + (hAc ? k.husd || 0 : 0); }); } catch {}
        return v; };
      const kos = []; for (const v of [0, 17]) for (const pk of [25, 30, 35, 40]) for (const l of [0, 60000]) kos.push(['Açık', pk, l, v]);
      kos.push(['Kapalı', 25, 60000, 17], ['Kapalı', 40, 60000, 17]);
      const izg = [], N = kos.length + 5; let n = 0;
      for (const [h, pk, l, v] of kos) { n++; log(`Risk tabloları hesaplanıyor ${n}/${N}`); const g = { ...taban, 'Ozet!H17': h, 'Ozet!H14': v, 'Ozet!H20': pk * 1000, 'Ozet!H21': pk * 1000 }; if (LIM) g[LIM] = l;
        try { const [a, b] = nk(HSh(g)); izg.push(['Sizin girdileriniz', h, pk, l, v, pr(a), pr(b), pr(a + b)]); } catch (e) { log('Izgara hatası: ' + e.message); } }
      const BT = [['Hedge kapalı', { 'Ozet!H17': 'Kapalı' }], ['ICE vadeli (tarihsel) – %100', { 'Ozet!H17': 'Açık', 'Ozet!H18': 1, 'Ozet!H23': 'ICE vadeli (tarihsel)' }], ['ICE vadeli (tarihsel) – %50', { 'Ozet!H17': 'Açık', 'Ozet!H18': 0.5, 'Ozet!H23': 'ICE vadeli (tarihsel)' }], ['Piyasa eğrisi (29.10.2026 eğim) – %100', { 'Ozet!H17': 'Açık', 'Ozet!H18': 1, 'Ozet!H23': 'Piyasa eğrisi' }], ['Düz kilit – %100', { 'Ozet!H17': 'Açık', 'Ozet!H18': 1, 'Ozet!H23': 'Düz' }]];
      const bt = []; if (SEN) for (const [ad, o] of BT) { n++; log(`Risk tabloları hesaplanıyor ${n}/${N}`); try { const [a, b] = nk(HSh({ ...taban, [SEN]: 'Tarihsel 2024–25', ...o })); bt.push([ad, pr(a / 1e6, 2), pr(b / 1e6, 2), pr((a + b) / 1e6, 2)]); } catch (e) { log('Tarihsel test hatası: ' + e.message); } }
      RH = { anahtar, zaman: new Date().toISOString(), sure: Math.round((Date.now() - t0) / 1000), izg, bt };
      try { fs.writeFileSync(cy, JSON.stringify(RH)); } catch {} delete girdi[IST]; try { fs.writeFileSync(gy, JSON.stringify(girdi, null, 1)); } catch {} O.riskEski = null; }
    O.riskHesap = RH ? { zaman: RH.zaman, sure: RH.sure, izg: RH.izg, bt: RH.bt } : null; }
  O.girdi = girdi; O.girdiYolu = gy; O.hesap = X.formul;
  const satir = (ad, a, b, mc) => { const R = X.sayfa(ad), out = []; const son = b || R.length - 1; for (let i = a; i <= son; i++) { const r = R[i] || []; const q = []; const n = mc || r.length; for (let j = 0; j < n; j++) q[j] = r[j] === undefined ? null : r[j]; out.push(q); } return out; };
  const R2 = (x, n = 0) => pr(x, n);
  const oz = satir('Ozet', 1, 83, 5);
  O.oz_bas = oz.slice(1, 4).map((x) => x[0]);
  O.oz = oz.slice(4).filter((x) => x[0] != null).map((x) => [x[0], R2(x[1], 2), R2(x[2], 2), R2(x[3], 2), x[4]]);
  O.tic = []; { const R = X.sayfa('Ozet'); let grpTL = false; for (let i = 5; i <= 45; i++) { const x = R[i]; if (!x || x[6] == null) continue; if (typeof x[6] === 'string' && /^Not:/.test(x[6])) { O.tic.push([x[6], null, null, null, null, 'not']); continue; } if (x[7] == null && x[8] == null && !X.formulMu('Ozet', 'H' + i)) grpTL = /TL\/m³/.test(x[6]); else if (grpTL && typeof x[6] === 'string' && !/TL\/m³|USD|\((t|%)\)/.test(x[6])) x[6] = x[6] + ' (TL/m³)'; const fm = X.formulMu('Ozet', 'H' + i), bas = x[7] == null && x[8] == null && !fm && !(('Ozet!H' + i) in girdi), ad = bas ? null : 'Ozet!H' + i, v = girdi['Ozet!H' + i] ?? x[7], dv = fm || bas ? null : X.dogrulama('Ozet', 'H' + i), tur = x[7] == null && x[8] == null && !fm ? '' : fm ? 'bilgi' : dv && dv.liste ? 'sec' : typeof v === 'string' && /^(Açık|Kapalı)$/.test(v) ? 'sec' : /\(%\)/.test(x[6]) || (/faizi/.test(x[6]) && typeof v === 'number' && v >= 0 && v < 1) ? 'yuzde' : /boş\s*=/.test(x[6]) ? 'bos' : ''; const ref = fm && /^\s*Girdiler!\$?B\$?(\d+)\s*$/.exec(X.formulMetni('Ozet', 'H' + i) || '');
    if (ref) { const ga = 'Girdiler!B' + ref[1], gd = X.dogrulama('Girdiler', 'B' + ref[1]), gv = girdi[ga] ?? x[7], go = X.orijinal('Girdiler', 'B' + ref[1]);
      O.tic.push([x[6], typeof gv === 'number' ? R2(gv, 4) : gv, String(x[8] || '').replace(/^Bilgi;?\s*/i, '').replace(/Girdiler B\d+'?[a-zçğıöşü]* değiştirilir\.?/i, '').trim() || null, typeof go === 'number' ? R2(go, 4) : go, ga, gd && gd.liste || /^(Açık|Kapalı)$/.test(String(gv)) ? 'sec' : /oranı|\(%\)/.test(x[6]) ? 'yuzde' : '', gd]); continue; }
    O.tic.push([x[6], typeof v === 'number' ? R2(v, 4) : v, x[8], fm || bas ? null : (o => typeof o === 'number' ? R2(o, 4) : o)(X.orijinal('Ozet', 'H' + i)), fm || bas ? null : ad, tur, dv, typeof x[10] === 'number' && typeof x[12] === 'number' ? { pay: R2(x[10], 4), usd: R2(x[11], 2), tl: R2(x[12], 1) } : null]); } }
  if (O.hedef) { const k = O.tic.findIndex((r) => r[4] === 'Ozet!H14'); O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['Satış hedefi (%)', R2(O.hedef.oran, 4), 'Seçili senaryonun yıllık hedef tonajı bu oranla ölçeklenir; mevsimsellik ve rampa aynen uygulanır.', 1, SY, 'yuzde', { tip: 'decimal', min: 0.1, max: 1.5, hata: '%10 ile %150 arası' }]); }
  if (!O.minAlimModel) { const k = O.tic.findIndex((r) => r[4] === SY || r[4] === 'Ozet!H14'); O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['Asgari müşteri alımı – aylık (t)', esik, 'Aylık alımı bu değerin altında kalan dağıtıcıya satış yapılmaz; motorin satışı onların payı kadar düşer. 0 = sınır yok.', 1000, MA, '', { tip: 'decimal', min: 0, max: 20000, hata: '0 ile 20.000 t arası' }]); }
  // Müşteri davranışı: bayi kotası (Girdiler; Ozet panelinde yok) – kullanıcı 02.11.2026 11:29
  { const G = X.sayfa('Girdiler'), i = G.findIndex((x) => x && typeof x[0] === 'string' && /^Bayi kotası/.test(x[0]));
    if (i > 0 && !X.formulMu('Girdiler', 'B' + i)) { const ad = 'Girdiler!B' + i, v = girdi[ad] ?? G[i][1], o = X.orijinal('Girdiler', 'B' + i);
      O.tic.push(['Müşteri davranışı', null, null]);
      O.tic.push(['Bayi kotası – zam beklentisinde azami ek alım (%)', typeof v === 'number' ? R2(v, 4) : v, 'Zam beklentisinde bayi normal gününün en çok bu kadar fazlasını alabilir (piyasa geneli kota; fazlası başka tedarikçiye gitmez). Girdiler B' + i + '.', typeof o === 'number' ? R2(o, 4) : o, ad, 'yuzde', X.dogrulama('Girdiler', 'B' + i) || { tip: 'decimal', min: 0, max: 10, hata: '%0 ile %1.000 arası' }]); } }
  { const G = X.sayfa('Girdiler'), bul = (l) => G.findIndex((x) => x && x[0] === l), b38 = bul("Motorin – GTS'de tahliye (t), boş = tam kargo"), b153 = bul('2027 motorin GTS partisi (t), boş = B40');
    if (b38 > 0 && b153 > 0 && !X.formulMu('Girdiler', 'B' + b38)) { O.tic.push(['Gemi ve parti', null, null]);
      O.tic.push(['Motorin GTS partisi (t)', R2(girdi['Girdiler!B' + b38] ?? G[b38][1]), 'Her kargoda GTS\'de tahliye edilen motorin; geminin kalanı ikinci limana gider. 2027 partisi boşsa iki yıl için de geçerli. Girdiler B' + b38 + '.', R2(X.orijinal('Girdiler', 'B' + b38)), 'Girdiler!B' + b38]);
      O.tic.push(['2027 motorin GTS partisi (t)', (() => { const v = girdi['Girdiler!B' + b153] ?? G[b153][1]; return v == null || v === '' ? null : R2(v); })(), 'Yalnız 2027 kargoları için; boş = yukarıdaki parti. Girdiler B' + b153 + '.', null, 'Girdiler!B' + b153, 1]); } }
  // TL finansman faizi (kullanıcı 02.11.2026 17:43): Genel bakışta değiştirilebilir; satış vadesinin arkasına
  { const G = X.sayfa('Girdiler'), i = G.findIndex((x) => x && x[0] === 'TL finansman faizi (yıllık)');
    if (i > 0 && !X.formulMu('Girdiler', 'B' + i)) { const k = O.tic.findIndex((r) => /^Satış vadesi/.test(r[0])), v = G[i][1], o = X.orijinal('Girdiler', 'B' + i);
      O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['TL faizi – yıllık (%)', typeof v === 'number' ? R2(v, 4) : v, 'ÖTV/KDV nakdinin ve TL finansmanının yıllık faizi; İthalat vergi avantajını belirler. Girdiler B' + i + '.', typeof o === 'number' ? R2(o, 4) : o, 'Girdiler!B' + i, 'yuzde', X.dogrulama('Girdiler', 'B' + i) || { tip: 'decimal', min: 0, max: 2, hata: '%0 ile %200 arası' }]); } }
  // paket 75+: faizler Ozet H39/H40'ta (model) → yalnız forward maliyeti bilgisi eklenir
  { const G = X.sayfa('Girdiler'), gb = (l) => { const i = G.findIndex((x) => x && x[0] === l); return i > 0 ? G[i][1] : null; }, k = O.tic.findIndex((r) => /^USD faizi – forward/.test(r[0]));
    if (!FW && k >= 0) O.tic.splice(k + 1, 0, ['Forward maliyeti (kur hedge)', null, 'Faiz paritesi: forward = spot × (1 + TL faizi × vade/365) / (1 + USD faizi × vade/360) × (1 + banka marjı); vade = satış vadesi.', null, 'GTS!ForwardBilgi', 'bilgi', { tl: R2(gb('TL finansman faizi (yıllık)'), 4), usd: R2(gb('Forward için USD faizi (yıllık)'), 4), marj: R2(gb('Forward banka marjı') || 0, 4) }]); }
  if (FW && FW.fu) { const k = O.tic.findIndex((r) => /^TL faizi/.test(r[0])), G = X.sayfa('Girdiler'), v = G[FW.fu][1], tl = G[FW.tl][1], m = FW.fm ? G[FW.fm][1] : 0;
    O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['USD faizi – yıllık (%)', typeof v === 'number' ? R2(v, 4) : v, 'Kur hedge forward\'ının USD faizi; forward TL faizi yukarıdaki TL faizidir. Girdiler B' + FW.fu + '.', typeof FW.fu0 === 'number' ? R2(FW.fu0, 4) : FW.fu0, 'Girdiler!B' + FW.fu, 'yuzde', X.dogrulama('Girdiler', 'B' + FW.fu) || { tip: 'decimal', min: 0, max: 1, hata: '%0 ile %100 arası' }],
      ['Forward maliyeti (kur hedge)', null, 'Faiz paritesi: forward = spot × (1 + TL faizi × vade/365) / (1 + USD faizi × vade/360) × (1 + banka marjı); vade = satış vadesi. Girdiler B' + FW.ft + ' = TL faizi.', null, 'GTS!ForwardBilgi', 'bilgi', { tl: R2(tl, 4), usd: R2(v, 4), marj: R2(m || 0, 4) }]); }
  { const k = O.tic.findIndex((r) => /^Alım primi \/ iskontosu – motorin/.test(r[0])), v = girdi['GTS!FinansmanPrimde'] || 'Alım priminde';
    if (GB.FR.length) O.tic.splice(k >= 0 ? k + 1 : 0, 0, ['Stok ve alacak finansmanı', v, 'Kargonun stokta kaldığı ve müşteri vadesindeki günlerin USD faizi. Alım priminde: tedarikçi fiyatına dahil, model ayrıca hesaplamaz (kullanıcı 02.11.2026). Ayrıca hesapla: kargo bedeli × USD finansman faizi (Girdiler B47) × gün.', 'Alım priminde', 'GTS!FinansmanPrimde', 'sec', { tip: 'list', liste: ['Alım priminde', 'Ayrıca hesapla'] }]); }
  // USD borçlanma faizi (kullanıcı 02.11.2026 18:01): hedge teminat finansmanı ve 'Ayrıca hesapla' seçiliyse kargo finansmanı
  { const G = X.sayfa('Girdiler'), i = G.findIndex((x) => x && x[0] === 'Finansman faizi (yıllık, USD)');
    if (i > 0 && !X.formulMu('Girdiler', 'B' + i)) { let k = O.tic.findIndex((r) => r[4] === 'GTS!ForwardBilgi'); if (k < 0) k = O.tic.findIndex((r) => /^USD faizi|^TL faizi/.test(r[0])); const v = G[i][1], o = X.orijinal('Girdiler', 'B' + i);
      O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['USD borçlanma faizi – yıllık (%)', typeof v === 'number' ? R2(v, 4) : v, 'Hedge teminatının (initial margin) finansmanı; stok ve alacak finansmanı "Ayrıca hesapla" seçiliyse kargo finansmanı da bu faizle. Girdiler B' + i + '.', typeof o === 'number' ? R2(o, 4) : o, 'Girdiler!B' + i, 'yuzde', X.dogrulama('Girdiler', 'B' + i) || { tip: 'decimal', min: 0, max: 1, hata: '%0 ile %100 arası' }]); } }
  // kambiyonun karşılığı kur hedge (kullanıcı 03.11.2026 22:31): net kâr TL defter mantığıyla – panelde hesaplanır, model yeniden hesaplanmaz
  if (!O.tic.some((r) => /^Kambiyo kur hedge/.test(r[0]))) { const k = O.tic.findIndex((r) => /^Forward maliyeti/.test(r[0])), v = girdi['GTS!KambiyoHedge'] || 'Açık';
    O.tic.splice(k >= 0 ? k + 1 : O.tic.length, 0, ['Kur hedge – beyanname → fatura vadesi', v, 'Beyanname günü fatura vadesine forward USD alınır; kambiyo kârı/zararının karşılığı. Ödeme beyannameden önceyse (COD) korunacak borç yok, sonuç 0.', 'Açık', 'GTS!KambiyoHedge', 'sec', { tip: 'list', liste: ['Açık', 'Kapalı'] }]); }
  // tek kur hedge anahtarı (kullanıcı 03.11.2026 19:29): alış tarafı satırı gösterilmez, 'Kur hedge' ikisini birlikte yönetir (girdi_bag.js)
  if (GB.KH) { O.tic = O.tic.filter((r) => !(r[4] === GB.KH.b || r[4] === 'GTS!KambiyoHedge' || /^Kambiyo kur hedge|^Kur hedge – beyanname/.test(r[0])));
    const r = O.tic.find((x) => x[4] === GB.KH.a); if (r) r[2] = 'Tek anahtar: satış tahsilatı (fatura → tahsilat) ve alış (beyanname → fatura vadesi forward) kur hedge\'i birlikte açılır / kapanır.'; }
  // kargo yaşam döngüsü (kullanıcı 03.11.2026 16:50)
  try { O.satis = require(path.join(resDir, 'satis.js')).satislar((n) => { try { return X.sayfa(n); } catch { return null; } }); } catch (e) { O.satis = null; log('Satışlar raporu: ' + e.message); }
  try { O.kargo = require(path.join(resDir, 'kargo_omur.js')).omur((n) => { try { return X.sayfa(n); } catch { return null; } }); } catch (e) { O.kargo = null; log('Kargo yaşam döngüsü: ' + e.message); }
  // yasal defter görünümü – kambiyo (kullanıcı 02.11.2026 20:04)
  try { O.kambiyo = require(path.join(resDir, 'kambiyo.js')).kambiyo((n) => { try { return X.sayfa(n); } catch { return null; } }); } catch (e) { O.kambiyo = null; log('Kambiyo hesabı: ' + e.message); }
  O.gir = satir('Girdiler', 1, Math.min(220, X.sayfa('Girdiler').length - 1), 3).filter((x) => x[0] != null).map((x) => [x[0], x[1], x[2]]);
  const gunluk = (ad) => satir(ad, 4).filter((r) => serial(r[0])).map((r) => [R2(r[2] || 0), R2(r[6] || 0), R2(r[7] || 0), R2(r[9] || 0), R2(r[10] || 0), R2(r[17] || 0), R2(r[18] || 0, 4), R2(r[22] || 0), R2(r[23] || 0)]);
  O.g0 = tarih(satir('Motorin_Gunluk', 4).find((r) => serial(r[0]))[0]);
  O.gm = gunluk('Motorin_Gunluk'); O.gb = gunluk('Benzin_Gunluk');
  const hdr = satir('Fiyatlar', 4, 4)[0], ix = {}; hdr.forEach((h, i) => { if (h) ix[h] = i; });
  const t2027 = Date.UTC(2027, 0, 1) / 864e5 + 25569;
  O.sn = ['Baz', 'Ayı', 'Boğa', 'Makul', 'Tarihsel 2024–25'].filter((x) => ix[`${x} · CIF motorin Yol`] != null);
  O.fiy = satir('Fiyatlar', 5).filter((r) => serial(r[0]) && r[0] >= t2027 - 0.5).map((r) => { const row = [R2(r[1], 1), R2(r[2], 1), R2(r[3], 3), R2(r[6], 1), R2(r[7], 1), R2(r[8]), R2(r[9])];
    for (const s of O.sn) for (const p of ['P10', 'P50', 'P90', 'Yol']) row.push(R2(r[ix[`${s} · CIF motorin ${p}`]], 1));
    for (const s of O.sn) for (const p of ['P10', 'P50', 'P90', 'Yol']) row.push(R2(r[ix[`${s} · USD/TRY ${p}`]], 3));
    return row; });
  const kargo = (ad) => { const HB = (X.sayfa(ad)[4] || []).findIndex((h) => typeof h === 'string' && /^Baz etkisi/.test(h)), HF = (X.sayfa(ad)[4] || []).findIndex((h) => typeof h === 'string' && /^Fiyatlama bitişi/.test(h)); return satir(ad, 4).filter((r) => typeof r[0] === 'number' && r[1] === 1).map((r) => [r[0], r[2], R2(r[3]), tarih(r[4]), tarih(r[39]), tarih(r[13]), tarih(r[14]), R2(r[15]), R2(r[16], 1), R2(r[6], 1), R2(r[9], 1), R2(r[18], 1), R2(r[20]), R2(r[21]), R2(r[31]), R2(r[17]), R2(r[10] || 0), R2(r[25] || 0), R2(r[26] || 0), R2(r[29] || 0), R2(r[30] || 0), R2(r[36] || 0), R2(r[37] || 0), tarih(r[5]), R2(r[27], 1), R2(r[28], 1), R2(r[38], 3), R2(r[22], 3), R2(r[33], 3), R2(r[34], 3), R2(r[35] || 0), R2(r[32], 1), typeof r[45] === 'number' ? R2(r[45]) : null, typeof r[47] === 'number' ? R2(r[47], 6) : null, HB >= 0 && typeof r[HB] === 'number' ? R2(r[HB]) : null, HF >= 0 ? tarih(r[HF]) : null]); };
  O.km = kargo('Motorin_Kargolar'); O.kb = kargo('Benzin_Kargolar');
  O.vn = satir('Vergi_Nakit', 4).filter((r) => serial(r[0])).map((r) => [R2((r[13] || 0) / 1e6), R2((r[24] || 0) / 1e6)]);
  /* Nakit akışı (kullanıcı 09.11.2026 20:11 "ekle"; paket 105+ Nakit_Akisi): gün → M TL [satış tahsilatı, ÖTV tahsilatı, KDV tahsilatı, kargo ödemesi,
     ÖTV devlete, ithalat KDV, KDV beyanı, teminat komisyonu, beyanname gideri, faaliyet giderleri, ürün hedge, kur hedge, kümülatif bakiye], kargo USD (M $) ve kur */
  try { if (X.sayfa('Nakit_Akisi')) { const H = X.sayfa('Nakit_Akisi')[4] || [], c = (re) => H.findIndex((h) => typeof h === 'string' && re.test(h));
      const K = [/^Satış tahsilatı/, /^ÖTV tahsilatı/, /^KDV tahsilatı/, /^Kargo ödemesi \(TL/, /^ÖTV – devlete/, /^İthalat KDV/, /^KDV beyanı/, /^Teminat komisyonu/, /^İthalat beyannamesi gideri/, /^Faaliyet giderleri/, /^Ürün hedge/, /^Kur hedge/, /^Kümülatif nakit bakiyesi \(TL/].map(c), ku = c(/^USD\/TRY/), ku$ = c(/^Kargo ödemesi \(USD/);
      if (K.every((i) => i >= 0)) { const R = satir('Nakit_Akisi', 5).filter((r) => serial(r[0]));
        O.nakit = { g0: tarih(R[0][0]), g: R.map((r) => K.map((i) => R2((r[i] || 0) / 1e6, 2))), kur: R.map((r) => R2(r[ku], 4)), usd: R.map((r) => R2((r[ku$] || 0) / 1e6, 3)) }; } } } catch (e) { O.nakit = null; log('Nakit akışı: ' + (e && e.message)); }
  /* Dağıtıcı geçiş kuralı (paket 109+ Gecis; kullanıcı 09.11.2026 21:25): dağıtıcı × il × bugünkü kaynak terminal → GTS avantajı ve geçiyor (girdilerle canlı).
     r: [şirket idx, il adı, kaynak terminal idx, potansiyel t, Leg2 bugün km, Leg2 GTS km, alternatif teslim − Tüpraş, GTS teslim − Tüpraş, avantaj TL/m³, geçiyor 0/1] */
  try { const GS = X.sayfa('Gecis'); if (GS) { const hi = GS.findIndex((x) => x && x[0] === 'Şirket' && x[1] === 'Şirket ID'), H = GS[hi] || [], c = (re) => H.findIndex((h) => typeof h === 'string' && re.test(h));
      const K = { id: 1, il: 2, tid: c(/^Terminal ID/), pot: c(/^Potansiyel hacim/), kb: c(/^Leg2 bugün/), kg: c(/^Leg2 GTS/), at: c(/^Alternatif bölgeye teslim/), gt: c(/^GTS bölgeye teslim/), av: c(/^GTS avantajı/), ge: c(/^Geçiyor/) };
      if (hi > 0 && Object.values(K).every((i) => i >= 0)) { const si = new Map(D.sir.map((r, i) => [r[0], i])), ti = new Map(D.term.map((r, i) => [r[0], i])), R = [];
        for (let i = hi + 1; i < GS.length; i++) { const x = GS[i]; if (!x || typeof x[K.id] !== 'string' || typeof x[K.pot] !== 'number') continue;
          R.push([si.has(x[K.id]) ? si.get(x[K.id]) : -1, x[K.il], ti.has(x[K.tid]) ? ti.get(x[K.tid]) : -1, R2(x[K.pot]), R2(x[K.kb], 1), R2(x[K.kg], 1), R2(x[K.at], 1), R2(x[K.gt], 1), R2(x[K.av], 1), x[K.ge] ? 1 : 0]); }
        const OZ = X.sayfa('Ozet') || [], es = OZ.find((x) => x && typeof x[6] === 'string' && /geçiş eşiği/i.test(x[6]));
        O.gecis = { r: R, esik: es && typeof es[7] === 'number' ? es[7] : null }; } } } catch (e) { O.gecis = null; log('Geçiş kuralı: ' + (e && e.message)); }
  O.tplan = satir('Tank_Plani', 4, 18, 4).filter((x) => typeof x[0] === 'number').map((x) => [x[0], x[1], x[2], x[3]]);
  O.tank = []; for (const r of satir('Tank', 3)) { if (!serial(r[0])) continue; O.tank.push([R2(r[1]), R2(r[4]), R2(r[8]), R2(r[11])]); if (!O.tkap) O.tkap = [R2(r[2]), R2(r[5]), R2(r[9]), R2(r[12])]; }
  O.vad = satir('Vadeli', 5, Math.min(40, X.sayfa('Vadeli').length - 1), 9).filter((x) => serial(x[0])).map((x) => [tarih(x[0]), R2(x[2], 1), R2(x[3], 1), R2(x[6], 1), R2(x[7], 3)]);
  { const HL = ['Ürün hedge','Motorin ürün hedge oranı','Benzin ürün hedge oranı (ICE Gasoil ile çapraz)','ICE Gasoil işlem maliyeti (USD/t; borsa + takas + komisyon + kayma, gidiş-dönüş)','Teminat (initial margin) oranı','Kur hedge','Kur hedge oranı','Forward banka marjı']; O.hgir = []; const G = X.sayfa('Girdiler'); for (let i = 1; i < G.length; i++) { const x = G[i]; if (x && HL.includes(x[0])) { const f = X.formulMetni('Girdiler', 'B' + i), m = f && /^=?\s*Ozet!\$?H\$?(\d+)\s*$/.exec(f), adr = m ? 'Ozet!H' + m[1] : 'Girdiler!B' + i; O.hgir.push([x[0], adr, x[1], m ? X.orijinal('Ozet', 'H' + m[1]) : X.orijinal('Girdiler', 'B' + i)]); } } }
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
  // İki yıllık ızgara ve Monte Carlo (net kâr = net marj − vergi, USD)
  const csvBul = (f) => { const x = Z.bul(new RegExp('(^|/)' + f.replace(/\./g, '\\.') + '$'))[0]; return x ? csvOku(Z.oku(x).toString('utf8')).filter((r) => !r.err || r.err === '0') : []; };
  O.izg = csvBul('gts_makul_izgara_2yil.csv').map((r) => [r.sen, r.hedge, Number(r.parti_kt), Number(r.ikinci_liman), Number(r.vade), pr(Number(r.netv_2027)), pr(Number(r.netv_2028)), pr(Number(r.toplam_2y))]);
  { const gg = new Map(), tld = csvBul('gts_mc_2yil_tld.csv'); O.mc2Tanim = tld.length ? 'tld' : 'eski';   // paket 78+: MC TL defter net kâr tanımıyla (PDM)
    if (tld.length) for (const r of tld) { const k = r.sen + '|varsayılan girdiler · TL defter'; (gg.get(k) || gg.set(k, []).get(k)).push([Number(r.net_2027), Number(r.net_2028)]); }
    else for (const r of csvBul('gts_mc_2yil_eski_fiyat.csv')) { const k = r.sen + '|' + r.cfg; (gg.get(k) || gg.set(k, []).get(k)).push([Number(r.netv_2027), Number(r.netv_2028)]); }
    const oz = (v) => { v = [...v].sort((p, q) => p - q); const n = v.length, q = (p) => v[Math.min(n - 1, Math.max(0, pr(p * (n - 1))))]; return [pr(v.reduce((p, c) => p + c, 0) / n), pr(q(0.1)), pr(q(0.5)), pr(q(0.9)), pr(v.filter((z) => z < 0).length / n, 3)]; };
    O.mc2 = [...gg].map(([k, v]) => { const [s, c] = k.split('|'); return [s, c, v.length, oz(v.map((x) => x[0])), oz(v.map((x) => x[1])), oz(v.map((x) => x[0] + x[1]))]; }); }
  // Karlılık tablosu (Excel Karlilik sayfası)
  O.kartab = null; try { if (X.sayfalar.includes('Karlilik')) { const K = X.sayfa('Karlilik'), rows = [];
    for (let i = 6; i < K.length; i++) { const r = K[i]; if (!r || typeof r[0] !== 'string' || !r[0].trim()) continue; rows.push([r[0], ...[1, 2, 3, 4, 5].map((j) => (typeof r[j] === 'number' ? pr(r[j], 4) : null)), r[6] || null]); }
    if (rows.length) O.kartab = { bas: K[2] && K[2][0], not: K[3] && K[3][0], rows }; } } catch (e) { O.kartab = null; }
  // Hedge kalibrasyonu ve tarihsel geriye dönük test (Hedge_Kalibrasyon sayfası, sabit değerler)
  O.hkal = null; try { const H = X.sayfa('Hedge_Kalibrasyon'); if (H) O.hkal = hkalOku(H.map((r) => (r || []).slice(0, 10))); } catch (e) { O.hkal = null; }
  // Kararlar: README'deki GTS bölüm başlıkları (kullanıcı kararları tarihleriyle)
  O.karar = [];
  const rd = Z.bul(/(^|\/)README[^/]*\.md$/i)[0];
  if (rd) { const t = Z.oku(rd).toString('utf8'), i0 = t.search(/^## .*GTS/m);
    if (i0 >= 0) for (const m of t.slice(i0).matchAll(/^## (.+)$/gm)) { const h = m[1].trim(); if (!(/GTS|kullanıcı|hedge/i.test(h)) || /FACT_|düzeltme/i.test(h)) continue; const d = /(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{1,2}:\d{2}))?/.exec(h);
      O.karar.push([d ? `${d[1]}.${d[2]}${d[4] ? ' ' + d[4] : ''}` : '', h.replace(/\s*\((?:PDM|kullanıcı)[^)]*\)/g, '').replace(/\s+–\s+SENARYO.*$/, '').trim()]); } }
  log('Hazır');
  return O;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { run, zipAc, xlsxAc, girdiYolu };
