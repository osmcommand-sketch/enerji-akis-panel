// GTS masaüstü veri hattını başsız çalıştırır: node calistir.js <gts klasörü> <paket.zip> <çıktı.json>
const path=require('path'), fs=require('fs');
const [kok, zip, out]=process.argv.slice(2);
const initSqlJs=require(path.join(__dirname,'..','nm','node_modules','sql.js'));
(async()=>{ const SQL=await initSqlJs(); const G=require(path.join(kok,'gts_pipeline.js'));
  const t=Date.now(); const r=G.run(SQL, fs.readFileSync(zip), path.join(kok,'res'), m=>process.stderr.write(m+'\n'), {kok});
  const O=r.data||r; fs.writeFileSync(out, JSON.stringify(O)); console.log('ok', ((Date.now()-t)/1000).toFixed(0)+' sn', Object.keys(O).length,'anahtar'); })().catch(e=>{ console.error(e); process.exit(1); });
