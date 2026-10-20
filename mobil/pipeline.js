'use strict';
/* Enerji Akış – panel veri hattı (SDT build/extract9.py + konsolide.py + fizik.py + bayi.py + tahsis_gen.py + build_dash2.py'nin JS karşılığı).
   Girdi: enerji_master_2025.db (PDM teslimatı). Çıktı: { data, tahsis } – panelin beklediği biçim. */
// Node (masaüstü) ya da tarayıcı (telefon, worker) – tarayıcıda kaynak dosyalar metin olarak verilir
const fs = typeof require === 'function' ? require('fs') : null;
const path = typeof require === 'function' ? require('path') : null;

/* Python round() ile aynı: yarımda çifte yuvarlama */
function pr(x, n = 0) {
  if (x === null || x === undefined) return x;
  const m = Math.pow(10, n), y = x * m, f = Math.floor(y), d = y - f;
  let r;
  if (Math.abs(d - 0.5) < 1e-9 * Math.max(1, Math.abs(y)) && Math.abs(d - 0.5) === 0) r = (f % 2 === 0) ? f : f + 1;
  else r = Math.round(y);
  return n ? r / m : r;
}

function csv(file) {
  let t = typeof file === 'object' ? file.text : fs.readFileSync(file, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
  const lines = t.split(/\r?\n/).filter(l => l.length);
  const split = l => { const o = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i];
      if (q) { if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { o.push(cur); cur = ''; } else cur += ch; }
    o.push(cur); return o; };
  const h = split(lines[0]);
  return lines.slice(1).map(l => { const v = split(l), o = {}; h.forEach((k, i) => { o[k] = v[i] === undefined ? '' : v[i]; }); return o; });
}

const CO = {"İstanbul":[41.01,28.98],"Edirne":[41.68,26.56],"Kırklareli":[41.73,27.22],"Tekirdağ":[40.98,27.51],"Çanakkale":[40.15,26.41],"Balıkesir":[39.65,27.88],"Bursa":[40.19,29.06],"Bilecik":[40.14,29.98],"Kocaeli":[40.77,29.94],"Sakarya":[40.78,30.40],"Yalova":[40.65,29.27],"İzmir":[38.42,27.14],"Manisa":[38.61,27.43],"Aydın":[37.85,27.85],"Denizli":[37.78,29.09],"Muğla":[37.22,28.36],"Uşak":[38.68,29.41],"Kütahya":[39.42,29.98],"Afyonkarahisar":[38.76,30.54],"Antalya":[36.89,30.71],"Isparta":[37.76,30.55],"Burdur":[37.72,30.29],"Mersin":[36.81,34.64],"Adana":[37.00,35.32],"Osmaniye":[37.07,36.25],"Hatay":[36.20,36.16],"Kahramanmaraş":[37.58,36.94],"Ankara":[39.93,32.86],"Konya":[37.87,32.48],"Eskişehir":[39.78,30.52],"Kırıkkale":[39.85,33.51],"Kırşehir":[39.15,34.16],"Nevşehir":[38.62,34.71],"Niğde":[37.97,34.68],"Aksaray":[38.37,34.03],"Karaman":[37.18,33.22],"Kayseri":[38.72,35.49],"Sivas":[39.75,37.02],"Yozgat":[39.82,34.81],"Çankırı":[40.60,33.62],"Zonguldak":[41.45,31.79],"Bartın":[41.63,32.34],"Karabük":[41.20,32.62],"Kastamonu":[41.38,33.78],"Sinop":[42.03,35.15],"Samsun":[41.29,36.33],"Ordu":[40.98,37.88],"Giresun":[40.91,38.39],"Trabzon":[41.00,39.72],"Rize":[41.02,40.52],"Artvin":[41.18,41.82],"Gümüşhane":[40.46,39.48],"Bayburt":[40.26,40.23],"Tokat":[40.31,36.55],"Amasya":[40.65,35.83],"Çorum":[40.55,34.95],"Bolu":[40.74,31.61],"Düzce":[40.84,31.16],"Erzurum":[39.90,41.27],"Erzincan":[39.75,39.49],"Kars":[40.60,43.10],"Ardahan":[41.11,42.70],"Iğdır":[39.92,44.04],"Ağrı":[39.72,43.05],"Van":[38.49,43.38],"Muş":[38.74,41.49],"Bitlis":[38.40,42.11],"Bingöl":[38.88,40.50],"Tunceli":[39.11,39.55],"Elazığ":[38.67,39.22],"Malatya":[38.35,38.31],"Hakkari":[37.58,43.74],"Gaziantep":[37.07,37.38],"Kilis":[36.72,37.12],"Şanlıurfa":[37.16,38.79],"Adıyaman":[37.76,38.28],"Diyarbakır":[37.91,40.24],"Mardin":[37.31,40.74],"Batman":[37.88,41.13],"Siirt":[37.93,41.94],"Şırnak":[37.52,42.46]};

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const cmp = (a, b) => (a === b ? 0 : a === null || a === undefined ? -1 : b === null || b === undefined ? 1 : a < b ? -1 : 1);


/* ---------------- LPG veritabanı (lpg_tr.db, LPG Specialist) → master LPG tabloları (kullanıcı 20.10.2026) ----------------
   SDT build/lpg_adapter.py'nin JS karşılığı. Master veritabanı bellekte açık (db); LPG veritabanı ayrı açılır (L).
   Master'ın LPG tabloları lpg_tr.db'den yeniden yazılır; panel kodu değişmeden çalışır. */
