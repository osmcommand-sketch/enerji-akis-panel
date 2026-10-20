'use strict';
/* Enerji Akış – telefon (çevrimdışı PWA). Veritabanı telefonda işlenir, sonuç cihazda (IndexedDB) saklanır; hiçbir yere gönderilmez. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  const idb = () => new Promise((ok, no) => { const r = indexedDB.open('enerji-mobil', 1); r.onupgradeneeded = () => r.result.createObjectStore('veri'); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const al = async (k) => { const d = await idb(); return new Promise((ok, no) => { const q = d.transaction('veri').objectStore('veri').get(k); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); };
  const koy = async (k, v) => { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction('veri', 'readwrite'); t.objectStore('veri').put(v, k); t.oncomplete = () => ok(); t.onerror = () => no(t.error); }); };
  const tarih = (ms) => new Date(ms).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  function ekran(h) { $('m-ortu').hidden = false; $('m-kart').innerHTML = '<div class="m-brand"><img src="icon-192.png" alt="">Enerji Akış</div>' + h; }
  function bos(hata, son) {
    ekran(`<h2>Veritabanını açın</h2><p>PDM teslimatındaki <b>enerji_master_2025_db_….zip</b> dosyasını (ya da içindeki .db dosyasını) seçin. Veri telefonda hazırlanır ve cihazda saklanır; sonra internet olmadan da açılır.</p>`
      + (hata ? `<div class="m-hata">${esc(hata)}</div>` : '')
      + `<label class="m-btn">Dosya seç…<input type="file" id="m-dosya" multiple accept=".zip,.db,.sqlite,.sqlite3,.json,application/zip,application/octet-stream" hidden></label>`
      + (son ? `<button type="button" class="m-ik" id="m-geri">Vazgeç · ${esc(son)} ile devam</button>` : '')
      + `<p class="m-not">Dosyayı WhatsApp, e-posta ya da Drive'dan önce telefona kaydedin; sonra burada "Dosya seç" ile Dosyalar'dan açın. İşleme 20–60 sn sürebilir. LPG veritabanı (lpg_tr…zip) varsa Enerji Master zip'iyle birlikte ikisini aynı anda seçin.</p>`);
    $('m-dosya').onchange = (e) => { const fs_ = [...e.target.files]; if (fs_.length) isle(fs_); };
    if (son) $('m-geri').onclick = () => { $('m-ortu').hidden = true; };
  }
  async function isle(fl) {
    const lpgF = fl.length > 1 ? fl.find((x) => /lpg/i.test(x.name)) : null, f = fl.find((x) => x !== lpgF) || fl[0];
    ekran(`<h2>Veri hazırlanıyor</h2><p>${esc(f.name)} · ${(f.size / 1e6).toFixed(1)} MB</p><div class="m-cubuk"><i></i></div><div class="m-adim" id="m-adim" role="status" aria-live="polite"></div>`);
    const adim = (m) => { const a = $('m-adim'); for (const x of a.children) x.classList.remove('on'); const s = document.createElement('span'); s.className = 'on'; s.textContent = m; a.appendChild(s); };
    try {
      let v;
      if (/\.json$/i.test(f.name)) { adim('Veri paketi okunuyor'); v = JSON.parse(await f.text()); if (!v.data || !v.tahsis) throw new Error('Bu JSON bir Enerji Akış veri paketi değil.'); }
      else {
        adim('Dosya okunuyor'); const buf = await f.arrayBuffer(), lbuf = lpgF ? await lpgF.arrayBuffer() : null;
        const r = await new Promise((ok, no) => { const w = new Worker('worker.js');
          w.onmessage = (e) => { const m = e.data; if (m.tip === 'log') adim(m.m); else if (m.tip === 'hata') { w.terminate(); no(new Error(m.m)); } else { w.terminate(); ok(m.r); } };
          w.onerror = (e) => { w.terminate(); no(new Error(e.message || 'Veri hattı çalışmadı (telefon belleği yetmemiş olabilir).')); };
          w.postMessage({ buf, ad: f.name, lpg: lbuf, lpgAd: lpgF ? lpgF.name : null }, lbuf ? [buf, lbuf] : [buf]); });
        adim('Harita yükleniyor'); const g = await (await fetch('res/tr_svg.json')).json();
        v = { data: r.data, tahsis: r.tahsis, geo: { p: g.p, proj: g.proj }, surum: `${r.icAd ? r.icAd + ' (' + f.name + ')' : f.name} · ${tarih(f.lastModified || Date.now())}` };
      }
      v.ad = f.name; v.zaman = Date.now(); adim('Cihaza kaydediliyor'); await koy('son', v);
      location.reload();
    } catch (e) { bos(String((e && e.message) || e), (await al('son').catch(() => null))?.ad); }
  }
  function goster(v) {
    $('data').textContent = JSON.stringify(v.data); $('tahsis').textContent = JSON.stringify(v.tahsis); $('geo').textContent = JSON.stringify(v.geo);
    window.__SURUM__ = v.surum;
    const s = document.createElement('script'); s.src = 'panel.js';
    s.onload = () => { $('m-ortu').hidden = true; const h = document.querySelector('#wrap > header');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'm-ac'; b.textContent = 'Veri: ' + v.ad + ' · değiştir'; b.onclick = () => bos(null, v.ad); h.appendChild(b); };
    s.onerror = () => bos('Panel yüklenemedi.');
    document.body.appendChild(s);
  }
  try { const v = await al('son'); if (v && v.data) goster(v); else bos(); } catch (e) { bos('Cihaz depolaması açılamadı: ' + e.message); }
})();
