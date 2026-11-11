const fs=require('fs'),path=require('path'); const R='/home/claude/enerji-akis-panel/gts/res/';
const HS=require(R+'hesap.js'), SA=require(R+'satis.js'), GB=require(R+'girdi_bag.js');
const xb=fs.readFileSync(process.argv[2]); const bag=GB.kur(HS,xb).bag; const X=HS.hesapla(xb,bag({}));
const sf=n=>{try{return X.sayfa(n)}catch{return null}}; const O=SA.satislar(sf), D=O.Motorin, GN=sf('Motorin_Gunluk');
const h=GN[4]; const c=re=>h.findIndex(x=>typeof x==='string'&&re.test(x)); const iT=c(/^Tarih/), iAP=c(/^SMM \(TL/), iAR=c(/^Brüt kâr \(USD/), iAK=c(/^Uygulanan alım/), iS=c(/^Günlük satış \(t\)/);
console.log('başlıklar', h.map((x,i)=>i>=33?i+':'+x:null).filter(Boolean).join(' | '));
const LM=new Map(D.lot.map(l=>[l[0],l])); const y2=v=>Math.round(v*100)/100;
const P=new Map(); for(const [i,j,q] of D.sat){ const a=D.alt[j], l=LM.get(a[0]); const kb=a[7], cif=y2(l[11]), apr=l[12], yg=l[17]||0.835; const afy=(cif+apr)*kb*0.845/yg; const o=P.get(i)||{smm:0,smmU:0,q:0,parca:[]}; o.smm+=q*afy; o.smmU+=q*afy/kb; o.q+=q; o.parca.push([j,a[0],q,afy,kb]); P.set(i,o); }
const d0=GN[5][iT]; let top=[0,0], n=0; const fk=[];
for(let r=5;r<GN.length;r++){ const g=GN[r]; if(!g||typeof g[iT]!=='number') continue; const i=Math.round(g[iT]-d0), p=P.get(i); if(!p) continue; const ms=g[iAP]||0, d=p.smm-ms; top[0]+=p.smm; top[1]+=ms; if(Math.abs(d)>1000) fk.push([i,d,p,ms,g[iAK]]); }
console.log('SMM toplam panel',(top[0]/1e6).toFixed(1),'model',(top[1]/1e6).toFixed(1),'fark gün',fk.length);
for(const [i,d,p,ms,ak] of fk.slice(0,8)) console.log(i,'fark TL',Math.round(d),'panel TL/t',(p.smm/p.q).toFixed(2),'model AK',ak, JSON.stringify(p.parca.map(x=>[x[0],x[1],Math.round(x[2]),x[3].toFixed(2),x[4]])));
const g0=Date.UTC(1899,11,30)+d0*864e5, tr=i=>new Date(g0+i*864e5).toISOString().slice(0,10);
const bol=D.alt.filter(a=>a[6]===1).map(a=>{ const ilk=D.alt.find(x=>x[3]===a[3]&&x[6]===0); return [a[3],tr(a[1]),ilk[0],Math.round(ilk[2]),a[0],Math.round(a[2])]; });
console.log('iki gemiye bölünen beyanname',bol.length); for(const b of bol) console.log(' İB-'+String(b[0]).padStart(3,'0'),b[1],'K'+b[2],b[3]+' t','+ K'+b[4],b[5]+' t');
