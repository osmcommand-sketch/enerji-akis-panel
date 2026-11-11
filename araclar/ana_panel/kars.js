const fs=require('fs'); const rd=f=>{const h=fs.readFileSync(f,'utf8'); const g=id=>{const t=`<script type="application/json" id="${id}">`,a=h.indexOf(t)+t.length; return JSON.parse(h.slice(a,h.indexOf('</script>',a)));}; return {D:g('data'),T:g('tahsis')};};
const A=rd(process.argv[2]),B=rd(process.argv[3]);
const sz=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v.length:typeof v==='object'&&v?Object.keys(v).length:v]));
const a=sz(A.D),b=sz(B.D); for(const k of Object.keys(b)) if(JSON.stringify(A.D[k])!==JSON.stringify(B.D[k])) console.log('D.'+k,a[k],'→',b[k]);
const ta=sz(A.T),tb=sz(B.T); for(const k of Object.keys(tb)) if(JSON.stringify(A.T[k])!==JSON.stringify(B.T[k])) console.log('T.'+k,ta[k],'→',tb[k]);
const th=B.D.th||B.D.tahsis; 
for(const [n,X] of [['136',A],['138',B]]){ const k=Object.keys(X.D).find(k=>Array.isArray(X.D[k])&&X.D[k][0]&&X.D[k][0].length===11); if(k){ let il=0,top=0; for(const r of X.D[k]) (r[5]?top+=r[6]:il+=r[6]); console.log(n,k,'il bazlı',Math.round(il),'toptan',Math.round(top),'zincirli',X.D[k].filter(r=>r[10]>=0).length,'tahsis üzerinden',X.D[k].filter(r=>r[2]===3).length); } }
