const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]); await p.waitForTimeout(2000); await p.click('nav button[data-v="akis"]'); await p.waitForTimeout(1500);
const t=s=>p.$eval(s,e=>e.innerText.replace(/\s+/g,' ')).catch(()=>'yok'); console.log('KART',await t('#a-kart')); console.log('IL',(await t('#a-il')).slice(0,400)); console.log('IL son',(await t('#a-il')).slice(-700)); console.log('TERM',(await t('#a-term')).slice(0,300));
await p.$eval('.v[data-v="akis"]',e=>e.scrollIntoView()); await p.screenshot({path:process.argv[3],fullPage:true}); console.log('ERR',er); await b.close(); })();
