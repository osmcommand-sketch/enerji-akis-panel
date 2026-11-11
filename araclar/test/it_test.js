const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]); await p.waitForTimeout(2000); await p.click('nav button[data-v="itt"]'); await p.waitForTimeout(1200);
const t=s=>p.$eval(s,e=>e.innerText.replace(/\s+/g,' ')).catch(()=>'yok'); console.log('KPI',await t('#it-kpi')); console.log('IZ',await t('#it-izsub')); console.log('IZG',(await t('#it-izg')).slice(0,600)); console.log('OZ',(await t('#it-oz')).slice(0,400));
await p.$eval('.v[data-v="itt"]',e=>e.scrollIntoView()); await p.screenshot({path:process.argv[3]+'/it1.png',fullPage:true});
await p.setViewportSize({width:390,height:900}); await p.waitForTimeout(300); console.log('hscroll',await p.evaluate(()=>document.documentElement.scrollWidth));
console.log('ERR',er); await b.close(); })();