function lpgUyarla(SQL, db, lpgBytes, log) {
  const L = new SQL.Database(lpgBytes);
  try {
    const LQ = (s, p) => { const st = L.prepare(s); if (p) st.bind(p); const o = []; while (st.step()) o.push(st.get()); st.free(); return o; };
    const MQ = (s, p) => { const st = db.prepare(s); if (p) st.bind(p); const o = []; while (st.step()) o.push(st.get()); st.free(); return o; };
    for (const t of ['fact_company_flow', 'ref_company_master_map', 'ref_facility_master_map', 'fact_facility_utilization'])
      if (!LQ(`select count(*) from sqlite_master where name='${t}'`)[0][0]) throw new Error(`LPG veritabanında ${t} tablosu yok. LPG Specialist teslimatındaki lpg_tr.db (v1.1 ya da sonrası) gerekir.`);
    const CMP = new Map(); for (const [mid, cid] of LQ('select master_company_id, company_id from ref_company_master_map where company_id is not null order by master_company_id')) if (!CMP.has(cid)) CMP.set(cid, mid);
    const FAC = new Map(); for (const [code, fid, kind] of LQ('select master_code, facility_id, master_kind from ref_facility_master_map where facility_id is not null'))
      if (!FAC.has(fid) || (kind === 'TERMINAL' && !FAC.get(fid).startsWith('T'))) FAC.set(fid, code);
    const BRAND = new Map(LQ('select company_id, brand_name from ref_company')), FNAME = new Map(LQ('select facility_id, name from ref_facility'));
    const SEG = { OTOGAZ: 'LPG-Otogaz', TUPLU: 'LPG-Tüplü', DOKME: 'LPG-Dökme' };
    const TT = { IMPORT: 'Kendi ithalatı', REFINERY: 'Rafineri alımı', WHOLESALE: 'Dağıtıcı alımı', STOCK: 'Stoktan satış' };
    const eksik = {}; const ek = (k, q) => { eksik[k] = (eksik[k] || 0) + (q || 0); };
    const sid = (cid, q) => { if (cid === null || cid === undefined) return null; const s = CMP.get(cid); if (s === undefined) { ek('şirket ' + (BRAND.get(cid) || cid), q); return null; } return s; };
    db.run('begin');
    // yükleme tesisleri
    const loadf = LQ("select distinct load_facility_id from fact_company_flow union select distinct discharge_facility_id from fact_import where granularity='ESTIMATE' and discharge_facility_id is not null").map(r => r[0]);
    const termIds = new Set(MQ('select Terminal_ID from DIM_TERMINAL').map(r => r[0]));
    const UTIL = new Map(LQ('select facility_id, lpg_facility_role, capacity_t from fact_facility_utilization').map(r => [r[0], r.slice(1)]));
    const ROL = { ITHALAT_TERMINALI: 'İthalat terminali', RAFINERI: 'Rafineri', DEPO_ARA: 'Ara depo', KULLANILMIYOR: 'Kullanılmıyor', FAAL_DEGIL: 'Faal değil' };
    const TID = new Map(), yeni = [];
    for (const fid of loadf) {
      const code = FAC.get(fid); if (code === undefined) { ek('tesis ' + (FNAME.get(fid) || fid), 0); continue; }
      if (termIds.has(code)) { TID.set(fid, code); continue; }
      const d = MQ('select Sirket_ID, Il_ID, Ilce, Ilce_ID, Kapasite_m3 from REF_LPG_DEPO_KULLANIM where Depolama_ID=?', [code]);
      const f = LQ('select facility_code, province_id, district, operator_company_id from ref_facility where facility_id=?', [fid])[0];
      const ad = String(FNAME.get(fid)).split('/')[0].trim();
      const [il, ilce, ilceId, kap, op] = d.length ? [d[0][1], d[0][2], d[0][3], d[0][4], d[0][0]] : [f[1], f[2], null, null, sid(f[3])];
      const u = UTIL.get(fid) || [null];
      db.run(`insert into DIM_TERMINAL (Terminal_ID, Terminal_Adi, LPG_Adi, Akaryakit, LPG, Il_ID, Ilce, Ilce_ID, LPG_Lisans_No, LPG_Kapasite_m3,
              LPG_Terminal_Tipi, LPG_Captive_Ithalatci_ID, Tesis_Tipi, LPG_Rol, Koordinat_Kaynagi, Eslesme_Notu, Donem_Disi) values (?,?,?,0,1,?,?,?,?,?,?,?,?,?,?,?,0)`,
        [code, ad, ad, il, ilce, ilceId, f[0], kap, 'Captive', op, 'LPG ithalat terminali', ROL[u[0]] || 'İthalat terminali', 'İlçe merkezi (depo koordinatı)', 'LPG veritabanı (lpg_tr.db) yükleme tesisi; master depo ' + code]);
      TID.set(fid, code); termIds.add(code); yeni.push([code, ad]);
    }
    for (const [fid, code] of TID) { const u = UTIL.get(fid); if (u && u[1]) db.run('update DIM_TERMINAL set LPG_Kapasite_m3=? where Terminal_ID=?', [Math.round(u[1] / 0.454), code]); }
    // akış (yıllık)
    db.run('delete from FACT_LPG_AKIS');
    const KS = new Map(MQ('select Sirket_ID, coalesce(Konsolide_Sirket_ID, Sirket_ID) from DIM_SIRKET'));
    const ins = db.prepare(`insert into FACT_LPG_AKIS (LPG_Akis_ID, Donem, Sirket_ID, Il_ID, Urun, Terminal_ID, Tedarik_Tipi, Rota, Depolama_ID, Primer_km, Sekonder_km,
      Tarife_km, Miktar_ton, Yonlendiren_Sirket_ID, Ithal_ton, Yerli_ton, Karayolu_km, Ton_km, Maliyet_Esdeger_Ton_km, Depo_Tarife_TL, Konsolide_Sirket_ID) values (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?,0,?)`);
    let n = 0;
    for (const [cid, lf, vf, il, seg, st, sup, q, imp, dom, pk, sk, dk] of LQ(`select company_id, load_facility_id, via_facility_id, province_id, segment_id, supply_type, supplier_company_id,
        sum(quantity_t), sum(import_share_t), sum(domestic_t), sum(quantity_t*coalesce(primary_km,0)), sum(quantity_t*coalesce(secondary_km,0)), sum(quantity_t*coalesce(distance_km,0))
        from fact_company_flow where period_id between 202501 and 202512 group by 1,2,3,4,5,6,7`)) {
      if (!q) continue;
      const s = sid(cid, q), t = TID.get(lf), dep = vf !== null ? (FAC.get(vf) || null) : null;
      if (s === null || t === undefined) { ek('akış (şirket/tesis eşleşmedi)', q); continue; }
      n++;
      ins.run(['N' + String(n).padStart(6, '0'), '2025', s, il, SEG[seg], t, TT[st], dep ? 'Depo üzerinden' : 'Doğrudan', dep, pk / q, sk / q, q,
        st === 'WHOLESALE' ? sid(sup, q) : null, imp || 0, dom || 0, dk / q, dk, dk, KS.get(s) || s]);
    }
    ins.free();
    // tedarik: dağıtıcı = fact_wholesale; rafineri = rafineri tesisinden ilk alıcı
    db.run('delete from FACT_LPG_TEDARIK');
    const pairT = new Map(), selT = new Map();
    for (const [b, s, lf] of LQ("select company_id, supplier_company_id, load_facility_id, sum(quantity_t) from fact_company_flow where supply_type='WHOLESALE' group by 1,2,3 order by 4")) pairT.set(b + '|' + s, lf);
    for (const [s, lf] of LQ("select supplier_company_id, load_facility_id, sum(quantity_t) from fact_company_flow where supply_type='WHOLESALE' group by 1,2 order by 3")) selT.set(s, lf);
    let k = 0;
    for (const [b, s, q] of LQ('select buyer_company_id, seller_company_id, sum(quantity_t) from fact_wholesale where period_id between 202501 and 202512 and buyer_company_id is not null group by 1,2')) {
      if (!q || q < 0.5) continue; const ab = sid(b, q), ss = sid(s, q); if (ab === null || ss === null) continue;
      const lf = pairT.has(b + '|' + s) ? pairT.get(b + '|' + s) : selT.get(s); k++;
      db.run('insert into FACT_LPG_TEDARIK values (?,?,?,?,?,?,?)', ['N' + String(k).padStart(5, '0'), '2025', ab, q, 'Dağıtıcı', ss, TID.get(lf) || null]);
    }
    for (const [b, lf, q] of LQ(`select case when supply_type='WHOLESALE' then supplier_company_id else company_id end, load_facility_id, sum(quantity_t)
        from fact_company_flow f join ref_facility r on r.facility_id=f.load_facility_id where r.facility_type='REFINERY' and supply_type in ('REFINERY','WHOLESALE') group by 1,2`)) {
      const ab = sid(b, q); if (ab === null || !q) continue; k++;
      db.run('insert into FACT_LPG_TEDARIK values (?,?,?,?,?,?,?)', ['N' + String(k).padStart(5, '0'), '2025', ab, q, 'Rafineri', null, TID.get(lf) || null]);
    }
    // ithalat
    db.run('delete from FACT_LPG_ITHALAT');
    const GUM = { ISDEMIR: 'İsdemir', KORFEZ_PETROKIMYA: 'Körfez Petrokimya', ALIAGA: 'Aliağa', SAMSUN: 'Samsun', ALANYA: 'Alanya', MARMARA_EREGLISI: 'Marmara Ereğlisi', TEKIRDAG: 'Marmara Ereğlisi',
      GIRESUN: 'Giresun', TRABZON: 'Trabzon', BEYLIKDUZU_AKARYAKIT: 'Beylikdüzü', AVRUPA_SERBEST_BOLGE: 'Avrupa Serbest Bölge', DIGER: 'Diğer' };
    k = 0;
    for (const [cid, fid, cu, q, meth] of LQ("select company_id, discharge_facility_id, customs_office_id, sum(quantity_t), max(allocation_method) from fact_import where granularity='ESTIMATE' and period_id between 202501 and 202512 group by 1,2,3")) {
      const s = sid(cid, q), t = TID.get(fid); if (s === null || t === undefined) { ek('ithalat (eşleşmedi)', q); continue; }
      k++; db.run('insert into FACT_LPG_ITHALAT values (?,?,?,?,?,?,?,?)', ['N' + String(k).padStart(4, '0'), '2025', s, t, q, GUM[cu] || cu, meth || 'lpg_tr.db ESTIMATE', KS.get(s) || s]);
    }
    db.run('delete from FACT_LPG_URETIM');
    for (const [fid, q] of LQ('select facility_id, sum(quantity_t) from fact_production where period_id between 202501 and 202512 group by 1')) {
      const t = TID.get(fid) || FAC.get(fid); if (t) db.run("insert into FACT_LPG_URETIM values ('2025',?,?,?,'lpg_tr.db fact_production')", [t, FNAME.get(fid), q]);
    }
    // depo kullanımı
    const VIA = new Map(LQ('select via_facility_id, sum(quantity_t) from fact_company_flow where via_facility_id is not null group by 1'));
    const Pk = [];
    for (const [fid, code] of FAC) { if (!code.startsWith('P')) continue; Pk.push(code);
      const u = LQ('select capacity_t_year from fact_facility_utilization where facility_id=?', [fid]); if (!u.length) continue;
      const v = VIA.get(fid) || 0;
      db.run('update REF_LPG_DEPO_KULLANIM set Kapasite_ton_yil=?, Atanan_ton=?, Kullanim_Orani=?, Varsayim=? where Depolama_ID=?',
        [u[0][0], v, u[0][0] ? v / u[0][0] : 0, 'lpg_tr.db fact_facility_utilization (kapasite t × 250 devir); atanan = ara depo geçişi (fact_company_flow)', code]); }
    db.run(`update REF_LPG_DEPO_KULLANIM set Atanan_ton=0, Kullanim_Orani=0 where Depolama_ID not in (${Pk.map(x => `'${x}'`).join(',')})`);
    // ulusal tablolar (2024 aylık ve 2016–2024 üretim lpg_tr.db'de yok: master değeri kalır)
    const AYS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const [pid, p, im, ex, s] of LQ('select period_id, production_t, import_t, export_t, domestic_sales_t from fact_supply_balance where period_id between 202501 and 202512'))
      db.run('update REF_LPG_ULUSAL_AYLIK set "Production 2025"=?, "Imports 2025"=?, "Exports 2025"=?, "Sales 2025 – total"=? where Month=?', [p, im, ex, s, AYS[pid % 100 - 1]]);
    const hist = new Map(); const hs = (y, kk, v) => { const o = hist.get(y) || hist.set(y, {}).get(y); o[kk] = v; };
    for (const [y, v] of LQ("select year, sum(value) from fact_epdk_report where topic='IMPORT_COUNTRY' group by 1")) hs(y, 'i', v);
    for (const [y, v] of LQ("select year, sum(value) from fact_epdk_report where topic='EXPORT_COUNTRY' group by 1")) hs(y, 'e', v);
    for (const [y, v] of LQ("select year, sum(value) from fact_epdk_report where topic='SALES_HISTORY' group by 1")) hs(y, 's', v);
    for (const [y, v] of LQ('select period_id/100, sum(production_t) from fact_supply_balance group by 1')) hs(y, 'p', v);
    for (const [y, h] of hist) db.run('update REF_LPG_ULUSAL_YILLIK set "Production t"=coalesce(?,"Production t"), "Imports t"=coalesce(?,"Imports t"), "Exports t"=coalesce(?,"Exports t"), "Sales total t"=coalesce(?,"Sales total t") where Year=?',
      [h.p ?? null, h.i ?? null, h.e ?? null, h.s ?? null, String(y)]);
    db.run('delete from REF_LPG_ITHALAT_ULKE');
    const ulk = new Map(); for (const [cn, y, v] of LQ('select country, year, import_t from v_import_country_history')) { const K = cn.replace(/i/g, 'İ').toLocaleUpperCase('tr-TR'); (ulk.get(K) || ulk.set(K, {}).get(K))[y] = v; }
    const tot25 = [...ulk.values()].reduce((a, v) => a + (v[2025] || 0), 0) || 1;
    for (const [cn, v] of [...ulk].sort((a, b) => (b[1][2025] || 0) - (a[1][2025] || 0)))
      db.run('insert into REF_LPG_ITHALAT_ULKE values (?,?,?,?,?,?,?,?,?,?,?,?,?)', [cn, ...[2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map(y => v[y] || 0), (v[2025] || 0) / tot25, v[2024] ? (v[2025] || 0) / v[2024] - 1 : null]);
    // LPG sayfaları için ek tablolar
    db.run('drop table if exists FACT_LPG_IHRACAT'); db.run('create table FACT_LPG_IHRACAT (Terminal_ID text, Sirket_ID text, Ton real)');
    for (const [fid, cid, q] of LQ("select load_facility_id, company_id, sum(quantity_t) from fact_export where granularity='ESTIMATE' and period_id between 202501 and 202512 group by 1,2"))
      db.run('insert into FACT_LPG_IHRACAT values (?,?,?)', [fid === null ? null : (TID.get(fid) || FAC.get(fid) || null), sid(cid, q), q]);
    db.run('drop table if exists REF_LPG_TASIMA_OZET'); db.run('create table REF_LPG_TASIMA_OZET (Mod text, Bacak text, Ton real, Ton_km real, Navlun_USD real, Sefer real)');
    for (const r of LQ('select mode, flow_type, sum(quantity_t), sum(quantity_t*distance_km), sum(quantity_t*cost_usd_per_t), sum(trips) from fact_land_transport where period_id between 202501 and 202512 group by 1,2')) db.run('insert into REF_LPG_TASIMA_OZET values (?,?,?,?,?,?)', r);
    db.run('drop table if exists REF_LPG_BAYI'); db.run('create table REF_LPG_BAYI (Il_ID integer, Sirket_ID text, Bayi integer)');
    for (const [il, cid, nb] of LQ('select d.province_id, h.company_id, count(*) from ref_dealer_distributor_hist h join ref_dealer d using(dealer_id) where h.year=2025 group by 1,2')) { const s_ = sid(cid, 0); if (s_) db.run('insert into REF_LPG_BAYI values (?,?,?)', [il, s_, nb]); }
    db.run('create table if not exists META_LPG_KAYNAK (Anahtar text, Deger text)'); db.run('delete from META_LPG_KAYNAK');
    const son = LQ('select max(loaded_at) from meta_load_log')[0][0];
    const meta = { kaynak: 'lpg_tr.db', akis_satir: n, yeni_terminal: yeni, eksik, son_yukleme: son };
    for (const [kk, v] of Object.entries(meta)) db.run('insert into META_LPG_KAYNAK values (?,?)', [kk, JSON.stringify(v)]);
    db.run('commit');
    log(`LPG veritabanı uygulandı: ${n} akış satırı, ${yeni.length} yeni terminal`);
    return meta;
  } finally { L.close(); }
}

