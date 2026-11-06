'use strict';
/* GTS Dörtyol veri hattı iş parçacığı: workerData {db: paket yolu, kok: içerik klasörü, ud} */
const { parentPort, workerData: W } = require('worker_threads');
const path = require('path'), fs = require('fs');
(async () => {
  try {
    process.env.GTS_GIRDI_DIR = W.ud;   // girdiler.json kullanıcı klasöründe (sürüm klasöründen bağımsız)
    const SQL = await require('sql.js')();
    const G = require(path.join(W.kok, 'gts_pipeline.js'));
    if (!/\.zip$/i.test(W.db)) throw new Error('GTS panosu PDM teslimat paketini (Enerji_Master_DB_2026_paket_NN.zip) açar.');
    const r = G.run(SQL, fs.readFileSync(W.db), path.join(W.kok, 'res'), (m) => parentPort.postMessage({ ilerleme: m }), { kok: W.kok });
    parentPort.postMessage({ data: r.data || r });
  } catch (e) { parentPort.postMessage({ hata: e && e.message || String(e) }); }
})();
