const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]); await p.waitForTimeout(2000); await p.click('nav button[data-v="nakit"]'); await p.waitForTimeout(1200);
const t=s=>p.$eval(s,e=>e.innerText.replace(/\s+/g,' ')); console.log('KPI',await t('#nk-kpi')); console.log('TAB',(await t('#nk-tab')).slice(0,500));
await p.$eval('.v[data-v="nakit"]',e=>e.scrollIntoView()); await p.screenshot({path:process.argv[3]+'/nk1.png',fullPage:true});
await p.click('#nk-bir [data-b="usd"]'); await p.click('#nk-ayr [data-a="ayr"]'); await p.waitForTimeout(300); console.log('KPI$',await t('#nk-kpi')); console.log('TAB$',(await t('#nk-tab')).slice(-400));
const y=await p.$('.yil button, #yil button'); console.log('yil btn', !!y);
await p.setViewportSize({width:390,height:900}); await p.waitForTimeout(300); console.log('hscroll',await p.evaluate(()=>document.documentElement.scrollWidth)); await p.screenshot({path:process.argv[3]+'/nk2.png'});
console.log('ERR',er); await b.close(); })();
