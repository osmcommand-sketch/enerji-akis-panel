'use strict';
/* Masaüstü kabuğu (Enerji Akış ve GTS Dörtyol ortak) – kabuk 2 (06.11.2026).
   - Arayüz ve veri hattı GitHub kanalından güncellenir: <kanal>manifest.json + manifest.sig (Ed25519, aşağıdaki açık anahtar).
     Dosyalar SHA-256 ile doğrulanıp userData/guncel/<sürüm>/ altına iner; imza ya da özet tutmazsa güncelleme alınmaz.
   - Veri bilgisayardan çıkmaz: paket / veritabanı yerelde, ayrı bir iş parçacığında (worker) işlenir.
   - Renderer API (ui/app.js): durum, yukle, sec, secYol, yenile + olaylar ilerleme, guncelleme, yeniPaket. */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs'), crypto = require('crypto'), https = require('https');
const { Worker } = require('worker_threads');
const KABUK = 2;
const ACIK_ANAHTAR = '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAr7+qPFyrK+2ZZMAbFYAYRqIKeSnhLjkMiUJrR1iaqas=\n-----END PUBLIC KEY-----\n';
const REPO = 'https://raw.githubusercontent.com/osmcommand-sketch/enerji-akis-panel/main/';

module.exports = function baslat(C) {   // C: { ad, kanal ('' | 'gts/'), api ('enerji' | 'gts'), uzanti, worker }
  app.setName(C.ad);
  app.setPath('userData', path.join(app.getPath('appData'), C.ad));
  const UD = app.getPath('userData'), GD = path.join(UD, 'guncel'), DUR = path.join(UD, 'durum.json'), AKT = path.join(UD, 'aktif.json');
  const PAKET = path.join(__dirname, 'icerik');   // kurulumla gelen sürüm
  const oku = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const yaz = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1)); };
  const surumKars = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const paketSurum = () => (oku(path.join(PAKET, 'manifest.json'), {}).surum || '0');
  function kok() {   // etkin içerik klasörü: indirilen sürüm paketle gelenden yeniyse o
    const a = oku(AKT, {}).surum, p = paketSurum();
    if (a && surumKars(a, p) > 0 && fs.existsSync(path.join(GD, a, 'manifest.json'))) return path.join(GD, a);
    return PAKET;
  }
  let win = null;
  const gonder = (k, m) => { try { if (win && !win.isDestroyed()) win.webContents.send(k, m); } catch {} };

  /* ---------- güncelleme ---------- */
  const al = (url) => new Promise((ok, red) => {
    const r = https.get(url, { headers: { 'User-Agent': C.ad, 'Cache-Control': 'no-cache' }, timeout: 20000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return al(res.headers.location).then(ok, red);
      if (res.statusCode !== 200) { res.resume(); return red(new Error('HTTP ' + res.statusCode)); }
      const p = []; res.on('data', (d) => p.push(d)); res.on('end', () => ok(Buffer.concat(p))); });
    r.on('timeout', () => r.destroy(new Error('zaman aşımı'))); r.on('error', red); });
  async function guncelle() {
    try {
      const t = '?t=' + Date.now(), mb = await al(REPO + C.kanal + 'manifest.json' + t), sig = Buffer.from((await al(REPO + C.kanal + 'manifest.sig' + t)).toString().trim(), 'base64');
      if (!crypto.verify(null, mb, crypto.createPublicKey(ACIK_ANAHTAR), sig)) throw new Error('imza doğrulanamadı');
      const M = JSON.parse(mb.toString('utf8'));
      if ((M.kabuk || 1) > KABUK) return;   // daha yeni kabuk gerekiyor
      const simdi = path.basename(kok()) === 'icerik' ? paketSurum() : path.basename(kok());
      if (surumKars(M.surum, simdi) <= 0) return;
      const hedef = path.join(GD, M.surum), gecici = hedef + '.indiriliyor';
      fs.rmSync(gecici, { recursive: true, force: true });
      for (const [f, h] of Object.entries(M.dosyalar)) {
        const b = await al(REPO + C.kanal + f.split('/').map(encodeURIComponent).join('/') + t);
        if (crypto.createHash('sha256').update(b).digest('hex') !== h) throw new Error('özet tutmadı: ' + f);
        fs.mkdirSync(path.dirname(path.join(gecici, f)), { recursive: true }); fs.writeFileSync(path.join(gecici, f), b);
      }
      fs.writeFileSync(path.join(gecici, 'manifest.json'), mb);
      fs.rmSync(hedef, { recursive: true, force: true }); fs.renameSync(gecici, hedef);
      yaz(AKT, { surum: M.surum, tarih: new Date().toISOString() });
      for (const d of fs.readdirSync(GD)) if (d !== M.surum) fs.rmSync(path.join(GD, d), { recursive: true, force: true });   // eski sürümler
      gonder('guncelleme', { surum: M.surum, notlar: M.notlar || '' });
    } catch (e) { console.error('Güncelleme:', e.message); }
  }

  /* ---------- durum ve dosya seçimi ---------- */
  const durum = () => oku(DUR, { son: null, sonlar: [] });
  function secYol(p) {
    if (!p || !fs.existsSync(p)) return { hata: 'Dosya bulunamadı: ' + p };
    const d = durum(); d.son = p; d.sonlar = [{ ad: path.basename(p), yol: p }, ...(d.sonlar || []).filter((s) => s.yol !== p)].slice(0, 6); yaz(DUR, d);
    win.loadFile(path.join(kok(), 'ui', 'index.html')); izle(p); return { ok: true };
  }
  let izci = null;
  function izle(p) {   // aynı klasöre yeni teslimat paketi gelirse haber ver
    try { if (izci) izci.close(); if (!p) return; const dir = path.dirname(p), ilk = new Set(fs.readdirSync(dir));
      izci = fs.watch(dir, (_e, f) => { if (!f || ilk.has(f) || !C.uzanti.test(f)) return; ilk.add(f); setTimeout(() => gonder('yeniPaket', { ad: f, yol: path.join(dir, f) }), 3000); });
    } catch {}
  }
  ipcMain.handle('durum', () => { const d = durum(); if (d.son && !fs.existsSync(d.son)) return { ...d, son: null, uyari: 'Son açılan dosya bulunamadı: ' + d.son }; return d; });
  ipcMain.handle('sec', async () => { const r = await dialog.showOpenDialog(win, { title: 'Teslimat paketini seçin', properties: ['openFile'], filters: [{ name: 'Teslimat paketi / veritabanı', extensions: ['zip', 'db'] }] });
    if (r.canceled || !r.filePaths[0]) return { iptal: true }; return secYol(r.filePaths[0]); });
  ipcMain.handle('secYol', (_e, p) => secYol(p));
  ipcMain.handle('yenile', () => { win.loadFile(path.join(kok(), 'ui', 'index.html')); return true; });
  ipcMain.handle('yukle', (_e, p) => new Promise((ok) => {
    const k = kok(), w = new Worker(path.join(__dirname, C.worker), { workerData: { db: p, kok: k, ud: UD, surum: path.basename(k) === 'icerik' ? paketSurum() : path.basename(k) }, resourceLimits: { maxOldGenerationSizeMb: 8192 } });
    w.on('message', (m) => { if (m.ilerleme) gonder('ilerleme', m.ilerleme); else { ok(m); w.terminate(); } });
    w.on('error', (e) => ok({ hata: e && e.message || String(e) }));
    w.on('exit', (c) => { if (c) ok({ hata: 'Veri hattı durdu (kod ' + c + ').' }); });
  }));

  app.whenReady().then(() => {
    win = new BrowserWindow({ width: 1440, height: 920, title: C.ad, autoHideMenuBar: true, webPreferences: { nodeIntegration: true, contextIsolation: false, sandbox: false } });
    win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
    win.loadFile(path.join(kok(), 'ui', 'index.html'));
    izle(durum().son);
    setTimeout(guncelle, 4000); setInterval(guncelle, 3 * 3600e3);
  });
  app.on('window-all-closed', () => app.quit());
};
