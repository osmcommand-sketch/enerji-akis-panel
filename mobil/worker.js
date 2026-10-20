'use strict';
/* Telefonda veri hattı: zip → SQLite → panel verisi (masaüstü uygulamasının worker.js'i ile aynı iş) */
importScripts('sql-wasm.js', 'pipeline.js');
const U32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216;
const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u64 = (b, i) => U32(b, i) + U32(b, i + 4) * 4294967296;
async function zipIcinden(buf) {
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (U32(buf, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Zip dosyası okunamadı (bozuk ya da eksik indirilmiş olabilir).');
  let n = u16(buf, e + 10), cd = U32(buf, e + 16);
  if (cd === 0xFFFFFFFF || n === 0xFFFF) { if (U32(buf, e - 20) !== 0x07064b50) throw new Error('Zip64 okunamadı.'); const l = u64(buf, e - 12); n = u64(buf, l + 32); cd = u64(buf, l + 48); }
  const td = new TextDecoder(), g = [];
  for (let i = 0, p = cd; i < n; i++) {
    if (U32(buf, p) !== 0x02014b50) break;
    const met = u16(buf, p + 10); let cs = U32(buf, p + 20), us = U32(buf, p + 24); const fl = u16(buf, p + 28), xl = u16(buf, p + 30), kl = u16(buf, p + 32); let lo = U32(buf, p + 42);
    const ad = td.decode(buf.subarray(p + 46, p + 46 + fl));
    if (cs === 0xFFFFFFFF || us === 0xFFFFFFFF || lo === 0xFFFFFFFF) { let x = p + 46 + fl; const xe = x + xl;
      while (x < xe) { const id = u16(buf, x), sz = u16(buf, x + 2); if (id === 1) { let q = x + 4; if (us === 0xFFFFFFFF) { us = u64(buf, q); q += 8; } if (cs === 0xFFFFFFFF) { cs = u64(buf, q); q += 8; } if (lo === 0xFFFFFFFF) lo = u64(buf, q); } x += 4 + sz; } }
    g.push({ ad, met, cs, lo }); p += 46 + fl + xl + kl;
  }
  const db = g.filter((x) => /\.(db|sqlite3?)$/i.test(x.ad) && !/__MACOSX/.test(x.ad)).sort((a, b) => b.cs - a.cs)[0];
  if (!db) {
    if (g.some((x) => x.ad.startsWith('xl/'))) throw new Error('Bu dosya bir Excel tablosu. Veritabanı zip\'ini (enerji_master_2025_db_….zip) seçin.');
    if (g.some((x) => /\.py$/.test(x.ad))) throw new Error('Bu zip ETL kodunu içeriyor. Veritabanı zip\'ini (enerji_master_2025_db_….zip) seçin.');
    throw new Error('Zip içinde .db dosyası yok.');
  }
  const h = db.lo, veri = h + 30 + u16(buf, h + 26) + u16(buf, h + 28), ham = buf.subarray(veri, veri + db.cs);
  if (db.met === 0) return { ad: db.ad.split('/').pop(), buf: ham.slice() };
  if (db.met !== 8) throw new Error('Zip sıkıştırma yöntemi desteklenmiyor (' + db.met + ').');
  if (typeof DecompressionStream === 'undefined') throw new Error('Bu tarayıcı zip açamıyor. Zip içindeki .db dosyasını çıkarıp onu seçin ya da tarayıcıyı güncelleyin.');
  const out = new Uint8Array(await new Response(new Blob([ham]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
  return { ad: db.ad.split('/').pop(), buf: out };
}
onmessage = async (e) => {
  try {
    let buf = new Uint8Array(e.data.buf), icAd = null;
    if (U32(buf, 0) === 0x04034b50) { postMessage({ tip: 'log', m: 'Zip açılıyor' }); const z = await zipIcinden(buf); buf = z.buf; icAd = z.ad; }
    if (new TextDecoder().decode(buf.subarray(0, 15)) !== 'SQLite format 3') throw new Error('Bu dosya bir SQLite veritabanı değil. PDM teslimatındaki enerji_master_2025_db_….zip dosyasını seçin.');
    postMessage({ tip: 'log', m: 'SQLite hazırlanıyor' });
    const SQL = await initSqlJs({ locateFile: (f) => f });
    const res = {}; for (const f of ['terminal_depo_koordinat.csv', 'ilce_koordinat.csv']) res[f] = await (await fetch('res/' + f)).text();
    let lpg = null;
    if (e.data.lpg) { postMessage({ tip: 'log', m: 'LPG veritabanı açılıyor' }); lpg = new Uint8Array(e.data.lpg);
      if (U32(lpg, 0) === 0x04034b50) lpg = (await zipIcinden(lpg)).buf;
      if (new TextDecoder().decode(lpg.subarray(0, 15)) !== 'SQLite format 3') throw new Error('LPG dosyası bir SQLite veritabanı değil (lpg_tr_db_….zip seçin).'); }
    const r = EnerjiPipeline.run(SQL, buf, res, (m) => postMessage({ tip: 'log', m }), lpg ? { lpg, lpgAd: e.data.lpgAd } : {});
    postMessage({ tip: 'bitti', r: { data: r.data, tahsis: r.tahsis, icAd } });
  } catch (err) { postMessage({ tip: 'hata', m: String((err && err.message) || err) }); }
};
