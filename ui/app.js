'use strict';
/* Masaüstü kabuğu: veritabanını açar, veri hattının sonucunu panelin JSON bloklarına yazar, sonra panel.js'i başlatır. */
(async () => {
  const $ = (id) => document.getElementById(id);
  if (!window.enerji && typeof require === 'function') {
    const { ipcRenderer, webUtils } = require('electron');
    window.enerji = { durum: () => ipcRenderer.invoke('durum'), yukle: (p) => ipcRenderer.invoke('yukle', p), sec: () => ipcRenderer.invoke('sec'),
      secYol: (p) => ipcRenderer.invoke('secYol', p), yenile: () => ipcRenderer.invoke('yenile'), yol: (f) => webUtils.getPathForFile(f),
      onIlerleme: (cb) => { ipcRenderer.removeAllListeners('ilerleme'); ipcRenderer.on('ilerleme', (_e, m) => cb(m)); } };
  }
  const api = window.enerji;
  // Otomatik güncelleme bildirimi (kabuk 1.0.6+): uygulama açıkken yeni arayüz inerse
  if (typeof require === 'function') { try { const { ipcRenderer } = require('electron'); ipcRenderer.removeAllListeners('guncelleme');
    ipcRenderer.on('guncelleme', (_e, r) => { let b = document.getElementById('gun-bant'); if (!b) { b = document.createElement('div'); b.id = 'gun-bant'; b.className = 'gun-bant'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
      b.innerHTML = `<span>Yeni sürüm indirildi: <b>${esc(r.surum)}</b>${r.notlar ? ' · ' + esc(r.notlar) : ''}</span><button type="button" id="gun-yenile">Şimdi yenile</button><button type="button" class="ik" id="gun-kapat" aria-label="Kapat">×</button>`;
      document.getElementById('gun-yenile').onclick = () => api && api.yenile(); document.getElementById('gun-kapat').onclick = () => b.remove(); }); } catch {} }
  const AD = { akis: ['Genel', 'Akış haritası'], musteri: ['Akaryakıt', 'Dağıtıcılar arası ticaret'], tahsis: ['Akaryakıt', 'Tedarik tahsisi · terminal bazlı'],
    kaynak: ['Akaryakıt', 'Tedarik tahsisi · kaynak bazlı'], ithalat: ['Akaryakıt', 'İthalat'], takas: ['Akaryakıt', 'Takas'], bayi: ['Akaryakıt', 'Bayiler'],
    rafineri: ['Akaryakıt', 'Rafineriler'], tasima: ['Akaryakıt', 'Taşıma'], lpgmus: ['LPG', 'Dağıtıcılar arası ticaret'], lpgith: ['LPG', 'İthalat'], akterm: ['Akaryakıt', 'Terminaller'], lpgtrm: ['LPG', 'Terminaller'] };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const tarih = (ms) => new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  async function bos(hata) {
    $('yukle').hidden = true; $('bos').hidden = false;
    const h = $('hata'); h.hidden = !hata; h.textContent = hata || '';
    const st = api ? await api.durum() : { sonlar: [] };
    $('son').innerHTML = (st.sonlar || []).length ? '<p style="margin:6px 0 2px;font-size:12.5px;color:var(--ink-3)">Son açılanlar</p>' + st.sonlar.map((s, i) =>
      `<button type="button" data-i="${i}"><b style="font-weight:600">${esc(s.ad)}</b><span>${esc(s.yol.length > 64 ? "…" + s.yol.slice(-63) : s.yol)}</span></button>`).join('') : '';
    $('son').onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) api.secYol(st.sonlar[+b.dataset.i].yol); };
    $('ac').focus();
  }

  function surukle() {
    const dz = $('dz');
    const on = (e) => { e.preventDefault(); dz.classList.add('ust'); };
    const off = () => dz.classList.remove('ust');
    window.addEventListener('dragover', on); window.addEventListener('dragleave', off);
    window.addEventListener('drop', (e) => { e.preventDefault(); off(); const f = e.dataTransfer.files[0]; if (f && api) api.secYol(api.yol(f)); });
  }

  function baslik() {
    const W = $('wrap'), h1 = W.querySelector('header h1');
    let cr = W.querySelector('header .crumb');
    if (!cr) { cr = document.createElement('span'); cr.className = 'crumb'; h1.before(cr); }
    const yaz = () => { const a = AD[W.dataset.sayfa] || ['', '']; cr.textContent = a[0]; h1.textContent = a[1]; document.title = a[1] + ' – Enerji Akış'; $('main').scrollTop = 0; };
    new MutationObserver(yaz).observe(W, { attributes: true, attributeFilter: ['data-sayfa'] }); yaz();
  }

  async function yukle(st) {
    $('bos').hidden = true; $('yukle').hidden = false;
    $('y-dosya').textContent = st.son; const ad = $('y-adim'); ad.innerHTML = '';
    api.onIlerleme((m) => { for (const x of ad.children) x.classList.remove('on'); const s = document.createElement('span'); s.className = 'on'; s.textContent = m; ad.appendChild(s); });
    const r = await api.yukle(st.son);
    if (r.hata) return bos(r.hata);
    $('data').textContent = JSON.stringify(r.data);
    $('tahsis').textContent = JSON.stringify(r.tahsis);
    $('geo').textContent = JSON.stringify(r.geo);
    window.__SURUM__ = r.meta.surum;
    $('veri').hidden = false; $('v-ad').textContent = r.meta.ad; $('v-tarih').textContent = 'Dosya tarihi ' + tarih(r.meta.mtime);
    const s = document.createElement('script'); s.src = 'panel.js';
    s.onload = () => { baslik(); $('yukle').hidden = true; };
    s.onerror = () => bos('Panel başlatılamadı.');
    document.body.appendChild(s);
  }

  $('ac').onclick = () => api.sec();
  $('v-ac').onclick = () => api.sec();
  $('v-yenile').onclick = () => api.yenile();
  surukle();
  window.addEventListener('error', (e) => { if (!$('yukle').hidden) bos('Beklenmeyen hata: ' + e.message); });
  if (!api) return bos('Uygulama köprüsü bulunamadı.');
  const st = await api.durum();
  if (st.son) yukle(st); else bos(st.uyari);
})();
