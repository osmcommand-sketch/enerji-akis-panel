const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1500,height:1100}}); const er=[]; p.on('pageerror',e=>er.push(e.message));
await p.goto('file://'+process.argv[2]+'#genel'); await p.waitForTimeout(2500);
const el=await p.$('#g-tic'); await el.screenshot({path:process.argv[3]});
console.log(await p.evaluate(()=>{ const s=document.querySelector('select[data-h="Ozet!H30"]'); const g=[...document.querySelectorAll('.tf-g')].find(g=>/^Kaynak/.test(g.dataset.g)); return [s&&[...s.options].map(o=>o.text).join("/"), s&&s.closest('.tf-g').dataset.g, g&&g.className, g&&[...g.querySelectorAll('input')].map(i=>i.disabled).join()]; }));
console.log('ERR',er); await b.close(); })();
