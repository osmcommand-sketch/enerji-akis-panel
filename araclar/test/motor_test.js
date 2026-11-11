// Panel hesap motoru doğrulaması: node motor_test.js <res klasörü> <xlsx> – formüllü hücreler, Excel'in önbellek değeri ile karşılaştırılır
const fs=require('fs'), path=require('path'); const HS=require(path.join(process.argv[2],'hesap.js'));
const xb=fs.readFileSync(process.argv[3]); const W=HS.kitapAc(xb), X=HS.hesapla(xb,{});
let n=0,f=0; const ornek=[];
for(const [ad,S] of Object.entries(W)){ if(!S||!S.cells) continue; let R; try{ R=X.sayfa(ad); }catch{ continue; }
  for(const [k,c] of S.cells){ if(!c.f) continue; n++; const r=Math.floor(k/16384)+1, col=k%16384, g=R[r]?R[r][col]:undefined, v=c.v;
    let ok; if(typeof v==='number') ok=typeof g==='number'&&Math.abs(g-v)<=1e-6*Math.max(1,Math.abs(v)); else if(v==null||v==='') ok=g==null||g===''||g===0; else if(typeof v==='boolean') ok=g===v||g===(v?1:0); else ok=String(g)===String(v)||(typeof g==='object'&&g&&g.e===v);
    if(!ok){ f++; if(ornek.length<(+process.env.ORNEK||8)) ornek.push(ad+'!'+r+':'+col+' excel='+JSON.stringify(v)+' motor='+JSON.stringify(g)+' '+c.f.slice(0,80)); } } }
console.log(path.basename(process.argv[3]),'karşılaştırılan',n,'fark',f); for(const o of ornek) console.log('  ',o);
