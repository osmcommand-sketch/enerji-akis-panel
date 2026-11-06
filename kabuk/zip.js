'use strict';
/* Teslimat zip'inden en büyük .db dosyasını çıkarır (zip64 dahil). */
const zlib = require('zlib');
function zipAc(buf) {
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('Zip dosyası okunamadı (bozuk ya da eksik indirilmiş olabilir).');
  let n = buf.readUInt16LE(e + 10), cd = buf.readUInt32LE(e + 16);
  if (cd === 0xFFFFFFFF || n === 0xFFFF) { const l = buf.readUInt32LE(e - 20) === 0x07064b50 ? Number(buf.readBigUInt64LE(e - 12)) : -1; if (l < 0) throw new Error('Zip64 okunamadı.'); n = Number(buf.readBigUInt64LE(l + 32)); cd = Number(buf.readBigUInt64LE(l + 48)); }
  const g = [];
  for (let i = 0, p = cd; i < n; i++) { if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const met = buf.readUInt16LE(p + 10); let cs = buf.readUInt32LE(p + 20), us = buf.readUInt32LE(p + 24); const fl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32);
    let lo = buf.readUInt32LE(p + 42); const ad = buf.toString('utf8', p + 46, p + 46 + fl);
    if (cs === 0xFFFFFFFF || us === 0xFFFFFFFF || lo === 0xFFFFFFFF) { let x = p + 46 + fl; const xe = x + xl;
      while (x < xe) { const id = buf.readUInt16LE(x), sz = buf.readUInt16LE(x + 2); if (id === 1) { let q = x + 4; if (us === 0xFFFFFFFF) { us = Number(buf.readBigUInt64LE(q)); q += 8; } if (cs === 0xFFFFFFFF) { cs = Number(buf.readBigUInt64LE(q)); q += 8; } if (lo === 0xFFFFFFFF) lo = Number(buf.readBigUInt64LE(q)); } x += 4 + sz; } }
    g.push({ ad, met, cs, lo }); p += 46 + fl + xl + kl; }
  const oku = (x) => { const h = x.lo, v = h + 30 + buf.readUInt16LE(h + 26) + buf.readUInt16LE(h + 28), ham = buf.subarray(v, v + x.cs);
    if (x.met === 0) return Buffer.from(ham); if (x.met === 8) return zlib.inflateRawSync(ham); throw new Error('Zip sıkıştırma yöntemi desteklenmiyor (' + x.met + ').'); };
  return { g: g.filter((x) => !/__MACOSX|\/$/.test(x.ad)), oku };
}
module.exports = { zipAc };
