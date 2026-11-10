'use strict';
/* Kanal manifestini üretir ve imzalar: node kabuk/yayinla.js <kanal klasörü: . | gts> <sürüm> "<notlar>" <özel anahtar.pem>
   Dosya listesi mevcut manifestten alınır; her dosyanın SHA-256 özeti yeniden hesaplanır; imza manifest.json baytları üzerinde Ed25519. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [kanal, surum, notlar, anahtar] = process.argv.slice(2);
const kok = path.resolve(__dirname, '..', kanal), eski = JSON.parse(fs.readFileSync(path.join(kok, 'manifest.json'), 'utf8'));
const M = { ...(eski.uygulama ? { uygulama: eski.uygulama } : {}), surum, kabuk: 2, tarih: new Date(Date.now() + 3 * 3600e3).toISOString().replace(/\.\d+Z$/, '+03:00'), notlar, dosyalar: {} };
// imzadan önce sözdizimi denetimi (1.0.93 dersi): kanaldaki her .js ayrışmalı
{ const vm = require('vm'); for (const f of Object.keys(eski.dosyalar)) if (f.endsWith('.js')) { try { new vm.Script(fs.readFileSync(path.join(kok, f), 'utf8'), { filename: f }); } catch (e) { console.error('SÖZDİZİMİ HATASI – imzalanmadı:', f, e.message); process.exit(2); } } }
for (const f of Object.keys(eski.dosyalar)) M.dosyalar[f] = crypto.createHash('sha256').update(fs.readFileSync(path.join(kok, f))).digest('hex');
const mb = Buffer.from(JSON.stringify(M, null, 1));
const sig = crypto.sign(null, mb, crypto.createPrivateKey(fs.readFileSync(anahtar)));
const pub = crypto.createPublicKey(crypto.createPrivateKey(fs.readFileSync(anahtar)));
if (!crypto.verify(null, mb, pub, sig)) throw new Error('imza doğrulanamadı');
fs.writeFileSync(path.join(kok, 'manifest.json'), mb); fs.writeFileSync(path.join(kok, 'manifest.sig'), sig.toString('base64') + '\n');
console.log(kanal, surum, Object.keys(M.dosyalar).length, 'dosya imzalandı');
