const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
const u='file://'+process.argv[2]; const t=async(sel)=>p.$eval(sel,e=>e.innerText.replace(/\s+/g,' ')).catch(()=>'(yok '+sel+')');
await p.goto(u+'#genel'); await p.waitForTimeout(3000); console.log('GENEL KPI', await t('#g-kpi')); console.log('GENEL ECO', (await t('[data-v="genel"].v')).slice(0,2500));
await p.goto(u+'#satis'); await p.waitForTimeout(2000); console.log('SKPI', await t('#st-kpi')); console.log('MUT', await t('#st-mut'));
console.log('ERR',er); await b.close(); })();