/* Masaüstü: LPG veritabanı master dosyasıyla aynı klasörde aranır (lpg_tr*.db ya da lpg_tr*.zip, en yenisi) */
function lpgDosyasiBul() {
  if (!fs) return null;
  let wd = null; try { wd = require('worker_threads').workerData; } catch (e) { return null; }
  if (!wd || !wd.db) return null;
  const dir = path.dirname(wd.db);
  let c = []; try { c = fs.readdirSync(dir).filter(f => /^lpg_tr.*\.(db|zip)$/i.test(f)).map(f => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs })); } catch (e) { return null; }
  if (!c.length) return null;
  c.sort((a, b) => b.t - a.t); let buf = fs.readFileSync(c[0].f);
  if (buf.readUInt32LE(0) === 0x04034b50) buf = zipTek(buf, /lpg_tr\.db$/i);
  return { ad: path.basename(c[0].f), buf };
}
function zipTek(buf, re) {
  const zlib = require('zlib');
  let e = -1; for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('LPG zip dosyası okunamadı.');
  let n = buf.readUInt16LE(e + 10), cd = buf.readUInt32LE(e + 16);
  if (cd === 0xFFFFFFFF || n === 0xFFFF) { const l = Number(buf.readBigUInt64LE(e - 12)); n = Number(buf.readBigUInt64LE(l + 32)); cd = Number(buf.readBigUInt64LE(l + 48)); }
  for (let i = 0, p = cd; i < n; i++) {
    const met = buf.readUInt16LE(p + 10); let cs = buf.readUInt32LE(p + 20), us = buf.readUInt32LE(p + 24); const fl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), kl = buf.readUInt16LE(p + 32);
    let lo = buf.readUInt32LE(p + 42); const ad = buf.toString('utf8', p + 46, p + 46 + fl);
    if (cs === 0xFFFFFFFF || us === 0xFFFFFFFF || lo === 0xFFFFFFFF) { let x = p + 46 + fl; const xe = x + xl;
      while (x < xe) { const id = buf.readUInt16LE(x), sz = buf.readUInt16LE(x + 2); if (id === 1) { let q = x + 4;
        if (us === 0xFFFFFFFF) { us = Number(buf.readBigUInt64LE(q)); q += 8; } if (cs === 0xFFFFFFFF) { cs = Number(buf.readBigUInt64LE(q)); q += 8; } if (lo === 0xFFFFFFFF) lo = Number(buf.readBigUInt64LE(q)); } x += 4 + sz; } }
    if (re.test(ad) && !/__MACOSX/.test(ad)) { const v = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28), ham = buf.subarray(v, v + cs);
      return met === 0 ? Buffer.from(ham) : zlib.inflateRawSync(ham); }
    p += 46 + fl + xl + kl;
  }
  throw new Error('LPG zip içinde lpg_tr.db yok.');
}

