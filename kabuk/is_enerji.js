'use strict';
/* Enerji Akış veri hattı iş parçacığı: workerData {db: .db ya da teslimat .zip yolu, kok, surum} */
const { parentPort, workerData: W } = require('worker_threads');
const path = require('path'), fs = require('fs');
(async () => {
  try {
    const SQL = await require('sql.js')();
    const P = require(path.join(W.kok, 'pipeline.js'));
    let buf = fs.readFileSync(W.db);
    if (buf.readUInt32LE(0) === 0x04034b50) { const Z = require('./zip.js').zipAc(buf), x = Z.g.filter((x) => /\.(db|sqlite3?)$/i.test(x.ad)).sort((a, b) => b.cs - a.cs)[0];
      if (!x) throw new Error('Zip içinde veritabanı (.db) yok.'); parentPort.postMessage({ ilerleme: 'Veritabanı zip içinden açılıyor' }); buf = Z.oku(x); }
    const r = P.run(SQL, buf, path.join(W.kok, 'res'), (m) => parentPort.postMessage({ ilerleme: m }));
    const geo = JSON.parse(fs.readFileSync(path.join(W.kok, 'res', 'tr_svg.json'), 'utf8'));
    parentPort.postMessage({ data: r.data, tahsis: r.tahsis, geo, meta: { surum: W.surum, ad: path.basename(W.db), mtime: fs.statSync(W.db).mtimeMs } });
  } catch (e) { parentPort.postMessage({ hata: e && e.message || String(e) }); }
})();
