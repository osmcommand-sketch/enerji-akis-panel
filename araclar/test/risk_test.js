const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]); await p.waitForTimeout(2000); await p.click('nav button[data-v="risk"]'); await p.waitForTimeout(1500);
const t=await p.$eval('[data-v="risk"]',e=>e.innerText.replace(/\s+/g,' ')); console.log(t.slice(0,1800));
await p.screenshot({path:process.argv[3],fullPage:true}); console.log('ERR',er); await b.close(); })();