function run(SQL, dbBytes, resDir, log = () => {}, opt = {}) {
  const db = new SQL.Database(dbBytes);
  /* LPG veritabanı (varsa) master'ın LPG tablolarının yerini alır */
  let LPGK = {};
  { let lb = opt.lpg ? { ad: opt.lpgAd || 'lpg_tr.db', buf: opt.lpg } : null;
    if (!lb) { try { lb = lpgDosyasiBul(); } catch (e) { log('LPG veritabanı okunamadı: ' + e.message); } }
    if (lb) { log('LPG veritabanı uygulanıyor (' + lb.ad + ')'); const m = lpgUyarla(SQL, db, lb.buf, log); LPGK = { kaynak: 'lpg_tr.db', ad: lb.ad, tarih: String(m.son_yukleme || '').slice(0, 10) }; } }
  const Q = (sql) => { const r = db.exec(sql); if (!r.length) return []; const { columns, values } = r[0];
    return values.map(v => { const o = {}; columns.forEach((c, i) => { o[c] = v[i]; }); return o; }); };
  const QA = (sql) => { const r = db.exec(sql); return r.length ? r[0].values : []; };
  const tableCols = (t) => Q(`pragma table_info(${t})`).map(r => r.name);
  const hasTable = (t) => QA(`select count(*) from sqlite_master where name='${t}'`)[0][0] > 0;

  /* ---------------- extract9 ---------------- */
  for (const t of ['FACT_AKARYAKIT_AKIS', 'FACT_LPG_AKIS', 'DIM_TERMINAL', 'DIM_SIRKET']) if (!hasTable(t)) throw new Error(`Bu dosyada ${t} tablosu yok. PDM teslimatındaki Enerji Master veritabanını (enerji_master_2025.db) seçin.`);
  log('İller ve terminaller');
  const il = Q(`select i.Il_ID,i.Il_Adi,i.Bolge,
 (select sum(Miktar_ton) from FACT_LPG_AKIS f where f.Il_ID=i.Il_ID) lt,
 (select sum(Ton_km) from FACT_LPG_AKIS f where f.Il_ID=i.Il_ID) ltk,
 (select sum(Maliyet_Esdeger_Ton_km) from FACT_LPG_AKIS f where f.Il_ID=i.Il_ID) lmk,
 (select sum(case when Depolama_ID is not null then Miktar_ton else 0 end) from FACT_LPG_AKIS f where f.Il_ID=i.Il_ID) ldt,
 (select sum(Miktar_ton) from FACT_AKARYAKIT_AKIS a where a.Il_ID=i.Il_ID and a.Urun in ('Benzin','Motorin')) at,
 (select sum(Leg2_Ton_km) from FACT_AKARYAKIT_AKIS a where a.Il_ID=i.Il_ID and a.Urun in ('Benzin','Motorin')) atk,
 p.Otogaz_Penetrasyonu op, p.Akaryakit_Ithal_Payi aip
 from DIM_IL i left join v_il_enerji_profili p using(Il_ID) order by Il_ID`);
  const miss = il.filter(r => !has(CO, r.Il_Adi)).map(r => r.Il_Adi);
  if (miss.length) throw new Error('Koordinatı olmayan il: ' + miss.join(', '));
  const IL = il.map(r => [r.Il_ID, r.Il_Adi, r.Bolge, ...CO[r.Il_Adi], pr(r.lt || 0), pr(r.ltk || 0), pr(r.lmk || 0), pr(r.ldt || 0), pr(r.at || 0), pr(r.atk || 0), pr(r.op || 0, 4), pr(r.aip || 0, 4)]);
  const KO = {}; for (const r of csv(typeof resDir === 'object' ? { text: resDir['terminal_depo_koordinat.csv'] } : path.join(resDir, 'terminal_depo_koordinat.csv'))) KO[r.Tesis_ID] = r;
  const IK = {}; for (const r of csv(typeof resDir === 'object' ? { text: resDir['ilce_koordinat.csv'] } : path.join(resDir, 'ilce_koordinat.csv'))) IK[r.Ilce_ID] = r;
  for (const t of Q('select Terminal_ID,Ilce_ID,Enlem,Boylam from DIM_TERMINAL')) {
    if (has(KO, t.Terminal_ID)) continue;
    const i = IK[t.Ilce_ID];
    KO[t.Terminal_ID] = { Enlem: i ? i.Enlem : t.Enlem, Boylam: i ? i.Boylam : t.Boylam, Ilce: i ? i.Ilce : '', Il_Adi: i ? i.Il_Adi : '', Dogruluk: i ? i.Dogruluk : 'İl merkezi' };
  }
  const tt = (x) => { if (!x) return x; const lo = x.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
    return lo.split(' ').map(w => w ? (({ i: 'İ', 'ı': 'I' })[w[0]] || w[0].toUpperCase()) + w.slice(1) : w).join(' '); };
  const term = Q("select t.*, h.Akaryakit_ton, h.LPG_Arz_ton from DIM_TERMINAL t left join v_terminal_hub h using(Terminal_ID) where coalesce(t.Tesis_Tipi,'')<>'Havalimanı teslim noktası' order by Terminal_ID");
  const HAVA = Q('select h.Terminal_ID,h.IATA,h.Havalimani_Adi,h.Il_ID,h.Enlem,h.Boylam,h.Toplam_m3,h.Gumruklu_m3 from REF_HAVALIMANI h order by h.Toplam_m3 desc');
  const aix = new Map(); HAVA.forEach((h, i) => { if (!aix.has(h.Terminal_ID)) aix.set(h.Terminal_ID, i); });
  HAVA.forEach((h, i) => aix.set(h.Terminal_ID, i));   // Python dict: son değer kalır
  const AIR = HAVA.map(h => [h.IATA, h.Havalimani_Adi, h.Il_ID, h.Enlem, h.Boylam, pr(h.Toplam_m3 || 0), pr(h.Gumruklu_m3 || 0)]);
  const hubs = [], hidx = new Map(), hkey = (k) => JSON.stringify([k.Enlem, k.Boylam]);
  for (const t of term) {
    const k = KO[t.Terminal_ID], key = hkey(k);
    if (!hidx.has(key)) { hidx.set(key, hubs.length); hubs.push({ ad: `${tt(k.Ilce)} (${k.Il_Adi})`, kume: t.Liman_Kumesi, lat: parseFloat(k.Enlem), lon: parseFloat(k.Boylam), dog: k.Dogruluk, il: t.Il_ID, t: [] }); }
    hubs[hidx.get(key)].t.push([t.Terminal_ID, t.Terminal_Adi, t.Akaryakit, t.LPG, t.Tesis_Tipi, t.Isletmeci_Grup, pr(t.Akaryakit_EPDK_Kapasite_m3 || 0), pr(t.LPG_Kapasite_m3 || 0), t.EPDK_Tarifeli, t.Donem_Disi]);
  }
  const TERM = term.map(t => [t.Terminal_ID, t.Terminal_Adi, 0, t.Akaryakit, t.LPG]);
  const tix = new Map(); term.forEach((t, i) => tix.set(t.Terminal_ID, i));
  const tid2h = new Map(); for (const t of term) tid2h.set(t.Terminal_ID, hidx.get(hkey(KO[t.Terminal_ID])));
  const sir = Q('select Sirket_ID, coalesce(Sirket_Adi,Sirket_ID) ad, Grup from DIM_SIRKET');
  const sad = new Map(); for (const s of sir) sad.set(s.Sirket_ID, [s.ad, s.Grup]);
  const used = new Set();
  for (const r of Q('select distinct Sirket_ID from FACT_LPG_AKIS union select distinct Sirket_ID from FACT_AKARYAKIT_AKIS')) used.add(r.Sirket_ID);
  for (const r of Q("select distinct Sirket_ID from v_sirket_urun_grubu where Sirket_ID is not null and Kalem='Satış'")) used.add(r.Sirket_ID);
  for (const r of Q('select distinct Alici_Sirket_ID s from FACT_LPG_TEDARIK union select distinct Tedarikci_Sirket_ID from FACT_LPG_TEDARIK where Tedarikci_Sirket_ID is not null')) used.add(r.s);
  for (const t of ['REF_LPG_BAYI', 'FACT_LPG_IHRACAT']) if (hasTable(t)) for (const r of Q(`select distinct Sirket_ID s from ${t} where Sirket_ID is not null`)) used.add(r.s);
  const SL = [...used].sort(cmp); const sidx = new Map(); SL.forEach((s, i) => sidx.set(s, i));
  const sg = (s, d = -1) => (sidx.has(s) ? sidx.get(s) : d);
  const SIR = SL.map(s => [s, (sad.get(s) || [s, null])[0], (sad.get(s) || [s, null])[1]]);
  const dep = Q('select * from REF_LPG_DEPO_KULLANIM');
  const didx = new Map(); dep.forEach((d, i) => didx.set(d.Depolama_ID, i));
  const DEP = dep.map(d => [d.Depolama_ID, (sad.get(d.Sirket_ID) || [d.Sirket_ID])[0], d.Il_ID, d.Ilce, pr(d.Kapasite_ton_yil || 0), pr(d.Atanan_ton || 0), d.Ic_Depo, d.Acik_Erisim, parseFloat(KO[d.Depolama_ID].Enlem), parseFloat(KO[d.Depolama_ID].Boylam)]);
  log('LPG akışı');
  const ly = tableCols('FACT_LPG_AKIS').includes('Yonlendiren_Sirket_ID') ? 'Yonlendiren_Sirket_ID' : 'NULL';
  const lf = Q('select Sirket_ID,Terminal_ID,Depolama_ID,Il_ID,Tedarik_Tipi,Urun,sum(Miktar_ton) t,sum(Ton_km) tk,sum(Maliyet_Esdeger_Ton_km) mk,sum(Miktar_ton*coalesce(Primer_km,0)) pk,sum(Miktar_ton*coalesce(Sekonder_km,0)) sk from FACT_LPG_AKIS group by 1,2,3,4,5,6');
  const LFS = Q(`select Sirket_ID,Terminal_ID,${ly} y,sum(Miktar_ton) t,count(distinct Il_ID) n,sum(Ton_km) tk from FACT_LPG_AKIS where Tedarik_Tipi='Dağıtıcı alımı' group by 1,2,3`)
    .filter(r => r.t > 0.5).map(r => [sidx.get(r.Sirket_ID), tix.get(r.Terminal_ID), sg(r.y), pr(r.t, 1), r.n, pr(r.tk / r.t, 1)]);
  const TTL = { 'Kendi ithalatı': 0, 'Dağıtıcı alımı': 1, 'Rafineri alımı': 2, 'Stoktan satış': 3 }, LU = { 'LPG-Otogaz': 0, 'LPG-Tüplü': 1, 'LPG-Dökme': 2 };
  const LF = lf.filter(r => r.t > 0).map(r => [sidx.get(r.Sirket_ID), tix.get(r.Terminal_ID), r.Depolama_ID ? didx.get(r.Depolama_ID) : -1, r.Il_ID, TTL[r.Tedarik_Tipi], LU[r.Urun], pr(r.t, 1), pr(r.tk / r.t, 1), pr(r.mk / r.t, 1), pr(r.pk / r.t, 1), pr(r.sk / r.t, 1)]);
  log('Akaryakıt akışı');
  const af = Q(`select Sirket_ID,Terminal_ID,Il_ID,Urun,Kaynak_ID,Leg1_Tasima_Modu,Teslim_Noktasi_ID,case when Leg1_Tasima_Modu like 'Rafineri tahsisinden%' then Yonlendiren_Sirket_ID end y,coalesce(Leg1_Tasiyan_Tipi,'?') tt,Leg1_Tasiyan_Sirket_ID ts,max(case when Dagilim_Yontemi like 'Tahmin%' then 1 else 0 end) est,sum(Miktar_ton) t,sum(Leg2_Ton_km) tk,sum(coalesce(Ithal_ton,0)) it from FACT_AKARYAKIT_AKIS group by 1,2,3,4,5,6,7,8,9,10`);
  const AUR = { 'Benzin': 0, 'Motorin': 1, 'Fuel Oil': 2, 'Havacılık': 3, 'Denizcilik': 4, 'Gazyağı': 5, 'Diğer': 6 };
  const KAY = Q('select Kaynak_ID,Kaynak_Adi,Kaynak_Tipi,Sirket_ID from DIM_KAYNAK order by Kaynak_ID');
  const kix = new Map(); KAY.forEach((k, i) => kix.set(k.Kaynak_ID, i));
  const TTX = new Map();
  const MODS = [...new Set(af.map(r => r.Leg1_Tasima_Modu || '?'))].sort(cmp);
  const mix = new Map(); MODS.forEach((m, i) => mix.set(m, i));
  const AF = af.filter(r => r.t > 0).map(r => {
    if (!TTX.has(r.tt)) TTX.set(r.tt, TTX.size);
    return [sidx.get(r.Sirket_ID), tix.get(r.Terminal_ID), r.Il_ID, AUR[r.Urun], kix.get(r.Kaynak_ID), mix.get(r.Leg1_Tasima_Modu || '?'), pr(r.t, 1), r.t ? pr(r.tk / r.t, 1) : 0, r.est,
      aix.has(r.Teslim_Noktasi_ID) ? aix.get(r.Teslim_Noktasi_ID) : -1, pr(r.it, 1), r.y ? sg(r.y) : -1, TTX.get(r.tt), r.ts ? sg(r.ts) : -1];
  });
  const LTED = Q('select * from FACT_LPG_TEDARIK').filter(r => r.Ton >= 1)
    .map(r => [sg(r.Alici_Sirket_ID), r.Tedarikci_Tipi, r.Tedarikci_Sirket_ID ? (sad.get(r.Tedarikci_Sirket_ID) || [null])[0] : null, r.Tedarikci_Terminal_ID ? (tix.has(r.Tedarikci_Terminal_ID) ? tix.get(r.Tedarikci_Terminal_ID) : -1) : -1, pr(r.Ton)])
    .filter(x => x[0] >= 0);
  const urun = Q('select distinct Urun from FACT_AKARYAKIT_AKIS');
  const KAN = Q('select Il_ID,Urun,Kanal,sum(Miktar_ton) t from FACT_AKARYAKIT_KANAL where Modelde=1 group by 1,2,3').filter(r => r.t > 0).map(r => [r.Il_ID, r.Urun, r.Kanal, pr(r.t)]);
  for (const t of term) TERM[tix.get(t.Terminal_ID)][2] = tid2h.get(t.Terminal_ID);
  const UG = Q('select * from v_urun_grubu_denge').map(r => [r.Urun_Grubu_ID, r.Urun_Grubu, r.Il_Duzeyi, pr(r.Satis_Toplam_ton), pr(r.Satis_Dagitici_ton), pr(r.Satis_Rafinerici_ton), pr(r.Satis_Ihrakiye_Lisansi_ton), pr(r.Ithalat_ton), pr(r.Ihracat_ton), pr(r.Ihrakiye_Yabanci_ton), pr(r.Rafineri_Yurtici_Toptan_ton), pr(r.Model_Satis_ton)]);
  const KL = { 'Satış': 0, 'İthalat': 1, 'İhracat': 2, 'İhrakiye (yabancı)': 3 }; const UGI = new Map(); UG.forEach((u, i) => UGI.set(u[0], i));
  const SEP = Q('select Sirket_ID,Urun_Grubu_ID,Kalem,sum(Miktar_ton) t from v_sirket_urun_grubu where Sirket_ID is not null group by 1,2,3')
    .filter(r => sidx.has(r.Sirket_ID) && r.t >= 1).map(r => [sidx.get(r.Sirket_ID), UGI.get(r.Urun_Grubu_ID), KL[r.Kalem], pr(r.t)]);

  log('Bayiler');
  const paylar = (sql) => { const t = new Map();
    for (const r of Q(sql)) if (r.t > 0 && tix.has(r.Terminal_ID)) { const k = r.Sirket_ID + '\u0001' + r.Il_ID; if (!t.has(k)) t.set(k, new Map()); t.get(k).set(r.Terminal_ID, r.t); }
    return t; };
  const PA = {
    0: paylar("select Sirket_ID,Il_ID,Terminal_ID,sum(Miktar_ton) t from FACT_AKARYAKIT_AKIS where Satis_Turu<>'Yabancıya ihrakiye' and Urun='Benzin' group by 1,2,3"),
    1: paylar("select Sirket_ID,Il_ID,Terminal_ID,sum(Miktar_ton) t from FACT_AKARYAKIT_AKIS where Satis_Turu<>'Yabancıya ihrakiye' and Urun='Motorin' group by 1,2,3"),
    2: paylar("select Sirket_ID,Il_ID,Terminal_ID,sum(Miktar_ton) t from FACT_AKARYAKIT_AKIS where Satis_Turu<>'Yabancıya ihrakiye' and Urun in ('Benzin','Motorin') group by 1,2,3"),
    3: paylar("select Sirket_ID,Il_ID,Terminal_ID,sum(Miktar_ton) t from FACT_LPG_AKIS where Urun='LPG-Otogaz' group by 1,2,3") };
  const KS = new Map(); for (const r of Q('select Sirket_ID,Konsolide_Sirket_ID from DIM_SIRKET')) KS.set(r.Sirket_ID, r.Konsolide_Sirket_ID);
  const ksg = (s) => (KS.has(s) ? KS.get(s) : s);
  const TI = new Map(); for (const r of Q('select Terminal_ID,Ilce_ID from DIM_TERMINAL')) TI.set(r.Terminal_ID, r.Ilce_ID);
  const tko = (t) => { const k = KO[t]; if (k && k.Enlem) return [parseFloat(k.Enlem), parseFloat(k.Boylam)]; const i = IK[TI.get(t)]; return i ? [parseFloat(i.Enlem), parseFloat(i.Boylam)] : null; };
  const iko = (i) => { const r = IK[i]; return r ? [parseFloat(r.Enlem), parseFloat(r.Boylam)] : null; };
  const rad = (x) => x * Math.PI / 180;
  const km = (a, b) => { if (!a || !b) return 9e9; const dl = rad(b[0] - a[0]), dg = rad(b[1] - a[1]);
    const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  const ist = new Map();
  for (const r of Q("select Istasyon_ID,Sektor,Sirket_ID,Il_ID,Ilce_ID from FACT_BAYI_LISANS where Alt_Baslik<>'İhrakiye'")) {
    if (!ist.has(r.Istasyon_ID)) ist.set(r.Istasyon_ID, {});
    ist.get(r.Istasyon_ID)[r.Sektor] = [r.Sirket_ID, r.Il_ID, r.Ilce_ID];
  }
  const BY = [], BYX = {};
  const dag = (tur, lis, pa) => {
    const g = new Map();
    for (const [sid, il_, ilce] of lis) { const k = sid + '\u0001' + il_; if (!g.has(k)) g.set(k, { sid, il: il_, m: new Map() }); const m = g.get(k).m; m.set(ilce, (m.get(ilce) || 0) + 1); }
    const out = new Map();
    for (const [k, o] of g) {
      const ilc = o.m; let n = 0; for (const v of ilc.values()) n += v;
      const p = pa.get(k);
      if (!p || !sidx.has(o.sid)) { BYX[tur] = (BYX[tur] || 0) + n; continue; }
      let top = 0; for (const v of p.values()) top += v;
      const q = new Map(), kap = new Map();
      for (const [t, v] of p) { q.set(t, n * v / top); kap.set(t, Math.trunc(n * v / top)); }
      let sk = 0; for (const v of kap.values()) sk += v;
      const ord = [...q.keys()].sort((a, b) => (q.get(b) - kap.get(b)) - (q.get(a) - kap.get(a)));
      for (const t of ord.slice(0, Math.max(0, n - sk))) kap.set(t, kap.get(t) + 1);
      const kal = new Map(ilc);
      const cand = [];
      for (const t of kap.keys()) for (const i of ilc.keys()) cand.push([km(tko(t), iko(i)), t, i]);
      cand.sort((a, b) => (a[0] - b[0]) || cmp(a[1], b[1]) || cmp(a[2], b[2]));
      for (const [, t, i] of cand) { const x = Math.min(kap.get(t), kal.get(i));
        if (x) { kap.set(t, kap.get(t) - x); kal.set(i, kal.get(i) - x); const ok = o.sid + '\u0001' + t + '\u0001' + o.il; if (!out.has(ok)) out.set(ok, [o.sid, t, o.il, 0]); out.get(ok)[3] += x; } }
    }
    for (const [sid, t, il_, x] of out.values()) BY.push([sidx.get(sid), tix.get(t), il_, tur, x]);
  };
  const vals = [...ist.values()];
  const A = vals.filter(v => has(v, 'Akaryakıt')).map(v => v['Akaryakıt']);
  const L = vals.filter(v => has(v, 'LPG')).map(v => v.LPG);
  for (const tur of [0, 1, 2]) dag(tur, A, PA[tur]);
  dag(3, L, PA[3]);
  dag(4, A, PA[2]); dag(4, vals.filter(v => !has(v, 'Akaryakıt') && has(v, 'LPG')).map(v => v.LPG), PA[3]);
  dag(5, vals.filter(v => has(v, 'Akaryakıt') && has(v, 'LPG') && ksg(v.LPG[0]) !== ksg(v['Akaryakıt'][0])).map(v => v.LPG), PA[3]);

  const TK = [];
  if (hasTable('REF_ITHALAT_TAKAS')) for (const r of Q('select Urun,Satici_Sirket_ID,Giris_Terminal_ID,Alici_Sirket_ID,Alici_Terminal_ID,Il_ID,sum(Miktar_ton) t from REF_ITHALAT_TAKAS group by 1,2,3,4,5,6'))
    if (sidx.has(r.Satici_Sirket_ID) && sidx.has(r.Alici_Sirket_ID) && tix.has(r.Giris_Terminal_ID) && tix.has(r.Alici_Terminal_ID))
      TK.push([sidx.get(r.Satici_Sirket_ID), tix.get(r.Giris_Terminal_ID), sidx.get(r.Alici_Sirket_ID), tix.get(r.Alici_Terminal_ID), r.Il_ID, AUR[r.Urun], pr(r.t, 1)]);
  const TR = [];
  if (hasTable('REF_ITHALAT_TERMINAL_HEDEF')) for (const r of Q("select Sirket_ID,Terminal_ID,Kural,Urun from REF_ITHALAT_TERMINAL_HEDEF where Kural like 'İç terminale transfer (%'")) {
    const m = /\((T\d+)\)/.exec(r.Kural);
    if (m && tix.has(m[1]) && tix.has(r.Terminal_ID) && sidx.has(r.Sirket_ID)) TR.push([sidx.get(r.Sirket_ID), tix.get(m[1]), tix.get(r.Terminal_ID), AUR[r.Urun]]);
  }
  const LITH = Q('select Sirket_ID,Terminal_ID,Gumruk_Grubu g,sum(Ithalat_ton) t from FACT_LPG_ITHALAT group by 1,2,3').filter(r => r.t >= 1).map(r => [sidx.get(r.Sirket_ID), tix.get(r.Terminal_ID), r.g || '?', pr(r.t)]);
  const LULKE = Q('select Country c,"2024" a,"2025" b from REF_LPG_ITHALAT_ULKE where Country not in (\'TOTAL\',\'PDF total\')').filter(r => (r.b || 0) > 0).map(r => [r.c, r.a || 0, r.b || 0]);
  const LAY = Q('select "Month (TR)" m,"Production 2025" p,"Imports 2025" i,"Exports 2025" e,"Sales 2025 – total" s from REF_LPG_ULUSAL_AYLIK where "Imports 2025" is not null and Month<>\'Total\'').map(r => [r.m, r.p || 0, r.i || 0, r.e || 0, r.s || 0]);   // yalnız 2025
  const LYIL = Q('select Year y,"Production t" p,"Imports t" i,"Exports t" e,"Sales total t" s from REF_LPG_ULUSAL_YILLIK where Year=\'2025\'').map(r => [r.y, r.p, r.i, r.e, r.s]);
  const LURET = hasTable('FACT_LPG_URETIM') ? Q('select Terminal_ID t, sum(Uretim_ton) v from FACT_LPG_URETIM group by 1').filter(r => tix.has(r.t)).map(r => [tix.get(r.t), pr(r.v)]) : [];
  const LIHR = hasTable('FACT_LPG_IHRACAT') ? Q('select Terminal_ID t, Sirket_ID s, sum(Ton) v from FACT_LPG_IHRACAT group by 1,2').filter(r => r.v >= 1).map(r => [r.t && tix.has(r.t) ? tix.get(r.t) : -1, sidx.has(r.s) ? sidx.get(r.s) : -1, pr(r.v)]) : [];
  const LTAS = hasTable('REF_LPG_TASIMA_OZET') ? QA('select Mod, Bacak, Ton, Ton_km, Navlun_USD, Sefer from REF_LPG_TASIMA_OZET').map(r => [r[0], r[1], pr(r[2]), pr(r[3]), pr(r[4]), pr(r[5] || 0)]) : [];
  const LBAY = hasTable('REF_LPG_BAYI') ? Q('select Il_ID i, Sirket_ID s, sum(Bayi) n from REF_LPG_BAYI group by 1,2').filter(r => sidx.has(r.s)).map(r => [r.i, sidx.get(r.s), r.n]) : [];
  const d = { luret: LURET, lihr: LIHR, ltas: LTAS, lbay: LBAY, lpgk: LPGK, lfs: LFS, lith: LITH, lulke: LULKE, lay: LAY, lyil: LYIL, tty: [...TTX.keys()], tr: TR, tk: TK, by: BY, byx: BYX, air: AIR, ug: UG, sep: SEP, term: TERM,
    kay: KAY.map(k => [k.Kaynak_ID, k.Kaynak_Adi, k.Kaynak_Tipi, sg(k.Sirket_ID)]), mod: MODS, lted: LTED, il: IL, hub: hubs, sir: SIR, dep: DEP, lf: LF, af: AF, urun: urun.map(u => u.Urun), kan: KAN };

  /* ---------------- konsolide ---------------- */
  log('Konsolidasyon');
  const K = QA('SELECT Sirket_ID, Konsolide_Sirket_ID FROM DIM_SIRKET WHERE Konsolide_Sirket_ID<>Sirket_ID');
  const KAD = new Map(); if (tableCols('DIM_SIRKET').includes('Konsolide_Adi')) for (const [a, b] of QA('SELECT Sirket_ID, Konsolide_Adi FROM DIM_SIRKET')) KAD.set(a, b);
  const ixs = new Map(); d.sir.forEach((s, i) => ixs.set(s[0], i));
  const m = new Map(); for (const [b, a] of K) if (ixs.has(b) && ixs.has(a)) m.set(ixs.get(b), ixs.get(a));
  const uye = new Map(); for (const [b, a] of m) { if (!uye.has(a)) uye.set(a, []); uye.get(a).push(d.sir[b][1]); }
  for (const t of ['af', 'lf', 'sep', 'by']) for (const r of d[t]) if (m.has(r[0])) r[0] = m.get(r[0]);
  for (const r of d.af) { if (r.length > 11 && m.has(r[11])) r[11] = m.get(r[11]); if (r.length > 13 && m.has(r[13])) r[13] = m.get(r[13]); }
  for (const r of d.tr) if (m.has(r[0])) r[0] = m.get(r[0]);
  for (const r of d.tk) { if (m.has(r[0])) r[0] = m.get(r[0]); if (m.has(r[2])) r[2] = m.get(r[2]); }
  for (const k of d.kay) if (m.has(k[3])) k[3] = m.get(k[3]);
  // db_110: görünen ad konsolide ad (S011 → Bpet); tüzel kişi adı panelde görünmez
  for (const [a] of uye) { const ana = d.sir[a][1], marka = KAD.get(d.sir[a][0]) || ana;
    d.sir[a][1] = marka; if (marka !== ana) for (const k of d.kay) if (k[3] === a && k[1] === ana) k[1] = marka; }
  { const sp = new Map(); for (const r of d.sep) { const k = r.slice(0, 3).join('|'); if (!sp.has(k)) sp.set(k, [r[0], r[1], r[2], 0]); sp.get(k)[3] += r[3]; } d.sep = [...sp.values()]; }

  /* ---------------- fizik ---------------- */
  log('Fiziksel kaynak');
  { const MOD = d.mod, KY = d.kay, TM = d.term;
    const devir = new Set(); MOD.forEach((x, i) => { if (/^(Terminal içi devir|Dağıtıcıdan alım|Grup içi alım)/.test(x)) devir.add(i); });
    const dagS = new Set(); KY.forEach((k, i) => { if (String(k[2]).startsWith('Dağıtıcı')) dagS.add(i); });
    const raf = new Map(); KY.forEach((k, i) => { if (k[2] === 'Rafineri') raf.set(k[1], i); });
    const fiz = (r) => !(dagS.has(r[4]) && devir.has(r[5]));
    const add = (M, key, k, v) => { if (!M.has(key)) M.set(key, new Map()); const w = M.get(key); w.set(k, (w.get(k) || 0) + v); };
    const agir = new Map(), agirS = new Map();
    for (const r of d.af) if (fiz(r)) { add(agir, r[1] + '|' + r[3], r[4], r[6]); add(agirS, r[1] + '|' + r[3] + '|' + r[0], r[4], r[6]); }
    for (const r of d.af) { const y = r.length > 11 ? r[11] : -1; const v = (!fiz(r) && KY[r[4]][3] >= 0) ? KY[r[4]][3] : (y >= 0 ? y : r[0]); if (r.length > 11) r[11] = v; else r.push(v); }
    const amax = (w) => { let bk = null, bv = -Infinity; for (const [k, v] of w) if (v > bv) { bv = v; bk = k; } return bk; };
    for (const r of d.af) {
      if (fiz(r)) continue;
      if (MOD[r[5]].startsWith('Dağıtıcıdan alım (takas')) continue;
      const ad = TM[r[1]][1];
      let w = agirS.get(r[1] + '|' + r[3] + '|' + r[11]) || agir.get(r[1] + '|' + r[3]) || null;
      let k = (w && w.size) ? amax(w) : (() => { for (const [a, i] of raf) if (ad.startsWith(a)) return i; return null; })();
      if (k === null) { if (!(w && w.size)) { w = new Map(); for (const [key, x] of agir) if (key.split('|')[0] === String(r[1])) for (const [kk, v] of x) w.set(kk, (w.get(kk) || 0) + v); }
        k = w.size ? amax(w) : null; }
      if (k !== null && k !== r[4]) r[4] = k;
    }
  }

  /* ---------------- bayi ---------------- */
  { const six = new Map(); d.sir.forEach((s, i) => six.set(s[0], i));
    const rows = QA(`select coalesce(s.Konsolide_Sirket_ID,b.Sirket_ID), b.Il_ID, b.Sektor, b.Istasyon_ID from FACT_BAYI_LISANS b left join DIM_SIRKET s on s.Sirket_ID=b.Sirket_ID where b.Alt_Baslik<>'İhrakiye'`);
    const st = new Map();
    for (const [sid, il_, sek, is] of rows) for (const k of [six.has(sid) ? six.get(sid) : -2, -1]) { if (k === -2) continue;
      const key = k + '|' + il_; if (!st.has(key)) st.set(key, { k, il: il_, s: [new Set(), new Set(), new Set()] }); const o = st.get(key).s; o[sek === 'Akaryakıt' ? 0 : 1].add(is); o[2].add(is); }
    d.bi = [...st.values()].sort((a, b) => (a.k - b.k) || (a.il - b.il)).map(o => [o.k, o.il, o.s[0].size, o.s[1].size, o.s[2].size]); }
  /* terminal depolama lisans numaraları (bayi.py ile aynı) */
  { const ok = (x) => x != null && !['', '—', '-'].includes(String(x).trim()); const TL = new Map();
    for (const [tid, al, ll, tt] of QA('select Terminal_ID, Akaryakit_Lisans_No, LPG_Lisans_No, Tesis_Tipi from DIM_TERMINAL')) { const sp = (x) => (ok(x) ? String(x).split(';').map((y) => y.trim()).filter(ok) : []); TL.set(tid, [sp(al), sp(ll), tt || '']); }
    if (hasTable('FACT_DEPOLAMA')) for (const [tid, sek, no] of QA('select Terminal_ID, Sektor, Lisans_No from FACT_DEPOLAMA where Terminal_ID is not null and Lisans_No is not null order by Lisans_No')) {
      if (TL.has(tid) && ok(no)) { const L = TL.get(tid)[sek === 'LPG' ? 1 : 0]; if (!L.includes(no.trim())) L.push(no.trim()); } }
    d.tlis = d.term.map((t) => TL.get(t[0]) || [[], [], '']); }
  /* terminal künyesi – Terminaller sayfaları (bayi.py ile aynı) */
  { const KS = new Map(QA('select Sirket_ID, coalesce(Konsolide_Sirket_ID, Sirket_ID) from DIM_SIRKET'));
    const SAD = new Map(d.sir.map((x) => [x[0], x[1]])); for (const [a, b] of QA("select Sirket_ID, coalesce(nullif(Konsolide_Adi,''), Sirket_Adi) from DIM_SIRKET")) if (!SAD.has(a)) SAD.set(a, b);
    const KAP = new Map(hasTable('REF_TERMINAL_KAPASITE') ? QA('select Terminal_ID, Doluluk, Devir, Kapasite_ton from REF_TERMINAL_KAPASITE').map((r) => [r[0], r.slice(1)]) : []);
    const LIT = new Map(hasTable('FACT_LPG_ITHALAT') ? QA('select Terminal_ID, sum(Ithalat_ton) from FACT_LPG_ITHALAT group by 1') : []);
    const STK = new Map(hasTable('REF_TERMINAL_STOK') ? QA('select Terminal_ID, sum(Acilis_Stok_ton), sum(Kapanis_Stok_ton) from REF_TERMINAL_STOK group by 1').map((r) => [r[0], r.slice(1)]) : []);
    const DSA = new Map(); if (hasTable('FACT_DEPOLAMA')) for (const [t, sid] of QA('select Terminal_ID, Sirket_ID from FACT_DEPOLAMA where Terminal_ID is not null and Sirket_ID is not null order by coalesce(Kapasite_m3,0)')) DSA.set(t, sid);
    const TM = new Map();
    for (const r of QA(`select Terminal_ID, Ilce, Akaryakit_Terminal_Turu, Akaryakit_EPDK_Kapasite_m3, LPG_Kapasite_m3, LPG_Terminal_Tipi, LPG_Rol, Tesis_Tipi, Akaryakit_Isletmeci, EPDK_Tarifeli from DIM_TERMINAL`)) {
      const t = r[0], k = KAP.get(t) || [null, null, null], st = STK.get(t) || [null, null], io = r[8] || DSA.get(t), isl = io ? (SAD.get(KS.has(io) ? KS.get(io) : io) || '') : '';
      TM.set(t, ['', r[2] || '', pr(r[3] || 0), pr(r[4] || 0), r[5] || '', r[6] || '', r[7] || '', isl, k[0] != null ? pr(k[0], 3) : null, k[1], pr(k[2] || 0), pr(LIT.get(t) || 0, 1), pr(st[0] || 0, 1), pr(st[1] || 0, 1), r[9] || '']); }
    d.tmeta = d.term.map((t) => TM.get(t[0]) || ['', '', 0, 0, '', '', '', '', null, null, 0, 0, 0, 0, '']); }

  /* ---------------- tahsis_gen ---------------- */
  log('Tedarik tahsisi');
  const tah = (() => {
    const six = new Map(); d.sir.forEach((s, i) => six.set(s[0], i)); const tx = new Map(); d.term.forEach((t, i) => tx.set(t[0], i));
    const KK = new Map(); for (const [a, b] of QA('select Sirket_ID, coalesce(Konsolide_Sirket_ID,Sirket_ID) from DIM_SIRKET')) KK.set(a, b);
    const ks = (s) => (s ? (six.has(KK.has(s) ? KK.get(s) : s) ? six.get(KK.has(s) ? KK.get(s) : s) : -1) : -1);
    const U = { Benzin: 0, Motorin: 1 }, TP = { 'Kendi ithalatı': 0, 'Rafineri': 1, 'Dağıtıcı': 2 };
    const sat = [], mod = [], zn = [], zs = new Map(); const ix = (Lst, v) => { const i = Lst.indexOf(v); if (i >= 0) return i; Lst.push(v); return Lst.length - 1; };
    const g = new Map(), til = new Map(), tpv = new Map(), sin = {};
    for (const [a, cls, il_, u, st, sa, ssid, rf, t, md, nk, ton, kural] of QA(`select Alici_Sirket_ID,Alici_Sinif,Il_ID,Urun,Satici_Tipi,Satici,Satici_Sirket_ID,Rafineri,Terminal_ID,Leg1_Tasima_Modu,Navlun_Endeksi_km,Miktar_ton,Kural
        from REF_TEDARIK_TAHSIS where Urun in ('Benzin','Motorin') and Miktar_ton>0`)) {
      const ai = ks(a);
      if (ai < 0 || (t !== null && !tx.has(t))) continue;
      const sk = String(ai); const cv = cls || 'E'; sin[sk] = has(sin, sk) ? (sin[sk] < cv ? sin[sk] : cv) : ('Z' < cv ? 'Z' : cv);
      const ad = st === 'Kendi ithalatı' ? 'Kendi ithalatı' : st === 'Rafineri' ? (rf || sa) : (ks(ssid) >= 0 ? d.sir[ks(ssid)][1] : sa);
      const toptan = il_ === null ? 1 : 0, ti = t !== null ? tx.get(t) : -1;
      const tp = (st === 'Dağıtıcı' && (kural || '').startsWith('Tahsis üzerinden')) ? 3 : (has(TP, st) ? TP[st] : 2);
      const zm = st === 'Dağıtıcı' ? /\(zincir: ([^;)]*)/.exec(kural || '') : null, zi = zm ? ix(zn, zm[1].trim()) : -1;
      if (zm && il_ !== null && ks(ssid) >= 0) { const zk = String(ks(ssid)); if (!zs.has(zk)) zs.set(zk, new Map()); const q = zs.get(zk); q.set(zi, (q.get(zi) || 0) + ton); }
      const key = [ai, ix(sat, ad), tp, ti, U[u], toptan, ix(mod, md || '?'), zi];
      const kk = key.join('|'); if (!g.has(kk)) g.set(kk, { key, v0: 0, ils: new Set(), v2: 0 }); const o = g.get(kk);
      o.v0 += ton; o.v2 += (nk || 0) * ton;
      if (il_ !== null) { o.ils.add(Math.trunc(il_)); const tk = `${ai}|${ti}`; if (!til.has(tk)) til.set(tk, new Set()); til.get(tk).add(Math.trunc(il_)); }
      if (st === 'Dağıtıcı' && il_ !== null && ks(ssid) >= 0 && ti >= 0) { const pk = [ks(ssid), ai, ti, U[u]]; const pkk = pk.join('|'); if (!tpv.has(pkk)) tpv.set(pkk, { pk, v: 0, ils: new Set() }); const x = tpv.get(pkk); x.v += ton; x.ils.add(Math.trunc(il_)); }
    }
    const th = [...g.values()].filter(o => o.v0 >= 0.5).map(o => [o.key[0], o.key[1], o.key[2], o.key[3], o.key[4], o.key[5], pr(o.v0, 1), o.ils.size, o.v0 ? pr(o.v2 / o.v0) : 0, o.key[6], o.key[7]]);
    const kos = {};
    for (const r of QA(`select Alici_Sirket_ID,Rafineri,Urun,Alim_ton,Kademe,Ciro_Prim_Orani,Performans_Primi_Orani,Toplam_Vade_Gun,Baz_Vade_Gun,Ek_Vade_Gun,Performans_Vade_Gun,Diger_Vade_Gun,Sonraki_Kademeye_Kalan_ton from REF_TAHSIS_RAFINERI_KOSUL`)) {
      const ai = ks(r[0]); if (ai >= 0 && has(U, r[2])) { const k = String(ai); (kos[k] = kos[k] || []).push([r[1], U[r[2]], pr(r[3] || 0), r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11], r[12]]); }
    }
    const grp = (r) => ((r || '').startsWith('Star') ? 'Star Rafineri' : (r || '').startsWith('Tüpraş') ? 'Tüpraş' : null);
    const ep = new Map(); const E = (gg, u) => { const k = gg + '|' + u; if (!ep.has(k)) ep.set(k, { g: gg, u, v: [0, 0, 0, 0, 0] }); return ep.get(k).v; };
    for (const [r, u, v] of QA(`select k.Kaynak_Adi,a.Urun,sum(a.Miktar_ton) from FACT_AKARYAKIT_AKIS a join DIM_KAYNAK k using(Kaynak_ID) where a.Urun in ('Benzin','Motorin') group by 1,2`)) if (grp(r)) E(grp(r), U[u])[0] += v || 0;
    for (const [r, u, v] of QA(`select Rafineri,Urun,sum(Miktar_ton) from REF_TEDARIK_TAHSIS where Satici_Tipi in ('Rafineri','Kendi ithalatı') and Rafineri is not null and Urun in ('Benzin','Motorin') group by 1,2`)) if (grp(r)) E(grp(r), U[u])[1] += v || 0;
    for (const [r, u, v] of QA(`select Satici,Urun,sum(Miktar_ton) from REF_TEDARIK_TAHSIS where Satici_Tipi='Rafineri' and Urun in ('Benzin','Motorin') group by 1,2`)) if (grp(r)) E(grp(r), U[u])[4] += v || 0;
    for (const [r, u, v] of QA(`select Rafineri,Urun_Turu,Serbest_Dolasim_ton from REF_EPDK_RAFINERI_TOPTAN where Urun_Turu in ('Benzin Türleri','Motorin Türleri')`)) if (grp(r)) E(grp(r), U[u.split(' ')[0]])[2] += v || 0;
    for (const [r, u, v] of QA(`select Rafineri,Urun,sum(Uretim_ton) from REF_EPDK_RAFINERI_URETIM where Rafineri<>'Toplam' group by 1,2`)) {
      const b = u.includes('Benzin') ? 'Benzin' : u.startsWith('Motorin') ? 'Motorin' : null; if (grp(r) && b) E(grp(r), U[b])[3] += v || 0; }
    const epl = [...ep.values()].sort((a, b) => cmp(a.g, b.g) || (a.u - b.u)).map(o => [o.g, o.u, ...o.v.map(x => pr(x / 1000, 1))]);
    const tilo = {}; for (const [k, v] of til) tilo[k] = v.size;
    const zso = {}; for (const [k, q] of zs) { const a = [...q].sort((x, y) => y[1] - x[1]).filter(x => x[1] >= 0.5).map(([z, t]) => [z, pr(t, 1)]); zso[k] = a; }
    return { ep: epl, th, sat, mod, sin, til: tilo, kos, zn, zs: zso, tp: [...tpv.values()].filter(x => x.v >= 0.5).map(x => [...x.pk, pr(x.v, 1), x.ils.size]) };
  })();

  /* ---------------- build_dash2: panelin tuttuğu alanlar ---------------- */
  const keep = {}; for (const k of ['term', 'kay', 'sir', 'ug', 'sep', 'af', 'lf', 'by', 'mod', 'tk']) keep[k] = d[k];
  keep.bi = d.bi || []; keep.tr = d.tr || []; keep.tty = d.tty || []; keep.lted = d.lted || [];
  for (const k of ['lith', 'lulke', 'lay', 'lyil', 'lfs', 'tlis', 'tmeta', 'luret', 'lihr', 'ltas', 'lbay', 'dep']) keep[k] = d[k] || []; keep.lpgk = d.lpgk || {};
  keep.il = d.il.map(r => [r[0], r[1]]); keep.hub = d.hub.map(h => ({ ad: h.ad, lat: h.lat, lon: h.lon }));
  const ozet = {
    akaryakit_t: QA('select sum(Miktar_ton) from FACT_AKARYAKIT_AKIS')[0][0], lpg_t: QA('select sum(Miktar_ton) from FACT_LPG_AKIS')[0][0],
    satir: QA('select count(*) from FACT_AKARYAKIT_AKIS')[0][0], terminal: d.term.length, sirket: d.sir.length };
  db.close();
  return { data: keep, full: d, tahsis: tah, ozet };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { run, pr }; else self.EnerjiPipeline = { run, pr };
