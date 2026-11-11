const {_electron}=require('playwright'), path=require('path');
(async()=>{ const [exe,ev]=process.argv.slice(2);
  const app=await _electron.launch({executablePath:exe,args:['--no-sandbox'],env:{...process.env,HOME:ev,XDG_CONFIG_HOME:path.join(ev,'.config')}});
  const w=await app.firstWindow(); const er=[]; w.on('pageerror',e=>er.push(e.message));
  await w.waitForSelector('#g-kpi .kt b',{timeout:1500000});
  await w.click('.tabs.ust [data-mod="itt"]'); await w.waitForTimeout(1000);
  for(const [v,id] of [['ittop','io-kpi'],['ittkargo','ik-kpi'],['ittsatis','is-kpi'],['ittrakip','ir-kpi'],['ittnakit','in-kpi'],['itteko','ie-kpi'],['itthedge','ih-kpi'],['ittrisk','iz-kpi'],['ittvars','iv-tab']]){
    await w.click(`.tabs.alt [data-v="${v}"]`); await w.waitForTimeout(700); console.log(v,(await w.$eval('#'+id,e=>e.innerText.replace(/\s+/g,' '))).slice(0,110)); }
  console.log('ERR',er); await app.close(); })().catch(e=>{ console.log('HATA',e.message.split('\n')[0]); process.exit(1); });
