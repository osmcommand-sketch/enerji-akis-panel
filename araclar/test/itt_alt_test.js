const {chromium}=require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1400,height:1000}}); const er=[]; p.on('pageerror',e=>er.push(e.message)); p.on('console',m=>{ if(m.type()==='error') er.push(m.text()); });
await p.goto('file://'+process.argv[2]); await p.waitForTimeout(2000);
await p.click('.tabs.ust [data-mod="itt"]'); await p.waitForTimeout(800);
console.log(await p.evaluate(()=>[...document.querySelectorAll('.tabs.alt button')].filter(b=>!b.hidden).map(b=>b.textContent).join(' | ')));
const t=s=>p.$eval(s,e=>e.innerText.replace(/\s+/g,' ')).catch(()=>'yok');
const V={ittop:['io-kpi','io-lot'],ittkargo:['ik-kpi','ik-tab'],ittsatis:['is-kpi','is-tab'],ittrakip:['ir-kpi','ir-tab'],ittnakit:['in-kpi','in-tab'],itteko:['ie-kpi','ie-bir','ie-tab'],itthedge:['ih-kpi','ih-tab'],ittrisk:['iz-kpi','iz-duy'],ittvars:['iv-tab']};
for(const [v,ids] of Object.entries(V)){ await p.click(`.tabs.alt [data-v="${v}"]`); await p.waitForTimeout(700);
  console.log('==',v); for(const id of ids){ const x=await t('#'+id); console.log(' ',id,x.slice(0,420)); }
  await p.screenshot({path:process.argv[3]+'/'+v+'.png',fullPage:true}); }
await p.click('.tabs.alt [data-v="itthedge"]'); await p.click('#ih-yil [data-y="2028"]'); await p.waitForTimeout(600); console.log('H2028',(await t('#ih-kpi')).slice(0,200));
await p.click('.tabs.alt [data-v="ittsatis"]'); await p.waitForTimeout(600); console.log('S2028',(await t('#is-kpi')).slice(0,200), await p.$eval('#is-yil [aria-pressed="true"]',e=>e.textContent));
console.log('ERR',er); await b.close(); })();
