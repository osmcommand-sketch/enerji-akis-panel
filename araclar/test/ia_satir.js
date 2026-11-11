const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1240,height:900}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]+'#ittakis'); await p.waitForTimeout(2500);
console.log(await p.evaluate(()=>[...document.querySelectorAll('.ia-satir .kt')].map(e=>Math.round(e.getBoundingClientRect().top)+':'+Math.round(e.getBoundingClientRect().width)).join(' ')));
const s=await p.$('.v[data-v="ittakis"] section'); await s.screenshot({path:process.argv[3]}); 
await p.goto('file://'+process.argv[2]+'#akis'); await p.waitForTimeout(1500); console.log('GTS',await p.evaluate(()=>[...document.querySelectorAll('#a-kart .kt,#a-dkpi .kt')].map(e=>Math.round(e.getBoundingClientRect().top)).join(' ')));
console.log('ERR',er); await b.close(); })();
