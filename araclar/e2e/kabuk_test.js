// node kabuk_test.js <exe> <appdata ad> <paket> <ev> ; pano ve Satışlar / Genel bakış eşitliği
const {_electron}=require('playwright'), fs=require('fs'), path=require('path');
(async()=>{ const [exe,ad,paket,ev,tip]=process.argv.slice(2); const ud=path.join(ev,'.config',ad); fs.mkdirSync(ud,{recursive:true});
  fs.writeFileSync(path.join(ud,'durum.json'),JSON.stringify({son:paket,sonlar:[{ad:path.basename(paket),yol:paket}]}));
  const app=await _electron.launch({executablePath:exe,args:['--no-sandbox'],env:{...process.env,HOME:ev,XDG_CONFIG_HOME:path.join(ev,'.config')}});
  const w=await app.firstWindow(); const er=[]; w.on('pageerror',e=>er.push(e.message)); w.on('console',m=>{ if(m.type()==='error') er.push(m.text()); });
  const t0=Date.now();
  if(tip==='gts'){ await w.waitForSelector('#g-kpi .kt b',{timeout:900000}); console.log('açılış',((Date.now()-t0)/1000).toFixed(0),'sn');
    const g=await w.$eval('#g-kpi .kt b',e=>e.textContent); await w.click('button[data-v="satis"]'); await w.waitForTimeout(1500);
    const s=await w.$eval('#st-mut',e=>e.innerText.replace(/\s+/g,' ')); console.log('GENEL net',g,'| MUT',s.slice(-80));
  } else { await w.waitForFunction(()=>document.getElementById('yukle')&&document.getElementById('yukle').hidden&&!document.getElementById('bos').hidden===false,null,{timeout:900000}).catch(()=>{}); await w.waitForTimeout(3000);
    console.log('açılış',((Date.now()-t0)/1000).toFixed(0),'sn', (await w.evaluate(()=>document.body.innerText.replace(/\s+/g,' ').slice(0,300)))); }
  await w.screenshot({path:path.join(ev,'ekran.png')});
  console.log('ERR',er.slice(0,5)); await app.close(); })().catch(e=>{console.error('HATA',e.message);process.exit(1)});
