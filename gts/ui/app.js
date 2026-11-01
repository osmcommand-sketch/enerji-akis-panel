'use strict';
/* GTS Dörtyol masaüstü: paketi açar, veri hattının sonucunu panoya verir. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if (!window.gts && typeof require === 'function') {   // Türkçe karakterli klasörlerde preload yüklenmeyebilir
    const { ipcRenderer, webUtils } = require('electron');
    window.gts = { durum: () => ipcRenderer.invoke('durum'), yukle: (p) => ipcRenderer.invoke('yukle', p), sec: () => ipcRenderer.invoke('sec'),
      secYol: (p) => ipcRenderer.invoke('secYol', p), yenile: () => ipcRenderer.invoke('yenile'), yol: (f) => webUtils.getPathForFile(f),
      on: (ad, cb) => { ipcRenderer.removeAllListeners(ad); ipcRenderer.on(ad, (_e, m) => cb(m)); } };
  }
  const api = window.gts;
  const bant = (html, btn, fn) => { let b = $('gun-bant'); if (!b) { b = document.createElement('div'); b.id = 'gun-bant'; b.className = 'gun-bant'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    b.innerHTML = `<span>${html}</span><button type="button" id="gb-ok">${btn}</button><button type="button" class="ik" id="gb-x" aria-label="Kapat">×</button>`;
    $('gb-ok').onclick = fn; $('gb-x').onclick = () => b.remove(); };
  api.on('guncelleme', (r) => bant(`Yeni sürüm indirildi: <b>${esc(r.surum)}</b>${r.notlar ? ' · ' + esc(r.notlar) : ''}`, 'Şimdi yenile', () => api.yenile()));
  api.on('yeniPaket', (r) => bant(`Klasöre yeni paket geldi: <b>${esc(r.ad)}</b>`, 'Aç', () => api.secYol(r.yol)));

  const bos = async (hata) => {
    $('yukle').hidden = true; $('bos').hidden = false; $('wrap').hidden = true;
    const h = $('hata'); h.hidden = !hata; h.textContent = hata || '';
    const st = await api.durum();
    $('son').innerHTML = (st.sonlar || []).length ? '<p class="muted" style="margin:10px 0 4px;font-size:12.5px">Son açılanlar</p>' + st.sonlar.map((s, i) =>
      `<button type="button" class="sonb" data-i="${i}"><b>${esc(s.ad)}</b><span>${esc(s.yol.length > 70 ? '…' + s.yol.slice(-69) : s.yol)}</span></button>`).join('') : '';
    $('son').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) api.secYol(st.sonlar[+b.dataset.i].yol); };
    $('ac').onclick = () => api.sec(); $('ac').focus();
  };
  const dz = $('bos');
  addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('ust'); });
  addEventListener('dragleave', () => dz.classList.remove('ust'));
  addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('ust'); const f = e.dataTransfer.files[0]; if (f) api.secYol(api.yol(f)); });

  const st = await api.durum();
  if (!st.son) return bos(st.uyari);
  $('bos').hidden = true; $('yukle').hidden = false; $('y-ad').textContent = st.son.split(/[\\/]/).pop();
  api.on('ilerleme', (m) => { $('y-m').textContent = m; });
  const r = await api.yukle(st.son);
  if (r.hata) return bos(r.hata);
  $('yukle').hidden = true; $('wrap').hidden = false;
  try { window.GTSPano(r.data); } catch (e) { return bos('Pano çizilemedi: ' + (e && e.message || e)); }
  $('degistir').onclick = () => api.sec();
})();
