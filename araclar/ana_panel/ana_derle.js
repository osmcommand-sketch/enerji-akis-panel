const fs=require('fs'), path=require('path');
const [F, db, out, etiket]=process.argv.slice(2);
(async()=>{ const SQL=await require(process.env.S+'/nm/node_modules/sql.js')(); const P=require('/home/claude/enerji-akis-panel/pipeline.js');
  const r=P.run(SQL, fs.readFileSync(db), '/home/claude/enerji-akis-panel/res', m=>{});
  let h=fs.readFileSync(F,'utf8');
  const al=id=>{ const a=h.indexOf(`<script type="application/json" id="${id}">`)+(`<script type="application/json" id="${id}">`).length, b=h.indexOf('</script>',a); return [a,b]; };
  const eski=JSON.parse(h.slice(...al('data')));
  const ka=Object.keys(eski).sort(), kb=Object.keys(r.data).sort(); console.log('eski yok:', ka.filter(k=>!kb.includes(k)).join(','), '| yeni ek:', kb.filter(k=>!ka.includes(k)).join(','));
  const js=o=>JSON.stringify(o).replace(/</g,'\\u003c');
  for(const [id,v] of [['data',r.data],['tahsis',r.tahsis]]){ const [a,b]=al(id); h=h.slice(0,a)+js(v)+h.slice(b); }
  h=h.replace(/Veri: Enerji Master DB paket \d+ · [\d.]+/g, etiket);
  fs.writeFileSync(out,h); console.log('ok', h.length, 'sirket', r.data.sir.length, JSON.stringify(r.data.sir.find(s=>/Denizcilik/.test(s[1]))));
})().catch(e=>{console.error(e);process.exit(1);});
