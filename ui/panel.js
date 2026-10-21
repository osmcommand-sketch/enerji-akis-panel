
const D=JSON.parse(document.getElementById("data").textContent);
const IL=new Map(D.il.map(r=>[r[0],r[1]])), TERM=D.term, HUB=D.hub, KAY=D.kay, SIR=D.sir, UG=D.ug, SEP=D.sep;
{ const k=D.lpgk; if(k&&k.kaynak) document.getElementById("lpgk").textContent=k.kaynak==="master lpg_"?" · LPG tabloları aynı veritabanında (LPG Specialist"+(k.tarih?", "+k.tarih:"")+")":" · LPG: "+(k.ad||"LPG veritabanı")+(k.tarih?" ("+k.tarih+")":"")+" (LPG Specialist)"; }
const TED=["Kendi ithalatı","Dağıtıcıdan alım","Rafineriden alım","Stoktan satış"];   // 3: açılış stoku (LPG veritabanı, 20.10.2026)
const AURUN=["Benzin","Motorin","Fuel Oil","Havacılık","Denizcilik","Gazyağı","Diğer"], LURUN=["Otogaz","Tüplü","Dökme"];
// afR: [şirket, terminal, il, ürün, kaynak, mod, ton, km, tahmin, havalimanı] · lfR: [şirket, terminal, depo, il, tedarik, ürün, ton, km, km_maliyet]
const AF=D.af, LF=D.lf, BY=D.by||[], MOD=D.mod||[];
// db_110: tahsissiz satıcı zinciri Leg1 etiketinin sonunda ("… – zincir: Alpet ← Aytemiz ← Güzel Enerji tahsisi"); mod gruplaması için ayrılır
// Terminal depolama lisans numarası (kullanıcı 18.10.2026 12:02): terminal adının yanında; LPG sayfalarında LPG lisansı
const TLIS=D.tlis||[];
const LIS=(t,lpg)=>{ const x=TLIS[t]; if(!x) return ""; const a=lpg?x[1]:x[0], b=lpg?x[0]:x[1], Ls=a.length?a:b;
  if(!Ls.length) return x[2]==="Rafineri"?' <span class="lis yok">rafineri</span>':' <span class="lis yok">lisans no yok</span>';
  return ` <span class="lis" title="EPDK depolama lisansı: ${esc(Ls.join(", "))}">${esc(Ls[0])}${Ls.length>1?` +${Ls.length-1}`:""}</span>`; };
const ZIN=[]; MOD.forEach((m,i)=>{ const z=String(m).match(/^(.*) – zincir: (.*)$/); if(z){ MOD[i]=z[1]; ZIN[i]=z[2]; } });
const zinSira=z=>String(z).split(" ← ").map(s=>s.replace(/ tahsisi$/,"").trim()).reverse().join(" → ");
const S={sayfa:"akis",sid:-1,urun:"tum",il:null,term:null,alc:-1,tmus:-1,mm:-1,tmod:"",tur:[],tasy:"",atrTm:-1,atrSr:-1,ltrTm:-1,ltrSr:-1,atrU:[],ltrU:[]};
let SON_AK="rafineri";   /* Akaryakıt başlığına tıklanınca son açılan akaryakıt sayfası */
const SAYFA_GRUP={lpgmus:"lpg",lpgith:"lpg",lpgtrm:"lpg",lpgraf:"lpg",lpgkay:"lpg",lpgtah:"lpg",lpgtas:"lpg",lpgbay:"lpg"}, SON_G={akaryakit:"rafineri",lpg:"lpgraf"};
const grupOf=sy=>sy==="akis"?null:(SAYFA_GRUP[sy]||"akaryakit");
S.lsat=""; S.lmus=-1; S.hepsiL=false; S.lith=-1; S.lgum=-1;

const nf=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}), nf1=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1}), nf2=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const ton=t=>t>=1e6?nf2.format(t/1e6)+" Mt":t>=1e3?nf.format(t/1e3)+" kt":nf.format(t)+" t";
const cell=t=>t>0.5?ton(t):'<span class="z">–</span>';
const pct=v=>"%"+nf1.format(v*100);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const kaynakAd=(k,sid)=>KAY[k][3]===sid&&sid>=0?"Kendi ithalatı":KAY[k][1];

const prA=(f,u=S.urun)=>u==="tum"||(u[0]==="a"&&f[3]===+u.slice(1));
const prL=(f,u=S.urun)=>u==="tum"||u==="L"||(u[0]==="l"&&f[5]===+u.slice(1));
// Sayfa: "akis" (akış haritası) | "musteri" (dağıtıcı müşterileri – kullanıcı 08.10.2026). Müşteri sayfasında şirket = satıcı dağıtıcı (f[11]);
// dağıtıcı seçilmemişse yalnız dağıtıcılar arası satışlar. LPG akışlarında satıcı bilgisi yok, bu sayfada LPG yer almaz.
const MUS=()=>S.sayfa==="musteri";
// Takas sayfası (kullanıcı 11.10.2026): şirket = satıcı (ithalatçı, f[11]), alıcı = f[0]; yalnız takas satırları
const TKS=()=>S.sayfa==="takas";
const TK_MOD=new Set(); (D.mod||[]).forEach((m,i)=>{ if(String(m).startsWith("Dağıtıcıdan alım (takas")) TK_MOD.add(i); });
// Takas = bayi yönlendirmesi (kullanıcı 11.10.2026 11:43 / 12:09): alıcının bayisi satıcının giriş terminalinden yükler (Terminal içi devir,
// satıcı + terminal + alıcı REF_ITHALAT_TAKAS'ta). 'Dağıtıcıdan alım (takas; alıcının kendi terminalinden)' = satıcının rafineri tahsisinden alım:
// ürün rafineriden (ör. Opet'in Tüpraş tahsisi) doğrudan alıcının terminaline sevk edilir (gemiyle tahliye vb.; kullanıcı 11.10.2026 13:04).
const DV_MOD=new Set(); (D.mod||[]).forEach((m,i)=>{ if(String(m).startsWith("Terminal içi devir (dağıtıcıdan")) DV_MOD.add(i); });
const TKSET=new Set((D.tk||[]).map(r=>r[0]+"|"+r[1]+"|"+r[2]));
// db_45 (PDM 11.10.2026): takas satırı Leg1 'Terminal içi devir (takas; bayi yönlendirmesi)'; rafineri tahsisinden alım ayrı Leg1, takas değildir.
const TY_MOD=new Set(); (D.mod||[]).forEach((m,i)=>{ if(String(m).startsWith("Terminal içi devir (takas")) TY_MOD.add(i); });
// db_64: 'Terminal içi devir (takas; ürün değişimi)' = rafineri alıcısıyla ürün değişimi (tür 3)
const UD_MOD=new Set(); (D.mod||[]).forEach((m,i)=>{ if(String(m).includes("ürün değişimi")) UD_MOD.add(i); });
const tkTur=f=>f[11]===f[0]?0:TY_MOD.size?(UD_MOD.has(f[5])?3:TY_MOD.has(f[5])?1:0):DV_MOD.has(f[5])&&TKSET.has(f[11]+"|"+f[1]+"|"+f[0])?1:TK_MOD.has(f[5])?2:0;
const isTk=f=>tkTur(f)>0;
const sA=f=>TKS()?(isTk(f)&&(S.sid<0||f[11]===S.sid)&&(S.alc<0||f[0]===S.alc)):MUS()?((S.sid<0?f[11]!==f[0]:f[11]===S.sid)&&(S.mm<0||f[0]===S.mm)&&!isTk(f)):(S.sid<0||f[0]===S.sid);
const sL=f=>!MUS()&&!TKS()&&(S.sid<0||f[0]===S.sid);
const okA=f=>sA(f)&&prA(f)&&(S.il==null||f[2]===S.il)&&(S.term==null||f[1]===S.term);
const okL=f=>sL(f)&&prL(f)&&(S.il==null||f[3]===S.il)&&(S.term==null||f[1]===S.term);
const isL=(u=S.urun)=>u==="L"||u[0]==="l";
const urunAd=(u=S.urun)=>u==="tum"?null:u==="L"?"LPG":(u[0]==="a"?AURUN:LURUN)[+u.slice(1)];

/* ---------- Terminaller ---------- */
function terminaller(){
  // Satır = şirket × terminal (kullanıcı 08.10.2026): terminal seçilince o terminaldeki şirketler görünür
  const m=new Map(), g=(sid,t)=>{const k=sid*10000+t; return m.get(k)||m.set(k,{sid,t,c:[0,0,0,0],mi:0,il:new Set(),src:new Map(),est:0}).get(k)};   // mi: ithal motorin   // est: tahmini akış tonu
  for(const f of AF) if(okA(f)){const o=g(f[0],f[1]); o.c[f[3]<=1?f[3]:2]+=f[6]; if(f[3]===1) o.mi+=Math.min(f[10]||0,f[6]); o.il.add(f[2]); const s=kaynakAd(f[4],f[0]); o.src.set(s,(o.src.get(s)||0)+f[6]); if(f[8]) o.est+=f[6];}
  for(const f of LF) if(okL(f)){const o=g(f[0],f[1]); o.c[3]+=f[6]; o.il.add(f[3]); const s="LPG: "+TED[f[4]].toLocaleLowerCase("tr-TR"); o.src.set(s,(o.src.get(s)||0)+f[6]);}
  // Bayi: lisanslar şirketin o ildeki terminal tonaj payı kadar, ilçe bazında en yakın terminale tam sayı olarak atanır (BY: [sid, term, il, tür, adet]).
  // Tüm ürünlerde istasyon tekil: tür 4 her istasyonu bir kez sayar; tür 5 şirket satırında, yalnız LPG'sini verdiği istasyonları ekler (toplamda çift saymamak için başlık toplamına girmez).
  const u=S.urun, bt=u==="tum"?[4,5]:u==="a0"?[0]:u==="a1"?[1]:(u==="L"||u==="l0")?[3]:[];
  for(const b of BY) if(bt.includes(b[3])&&(S.sid<0||b[0]===S.sid)&&(S.il==null||b[2]===S.il)&&(S.term==null||b[1]===S.term)){const o=m.get(b[0]*10000+b[1]); if(!o) continue; o.ba=(o.ba||0)+b[4]; if(b[3]!==5) o.bt=(o.bt||0)+b[4]; (o.bi||=new Map()).set(b[2],(o.bi.get(b[2])||0)+b[4]);}
  const bay=bt.length>0, bn=x=>x>=0.5?nf.format(Math.round(x)):'<span class="z">–</span>';
  const bc=o=>bay?`<td title="${o.bi?esc([...o.bi].sort((a,b)=>b[1]-a[1]).map(([i,n])=>IL.get(i)+" "+nf.format(n)).join(" · ")):""}">${bn(o.ba||0)}</td>`:"";
  const bh=bay?`<th title="Bu terminalden ürün alan istasyonlar (EPDK lisansları). Tüm ürünlerde akaryakıt+LPG istasyonu bir kez sayılır. Şirketin o ildeki terminal payı kadar istasyon, ilçesine en yakın terminale atanır. Hücrenin üzerine gelince il dağılımı görünür.">Bayi</th>`:"";
  const all=[...m.values()].map(o=>({o,tot:o.c.reduce((a,b)=>a+b,0)})).filter(r=>r.tot>0.5).sort((a,b)=>b.tot-a.tot);
  const LIM=60, rows=S.hepsi?all:all.slice(0,LIM);
  const tek=urunAd();
  // Motorin ithal / yerli kırılımı (kullanıcı 08.10.2026)
  const moto=S.urun==="a1", st=`<th class="l">Şirket</th><th class="l">Terminal</th>`;
  const head=moto?`<tr>${st}<th>Motorin</th><th>İthal</th><th>Yerli</th><th>İthal payı</th>${bh}<th>İl</th><th class="l">Ana kaynak</th></tr>`
             :tek?`<tr>${st}<th>${esc(tek)}</th>${bh}<th>İl</th><th class="l">Ana kaynak</th></tr>`
               :`<tr>${st}<th>Benzin</th><th>Motorin<br><span class="muted">ithal</span></th><th>Motorin<br><span class="muted">yerli</span></th><th>Diğer petrol</th><th>LPG</th><th>Toplam</th>${bh}<th>İl</th><th class="l">Ana kaynak</th></tr>`;
  const body=rows.map(({o,tot})=>{const t=o.t, srt=[...o.src].sort((a,b)=>b[1]-a[1]);
    // ikinci kaynak %15 ve üzeriyse o da gösterilir (ör. PO Samsun: Tüpraş İzmit + kendi ithalatı – kullanıcı 08.10.2026)
    const kay=srt.filter((x,i)=>i===0||(i===1&&x[1]/tot>=0.15)).map(x=>`${esc(x[0])} · ${pct(x[1]/tot)}`).join("<br>");
    const my=o.c[1]-o.mi;
    const nums=moto?`<td>${cell(tot)}</td><td>${cell(o.mi)}</td><td>${cell(my)}</td><td>${o.c[1]>0.5?pct(o.mi/o.c[1]):"–"}</td>`
              :tek?`<td>${cell(tot)}</td>`
              :`<td>${cell(o.c[0])}</td><td>${cell(o.mi)}</td><td>${cell(my)}</td><td>${cell(o.c[2])}</td><td>${cell(o.c[3])}</td><td><b>${ton(tot)}</b></td>`;
    return `<tr tabindex="0" data-term="${t}" title="${S.term===t?"Terminal filtresini kaldır":"Bu terminali seç"}"><td class="l"><b>${esc(SIR[o.sid][1])}</b></td><td class="l">${(esc(TERM[t][1])+LIS(t,0))}${o.est>=0.5*tot?'<span class="tag">tahmin</span>':""}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)}</span></td>${nums}${bc(o)}<td>${o.il.size}</td><td class="l"><span class="muted">${kay}</span></td></tr>`}).join("");
  const more=all.length>LIM?`<tr><td colspan="12" class="empty"><button type="button" class="clear" id="hepsi">${S.hepsi?`İlk ${LIM} satırı göster`:`Tümünü göster (${all.length} satır)`}</button></td></tr>`:"";
  document.getElementById("t-term").innerHTML=`<thead>${head}</thead><tbody>${body?body+more:`<tr><td colspan="12" class="empty">Bu filtrelerle terminal akışı yok.</td></tr>`}</tbody>`;
  const tt=all.reduce((a,r)=>a+r.tot,0), tb=all.reduce((a,r)=>a+(S.sid<0?(r.o.bt||0):(r.o.ba||0)),0);
  const nT=new Set(all.map(r=>r.o.t)).size, nS=new Set(all.map(r=>r.o.sid)).size;
  document.getElementById("s-term").textContent=all.length?`${nS} şirket · ${nT} terminal · ${ton(tt)}${bay&&tb>=0.5?` · ${nf.format(Math.round(tb))} ${u==="tum"?"istasyon":"bayi"}`:""}`:"";
}

/* ---------- İller ---------- */
function iller(){
  const m=new Map(), g=i=>m.get(i)||m.set(i,{a:0,ak:0,l:0,lk:0,t:new Map()}).get(i);
  const ilSec=S.il; S.il=null;   // tablo tüm illeri gösterir, seçili ili vurgular
  for(const f of AF) if(okA(f)){const o=g(f[2]); o.a+=f[6]; o.ak+=f[6]*f[7]; o.t.set(f[1],(o.t.get(f[1])||0)+f[6]);}
  for(const f of LF) if(okL(f)){const o=g(f[3]); o.l+=f[6]; o.lk+=f[6]*f[7]; o.t.set(f[1],(o.t.get(f[1])||0)+f[6]);}
  S.il=ilSec;
  const rows=[...m].filter(([,o])=>o.a+o.l>0.5).sort((x,y)=>(y[1].a+y[1].l)-(x[1].a+x[1].l));
  const km=(t,k)=>t>0.5?nf.format(k/t):'<span class="z">–</span>';
  const showA=S.urun==="tum"||S.urun[0]==="a", showL=S.urun==="tum"||isL();
  const aLab=S.urun[0]==="a"?esc(urunAd()):"Petrol ürünleri";
  const head=`<tr><th>İl</th>${showA?`<th>${aLab}</th><th>km</th>`:""}${showL?`<th>${isL()?esc(urunAd()):"LPG"}</th><th>km</th>`:""}${secim()?"<th>Pay</th>":""}</tr>`;
  const body=rows.map(([i,o])=>{const top=[...o.t].sort((a,b)=>b[1]-a[1])[0];
    return `<tr tabindex="0" data-il="${i}" class="${S.il===i?"on":""}"><td>${esc(IL.get(i))}<br><span class="muted">${esc(TERM[top[0]][1])}</span></td>${showA?`<td>${cell(o.a)}</td><td>${km(o.a,o.ak)}</td>`:""}${showL?`<td>${cell(o.l)}</td><td>${km(o.l,o.lk)}</td>`:""}${secim()?`<td>${PAY.has(i)?pct(PAY.get(i)):"–"}</td>`:""}</tr>`}).join("");
  document.getElementById("t-il").innerHTML=`<thead>${head}</thead><tbody>${body||`<tr><td colspan="5" class="empty">Bu filtrelerle il yok.</td></tr>`}</tbody>`;
  document.getElementById("s-il").textContent=rows.length?`${rows.length} il · satırın altında ana terminal${secim()?" · pay: seçimin il tüketimindeki payı":""}`:"";
}

/* ---------- Ürün sepeti (EPDK) ---------- */
function sepet(){
  const box=document.getElementById("sepet"), m=UG.map(()=>[0,0,0,0]);
  let baslik;
  if(S.sid>=0){ for(const r of SEP) if(r[0]===S.sid) m[r[1]][r[2]]+=r[3]; baslik=SIR[S.sid][1]; }
  else { UG.forEach((u,i)=>{m[i]=[u[3],u[7],u[8],u[9]]}); baslik="Tüm şirketler"; }
  // Satış = yurt içi + yabancıya ihrakiye (kullanıcı 08.10.2026: havacılık ve denizcilik satışına ihrakiye dahil)
  const sat=m.map(x=>x[0]+x[3]), tot=sat.reduce((a,b)=>a+b,0);
  // LPG perakende (model), sepetin altında ayrı satır
  let lpg=0; for(const f of LF) if(sL(f)) lpg+=f[6];
  const rows=UG.map((u,i)=>({ad:u[1],v:m[i]})).filter(x=>x.v.some(n=>n>0.5));
  document.getElementById("s-sepet").textContent=`${baslik} · EPDK satış (yurt içi + yabancıya ihrakiye)`;
  if(!rows.length&&!lpg){box.innerHTML='<p class="empty">Bu şirket için kayıt yok.</p>';return}
  const sub=v=>[...(v[3]>0.5?[`yurt içi ${ton(v[0])} + ihrakiye ${ton(v[3])}`]:[]),...[[1,"ithalat"],[2,"ihracat"]].filter(([k])=>v[k]>0.5).map(([k,t])=>`${t} ${ton(v[k])}`)].join(" · ");
  box.innerHTML=rows.map(({ad,v})=>`<div class="s-row"><span>${esc(ad)}</span><span class="v">${v[0]+v[3]>0.5?ton(v[0]+v[3])+(tot?" · "+pct((v[0]+v[3])/tot):""):"satış yok"}</span>${sub(v)?`<span class="d">${sub(v)}</span>`:""}<span class="bar"><i style="width:${tot?((v[0]+v[3])/tot*100).toFixed(1):0}%"></i></span></div>`).join("")+
    (lpg>0.5?`<div class="s-row"><span>LPG (perakende)</span><span class="v">${ton(lpg)}</span><span class="d">modeldeki LPG satışı; petrol ürünleri payına dahil değil</span><span class="bar"><i class="lpg" style="width:100%"></i></span></div>`:"");
}

/* ---------- Etki alanı haritası ---------- */
const GEO=JSON.parse(document.getElementById("geo").textContent);
const YIL=D.yil||2025;   // baz yıl (2026 geçişi, kullanıcı 21.10.2026 17:35)
document.querySelectorAll(".yil").forEach(e=>e.textContent=YIL);
{ const yn=document.getElementById("yilnot"); if(yn&&D.yilnot) yn.textContent=" · "+D.yilnot; }
const secim=()=>MUS()||TKS()||S.sid>=0||S.term!=null;
const secimAd=()=>TKS()?["takas"+(S.sid>=0?" · satıcı "+SIR[S.sid][1]:"")+(S.alc>=0?" · alıcı "+SIR[S.alc][1]:""),S.term!=null?TERM[S.term][1]:null].filter(Boolean).join(" · "):[S.sid>=0?SIR[S.sid][1]+(MUS()&&S.mm<0?" (müşterileriyle)":""):MUS()&&S.mm<0?"dağıtıcılar arası satış":null,MUS()&&S.mm>=0?SIR[S.mm][1]+" alımları":null,S.term!=null?TERM[S.term][1]:null].filter(Boolean).join(" · ");
let PAY=new Map(), ILT=new Map(), ILS=new Map();
function hesap(){
  // il tüketimi (seçili ürün, tüm şirketler) ve seçimin il hacmi
  ILT=new Map(); ILS=new Map();
  const add=(m,i,v)=>m.set(i,(m.get(i)||0)+v);
  for(const f of AF) if(prA(f)){ add(ILT,f[2],f[6]); if(sA(f)&&(S.term==null||f[1]===S.term)) add(ILS,f[2],f[6]); }
  for(const f of LF) if(prL(f)){ add(ILT,f[3],f[6]); if(sL(f)&&(S.term==null||f[1]===S.term)) add(ILS,f[3],f[6]); }
  PAY=new Map(); if(secim()) for(const [i,v] of ILS) if(v>0.5&&ILT.get(i)) PAY.set(i,v/ILT.get(i));
}
// Ürün renkleri: [açık, orta, koyu, terminal noktası]. Her ürün ayrı ton ailesi; üç barem aynı ailenin açık→koyu adımları.
const URENK={
  tum:["#D5DCE2","#9AABB8","#5E7384","#3F5262"],
  a0:["#D3EBCF","#8FCB86","#3E9A4A","#2C7A36"],   // Benzin – yeşil
  a1:["#CFE0F3","#86B2E0","#2F6FB5","#1F5591"],   // Motorin – mavi
  L: ["#FBE0C8","#F2AE6F","#D9711F","#B55A12"],   // LPG – turuncu
  a2:["#E8DACB","#C4A27E","#8A6238","#6E4C29"],   // Fuel Oil – kahve
  a3:["#E3D9F2","#B49BDB","#7553B5","#5A3D96"],   // Havacılık – mor
  a4:["#CDEDEC","#7DCDC8","#1F948E","#157570"],   // Denizcilik – deniz yeşili
  a5:["#F5EBC0","#E3C95E","#B08E14","#8A6F0A"],   // Gazyağı – hardal
  a6:["#F6D5DE","#E596AC","#C4486C","#A23455"]};  // Diğer – gül
const ukey=u=>u[0]==="l"?"L":u;
function urunRenk(){ const r=URENK[ukey(S.urun)]||URENK.tum, el=document.querySelector("section.etki");
  ["--s1","--s2","--s3","--tn"].forEach((v,k)=>el.style.setProperty(v,r[k])); }
const PAY_MIN=0.01;   // kullanıcı 16.10.2026 13:25 ("1+3"): il tüketiminin %1'inden küçük pay boyanmaz (1 tonluk paylar etki alanını geniş gösteriyordu)
const PAY_BIN=[0.15,0.30];   // 3 barem: %1–15 · %15–30 · %30 ve üzeri
let HAC_BIN=[];
function renk(i){
  if(secim()){ const p=PAY.get(i); if(!p||p<PAY_MIN) return "var(--c0)"; let k=1; for(const b of PAY_BIN) if(p>=b) k++; return `var(--s${k})`; }
  const v=ILT.get(i)||0; if(v<0.5) return "var(--c0)"; let k=1; for(const b of HAC_BIN) if(v>=b) k++; return `var(--s${k})`;
}
const svgM=document.getElementById("map"), NS="http://www.w3.org/2000/svg";
const ilYol=new Map();
for(const [n,d] of Object.entries(GEO.p)){ const e=document.createElementNS(NS,"path"); e.setAttribute("d",d); e.setAttribute("class","il"); e.dataset.il=n; svgM.appendChild(e); ilYol.set(+n,e); }
const PJ=GEO.proj, pj=(lat,lon)=>[(lon-PJ.minx)*PJ.cos*PJ.sx,(PJ.maxy-lat)*PJ.sx];
const gK=document.createElementNS(NS,"g"); svgM.appendChild(gK);
const gT=document.createElementNS(NS,"g"); svgM.appendChild(gT);
function terminalNoktalari(){
  gT.replaceChildren(); if(S.urun==="tum") return [];
  const m=new Map(), add=(t,v,il,est)=>{const o=m.get(t)||m.set(t,{v:0,il:new Set(),est:0}).get(t); o.v+=v; o.il.add(il); if(est) o.est+=v;};
  for(const f of AF) if(prA(f)&&sA(f)&&(S.il==null||f[2]===S.il)) add(f[1],f[6],f[2],f[8]);
  for(const f of LF) if(prL(f)&&sL(f)&&(S.il==null||f[3]===S.il)) add(f[1],f[6],f[3],0);
  const rows=[...m].filter(([,o])=>o.v>0.5).sort((a,b)=>b[1].v-a[1].v); if(!rows.length) return [];
  const mx=rows[0][1].v;
  // aynı noktadaki terminaller küçük bir halkaya dizilir
  const byHub=new Map(); for(const r of rows){const h=TERM[r[0]][2]; (byHub.get(h)||byHub.set(h,[]).get(h)).push(r);}
  const out=[];
  for(const [h,arr] of byHub){const [x0,y0]=pj(HUB[h].lat,HUB[h].lon);
    arr.forEach(([t,o],k)=>{const n=arr.length, a=-Math.PI/2+2*Math.PI*k/n, rr=n>1?6+2*n:0, x=x0+rr*Math.cos(a), y=y0+rr*Math.sin(a), r=3+11*Math.sqrt(o.v/mx);
      const c=document.createElementNS(NS,"circle"); c.setAttribute("cx",x.toFixed(1)); c.setAttribute("cy",y.toFixed(1)); c.setAttribute("r",r.toFixed(1));
      c.setAttribute("class",`tn${isL()?" lpg":""}${S.term===t?" sel":""}${o.est>=0.5*o.v?" est":""}`); c.dataset.term=t; out.push([t,o,x,y,r]); gT.appendChild(c);});}
  // Tüm terminal adları: her nokta kümesinin yanında bir etiket sütunu; çakışan etiketler aşağı/yukarı kaydırılır, kısa bir çizgiyle noktaya bağlanır
  const W=+svgM.viewBox.baseVal.width, LH=11.5, kutu=[], cizgi=document.createElementNS(NS,"g"), yazi=document.createElementNS(NS,"g");
  const genis=t=>TERM[t][1].length*5.4+4;
  const carp=(x,y,w)=>kutu.some(q=>x<q[0]+q[2]&&q[0]<x+w&&Math.abs(q[1]-y)<LH);
  for(const [h,arr] of byHub){
    const pts=out.filter(o=>TERM[o[0]][2]===h).sort((a,b)=>a[3]-b[3]);
    const cx=pts.reduce((a,o)=>a+o[2],0)/pts.length, cy=pts.reduce((a,o)=>a+o[3],0)/pts.length;
    const sag=cx<W*0.72, rmax=Math.max(...pts.map(o=>Math.abs(o[2]-cx)+o[4]));
    const x0=sag?cx+rmax+8:cx-rmax-8;
    let y=cy-(pts.length-1)*LH/2;
    for(const [t,o,x,yy,r] of pts){
      const w=genis(t), lx=sag?x0:x0-w; let ty=y, k=0;
      while(carp(lx,ty,w)&&k<40){ k++; ty=y+(k%2?1:-1)*Math.ceil(k/2)*LH; }
      kutu.push([lx,ty,w]);
      const l=document.createElementNS(NS,"text"); l.setAttribute("x",(sag?x0+2:x0-2).toFixed(1)); l.setAttribute("y",(ty+3.5).toFixed(1)); l.setAttribute("class","tl"); l.setAttribute("text-anchor",sag?"start":"end"); l.textContent=TERM[t][1]; yazi.appendChild(l);
      const ex=sag?x+r:x-r;
      if(Math.hypot((sag?x0:x0)-ex,ty-yy)>4){const ln=document.createElementNS(NS,"path"); ln.setAttribute("d",`M${ex.toFixed(1)},${yy.toFixed(1)}L${x0.toFixed(1)},${ty.toFixed(1)}`); ln.setAttribute("class","tline"); cizgi.appendChild(ln);}
      y+=LH;
    }
  }
  gT.insertBefore(cizgi,gT.firstChild); gT.appendChild(yazi);
  return out;
}
let TN=new Map();
/* İl sıralaması paneli (kullanıcı 17.10.2026: haritayı küçült, görsel zenginlik): haritanın yanında ilk iller, tıklayınca il seçilir */
function ilPanel(baslik,alt,rows,fmt,ek){ // rows: [il, değer, ikincil metin]
  const el=document.getElementById("ilpan"); if(!el) return;
  const R=rows.filter(r=>r[1]>0.5||(fmt!==ton&&r[1]>0)).sort((a,b)=>b[1]-a[1]), T=R.reduce((a,r)=>a+r[1],0), N=8, M=R.length?R[0][1]:1;
  const ilk5=R.slice(0,5).reduce((a,r)=>a+r[1],0);
  el.innerHTML=`<div class="ip-h"><b>${baslik}</b><span>${alt}</span></div>`
    +(R.length?`<div class="ip-oz"><div><b>${R.length}</b><span>il</span></div><div><b>${pct(T?ilk5/T:0)}</b><span>ilk 5 ilin payı</span></div>${ek?`<div><b>${ek[0]}</b><span>${ek[1]}</span></div>`:""}</div>`:"")
    +`<ol class="ip-l">${R.slice(0,N).map(([i,v,z],k)=>`<li><button type="button" data-il="${i}" class="${S.il===i?"on":""}"><span class="ip-n">${k+1}</span><span class="ip-ad">${esc(IL.get(i))}${z?`<small>${z}</small>`:""}</span><b>${fmt(v)}</b><span class="ip-b"><i style="width:${(v/M*100).toFixed(1)}%"></i></span></button></li>`).join("")}</ol>`
    +(R.length>N?`<p class="ip-f">+${R.length-N} il daha · ${fmt===ton?ton(R.slice(N).reduce((a,r)=>a+r[1],0)):nf.format(R.slice(N).reduce((a,r)=>a+r[1],0))}</p>`:R.length?"":`<p class="ip-f">Bu seçimde il yok.</p>`);
}
document.getElementById("ilpan").addEventListener("click",e=>{const b=e.target.closest("[data-il]"); if(b){const i=+b.dataset.il; S.il=S.il===i?null:i; render();}});
function harita(){
  hesap(); urunRenk();
  if(!secim()){ const v=[...ILT.values()].filter(x=>x>0.5).sort((a,b)=>a-b); HAC_BIN=[1/3,2/3].map(q=>v[Math.floor(q*(v.length-1))]||0); }
  for(const [i,e] of ilYol){ e.setAttribute("fill",renk(i)); e.classList.toggle("sel",S.il===i); }
  const u=urunAd()||"Tüm ürünler", ad=secimAd();
  document.getElementById("h-etki").textContent=secim()?`Etki alanı: il tüketiminde ${ad} payı`:`İl tüketimi: ${u.toLocaleLowerCase("tr-TR")}`;
  const nIl=[...PAY.values()].filter(p=>p>=PAY_MIN).length, nKuc=[...PAY.values()].filter(p=>p>0&&p<PAY_MIN).length, tT=[...ILT.values()].reduce((a,b)=>a+b,0), tS=[...ILS.values()].reduce((a,b)=>a+b,0);
  document.getElementById("e-lead").textContent=secim()
    ?`${u}. Her il, kendi tüketiminin ${ad} tarafından karşılanan oranına göre renklendirildi. Hesap il × şirket satışına (EPDK) ve terminal akışına dayanır. ${ad.charAt(0).toLocaleUpperCase("tr-TR")+ad.slice(1)} ${nIl} ilde %1 ve üzeri paya sahip${nKuc?` (${nKuc} ilde %1'den küçük pay boyanmadı, il ayrıntısında görünür)`:""}; ülke tüketimindeki payı ${pct(tT?tS/tT:0)}. İlin üzerine gelince ayrıntısı açılır.`
    :`${u}. Her il, toplam tüketimine göre renklendirildi (${ton(tT)}). ${S.urun!=="tum"?"Noktalar bu ürünün çıktığı terminaller; bir terminale tıklayınca etki alanı açılır. ":"Bir ürün seçince terminaller haritada görünür. "}Bir şirket ya da terminal seçince harita, seçimin il tüketimindeki payını gösterir.`;
  const L=document.getElementById("legend");
  if(secim()) L.innerHTML=`<span><i style="background:var(--c0)"></i>yok ya da %1'den az</span>`+["%1–15","%15–30","%30 ve üzeri"].map((t,k)=>`<span><i style="background:var(--s${k+1})"></i>${t}</span>`).join("")+`<span>· il tüketimindeki pay</span>`;
  else { const e=[0,...HAC_BIN]; L.innerHTML=e.map((b,k)=>`<span><i style="background:var(--s${k+1})"></i>${k<2?(k?ton(b):"")+(k?"–":"")+ton(e[k+1])+(k?"":"'den az"):ton(b)+" ve üzeri"}</span>`).join("")+`<span>· il tüketimi (üçte birlik dilimler)</span>`; }
  TN=new Map(terminalNoktalari().map(r=>[r[0],r[1]]));
  if(S.urun!=="tum"&&TN.size) document.getElementById("legend").insertAdjacentHTML("beforeend",`<span><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5.5" fill="var(--tn)" stroke="#fff"/></svg> ${TN.size} terminal (boyut = ${esc(urunAd())} tonu)</span>`);
  if(secim()) ilPanel(`${secimAd().charAt(0).toLocaleUpperCase("tr-TR")+secimAd().slice(1)} · iller`,"seçimin il satışı · il tüketimindeki payı",[...ILS].map(([i,v])=>[i,v,ILT.get(i)?"il tüketiminin "+pct(v/ILT.get(i)):""]),ton,[ton([...ILS.values()].reduce((a,b)=>a+b,0)),"toplam"]);
  else ilPanel("İl sıralaması",`${(urunAd()||"Tüm ürünler").toLocaleLowerCase("tr-TR")} tüketimi`,[...ILT].map(([i,v])=>[i,v,""]),ton,null);
  takasOklari(); kartlar();
}
const KARTLAR=[["tum","Tüm ürünler"],["a0","Benzin"],["a1","Motorin"],["L","LPG"],["a3","Havacılık"],["a2","Fuel Oil"],["a4","Denizcilik"],["a6","Diğer"],["a5","Gazyağı"]];
function kartlar(){
  const tot=u=>{let n=0,s=0; for(const f of AF) if(prA(f,u)){n+=f[6]; if(sA(f)&&(S.term==null||f[1]===S.term)) s+=f[6];} for(const f of LF) if(prL(f,u)){n+=f[6]; if(sL(f)&&(S.term==null||f[1]===S.term)) s+=f[6];} return [s,n]};
  document.getElementById("cards").innerHTML=KARTLAR.map(([u,t])=>{const [s,n]=tot(u); if(s<0.5) return "";
    return `<button type="button" class="card" style="--uc:${URENK[u][2]}" data-urun="${u}" aria-pressed="${S.urun===u||(u==="L"&&S.urun[0]==="l")}"><span>${t}</span><b>${ton(s)}</b><span>${secim()?"ülke tüketiminin "+pct(s/n):"ülke tüketimi"}</span></button>`}).join("");
}
const tip=document.getElementById("tip"), box=document.getElementById("mapbox");
svgM.addEventListener("pointermove",e=>{
  if(BAY()){ const n=e.target.dataset?.il; if(!n){tip.classList.remove("on");return} const i=+n, b=box.getBoundingClientRect(), T=BIT.get(i)||[0,0,0], o=BAYH.get(i);
    tip.innerHTML=`<b>${esc(IL.get(i))}</b><br>${nf.format(T[2])} istasyon (akaryakıt ${nf.format(T[0])} · otogaz ${nf.format(T[1])})`+(S.sid>=0?`<br>${esc(SIR[S.sid][1])}: ${o&&o[2]?nf.format(o[2])+" istasyon · "+pct(o[2]/(T[2]||1)):"yok"}`:"");
    tip.style.left=Math.min(Math.max(e.clientX-b.left,130),b.width-130)+"px"; tip.style.top=(e.clientY-b.top)+"px"; tip.classList.add("on"); return; }
  const tt=e.target.dataset?.term;
  if(tt!=null){const t=+tt,o=TN.get(t),b=box.getBoundingClientRect(); if(!o) return;
    tip.innerHTML=`<b>${esc(TERM[t][1])}</b><br>${esc(HUB[TERM[t][2]].ad)}<br>${esc(urunAd())}: ${ton(o.v)} · ${o.il.size} il${o.est>=0.5*o.v?"<br>terminal ataması tahmin (soluk nokta)":""}<br><span style="opacity:.75">Tıklayınca etki alanı açılır</span>`;
    tip.style.left=Math.min(Math.max(e.clientX-b.left,130),b.width-130)+"px"; tip.style.top=(e.clientY-b.top)+"px"; tip.classList.add("on"); return;}
  const n=e.target.dataset?.il; if(!n){tip.classList.remove("on");return}
  const i=+n, t=ILT.get(i)||0, s=ILS.get(i)||0, b=box.getBoundingClientRect();
  let h=`<b>${esc(IL.get(i))}</b><br>${urunAd()||"Tüm ürünler"} tüketimi: ${t>0.5?ton(t):"yok"}`;
  if(secim()) h+=`<br>${esc(secimAd())}: ${s>0.5?ton(s)+" · "+pct(t?s/t:0):"yok"}`;
  tip.innerHTML=h; tip.style.left=Math.min(Math.max(e.clientX-b.left,130),b.width-130)+"px"; tip.style.top=(e.clientY-b.top)+"px"; tip.classList.add("on");});
svgM.addEventListener("pointerleave",()=>tip.classList.remove("on"));
addEventListener("resize",()=>tip.classList.remove("on"));
svgM.addEventListener("click",e=>{const tt=e.target.dataset?.term; if(tt!=null){const t=+tt; S.term=S.term===t?null:t; render(); return;} const n=e.target.dataset?.il; if(!n) return; const i=+n; S.il=S.il===i?null:i; render();});
document.getElementById("cards").addEventListener("click",e=>{const c=e.target.closest("[data-urun]"); if(c){S.urun=c.dataset.urun; render();}});

/* ---------- Dağıtıcılar arası ticaret (eski adı Dağıtıcı müşterileri; kullanıcı 14.10.2026 14:23 yeniden adlandırma + müşteri filtresi) (kullanıcı 08.10.2026: filtre dağıtıcı + terminal; tablo müşteri, ürün, ana kaynak) ---------- */
const teslim=m=>{const x=MOD[m]||""; return x.startsWith("Terminal içi devir (takas")?(x.includes("ürün değişimi")?"Takas (ürün değişimi)":"Takas (bayi yönlendirmesi)"):x.startsWith("Rafineri tahsisinden alım")?"Rafineri tahsisinden alım":x.startsWith("Terminal içi devir")?"Terminal içi devir":x.startsWith("Dağıtıcıdan alım (takas")?"Takas (alıcının terminali)":x.startsWith("Grup içi")?"Grup içi alım":"Kendi akışı"};
// Tedarik yolu: müşteri seçiliyken satıcı × kaynak × yöntem × yükleme terminali (kullanıcı 15.10.2026 14:41)
function yolParca(m){ m=String(m||"?"); let tk="";
  const t=m.match(/^(.*?takası)\); *(.*)$/); if(t){ tk=t[1]+")"; m=t[2]; }
  let a, y; const r=m.match(/^Rafineri tahsisinden alım \((.*)\)$/);
  if(r){ a="tahsis"; y=r[1]; }
  else if(m.startsWith("Terminal içi devir (takas; ürün")){ a="ud"; y="Terminal içi (taşıma yok)"; }
  else if(m.startsWith("Terminal içi devir (takas")){ a="by"; y="Terminal içi (taşıma yok)"; }
  else if(m.startsWith("Terminal içi devir")){ a="devir"; y="Terminal içi (taşıma yok)"; }
  else { a="diger"; y=m; }
  const r2=y.match(/^Rafineri tahsisinden alım \((.*)\)$/); if(r2) y=r2[1];
  return {a,y,tk}; }
function yolMus(){
  const el=document.getElementById("yol-mus"); if(S.mm<0){ el.hidden=true; el.innerHTML=""; return; }
  const G=new Map();
  for(const f of AF) if(okA(f)&&f[0]===S.mm&&f[11]!==f[0]&&!isTk(f)){
    const k=[f[11],f[4],f[5],f[1]].join("|"); const g=G.get(k)||G.set(k,{s:f[11],k:f[4],m:f[5],t:f[1],u:new Map(),v:0,km:0,il:new Set(),ith:0}).get(k);
    g.u.set(f[3],(g.u.get(f[3])||0)+f[6]); g.v+=f[6]; g.km+=f[7]*f[6]; g.il.add(f[2]); g.ith+=f[10]||0; }
  const L=[...G.values()].filter(g=>g.v>=0.5).sort((a,b)=>b.v-a.v); if(!L.length){ el.hidden=true; el.innerHTML=""; return; }
  const T=L.reduce((a,g)=>a+g.v,0), AU=["Benzin","Motorin","Fuel Oil","Havacılık","Denizcilik","Gazyağı","Diğer"];
  const dot=u=>`<span class="dot" style="background:${URENK["a"+u]?URENK["a"+u][2]:"var(--ink-3)"}"></span>`;
  const sat=s=>esc(SIR[s][1]), mus=esc(SIR[S.mm][1]);
  const rows=L.slice(0,12).map(g=>{ const K=KAY[g.k], ky=String(K[2]||""), ithal=ky.startsWith("Dağıtıcı")||g.ith>g.v*0.5, p=yolParca(MOD[g.m]);
    const kaynak=ithal?`${esc(K[1])} ithalatı`:ky==="Rafineri"?`${esc(K[1])}`:esc(K[1]);
    const kAlt=ithal?"ithal ürün":p.a==="tahsis"?`${sat(g.s)} tahsisi`:ky==="Rafineri"?"rafineri ürünü":"kaynak";
    const anl={tahsis:"satıcının rafineri tahsisinden",devir:"terminalde devir (dağıtıcıdan alım)",ud:"takas – ürün değişimi",by:"takas – bayi yönlendirmesi",diger:"satıcı üzerinden"}[p.a];
    const sc=ithal?"#7553B5":"var(--accent)";
    const chain=`<div class="yol-s" style="--sc:${sc}"><span>${kAlt}</span><b>${kaynak}</b></div><span class="yol-a" aria-hidden="true">→</span>`
      +`<div class="yol-s" style="--sc:var(--ink-2)"><span>taşıma</span><b>${esc(p.y)}</b></div><span class="yol-a" aria-hidden="true">→</span>`
      +`<div class="yol-s" style="--sc:#C8641C"><span>yükleme terminali</span><b>${esc(TERM[g.t][1])}</b></div><span class="yol-a" aria-hidden="true">→</span>`
      +`<div class="yol-s" style="--sc:var(--ink-3)"><span>bayiye karayolu</span><b>${g.il.size} il · ort. ${nf.format(Math.round(g.km/g.v))} km</b></div>`;
    const us=[...g.u].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]).map(([u,v])=>`<span>${dot(u)}${AU[u]} ${ton(v)}</span>`).join("");
    const not=`${mus} ← ${sat(g.s)}: ${ithal?esc(K[1])+" ithal ürünü":esc(K[1])+" ürünü"}, ${anl}; ${p.y.startsWith("Terminal içi")?"teslim "+esc(TERM[g.t][1])+" terminalinde":"taşıma "+esc(p.y)+" · varış "+esc(TERM[g.t][1])}${p.tk?` · ${esc(p.tk)}`:""}.`;
    return `<div class="yol-r"><div class="yol-c">${chain}</div><div class="yol-t"><b>${ton(g.v)}</b>${us}<span class="muted">${pct(g.v/T)}</span></div><p class="yol-n">${not}</p></div>`; }).join("");
  el.hidden=false;
  el.innerHTML=`<div class="head"><h3>${mus} – ürün nereden, nasıl geliyor</h3><span class="sub">${L.length} yol · ${ton(T)}${L.length>12?" · ilk 12":""}</span></div>${rows}`;
}
function musteriler(){
  // Müşteri filtresi (kullanıcı 14.10.2026 14:23): seçenekler seçili satıcının (ya da tüm satıcıların) dağıtıcı müşterileri; kendi satışı hariç
  { const mm=new Map(); for(const f of AF){ if(f[11]===f[0]||isTk(f)||(S.sid>=0&&f[11]!==S.sid)) continue; mm.set(f[0],(mm.get(f[0])||0)+f[6]); }
    if(S.mm>=0&&!(mm.get(S.mm)>=0.5)) S.mm=-1;
    const o=[...mm].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]), fM=document.getElementById("f-mmus");
    fM.innerHTML=`<option value="-1">Tüm müşteriler (${o.length})</option>`+o.map(([a,v])=>`<option value="${a}">${esc(SIR[a][1])} · ${ton(v)}</option>`).join(""); fM.value=String(S.mm); }
  // Müşteri → terminal (ara toplam) → ürün kırılımı; müşteri satırında ürün bazında ara toplamlar (kullanıcı 09.10.2026 22:13, 22:16)
  const tum=S.sid<0, m=new Map(), AU=["Benzin","Motorin","Fuel Oil","Havacılık","Denizcilik","Gazyağı","Diğer"];
  for(const f of AF) if(okA(f)){
    const gk=f[11]+"|"+f[0], g=m.get(gk)||m.set(gk,{sat:f[11],al:f[0],v:0,u:new Map(),t:new Map()}).get(gk);
    const pt=g.t.get(f[1])||g.t.set(f[1],{v:0,il:new Set(),u:new Map()}).get(f[1]);
    const o=pt.u.get(f[3])||pt.u.set(f[3],{v:0,il:new Set(),src:new Map(),tes:new Map()}).get(f[3]);
    g.v+=f[6]; g.u.set(f[3],(g.u.get(f[3])||0)+f[6]); pt.v+=f[6]; pt.il.add(f[2]); o.v+=f[6]; o.il.add(f[2]);
    const s=KAY[f[4]][2].startsWith("Dağıtıcı")?KAY[f[4]][1]+" ithalatı":KAY[f[4]][1]; o.src.set(s,(o.src.get(s)||0)+f[6]);
    const te=teslim(f[5])+(ZIN[f[5]]?`<br><span class="zn">zincir: ${esc(s+" → "+zinSira(ZIN[f[5]]))}</span>`:""); o.tes.set(te,(o.tes.get(te)||0)+f[6]);
  }
  const grp=[...m.values()].filter(g=>g.v>0.5).sort((a,b)=>(a.al===a.sat)-(b.al===b.sat)||b.v-a.v);
  const kay=o=>[...o.src].sort((a,b)=>b[1]-a[1]).filter((x,i)=>i===0||(i===1&&x[1]/o.v>=0.15)).map(x=>`${esc(x[0])} · ${pct(x[1]/o.v)}`).join("<br>");
  const tes=o=>[...o.tes].sort((a,b)=>b[1]-a[1])[0][0];
  const dot=u=>`<span class="dot" style="background:${URENK["a"+u]?URENK["a"+u][2]:"var(--ink-3)"}"></span>`;
  const LIM=30, gs=S.hepsiM?grp:grp.slice(0,LIM);
  const head=`<tr><th class="l">Müşteri / terminal / ürün</th><th>Miktar</th><th>İl</th><th class="l">Teslim</th><th class="l">Ana kaynak</th></tr>`;
  const body=gs.map(g=>{const kendi=g.al===g.sat;
    const ozet=[...g.u].filter(([,v])=>v>0.5).sort((a,b)=>b[1]-a[1]).map(([u,v])=>`${dot(u)}${AU[u]} <b>${ton(v)}</b>`).join(" &nbsp; ");
    let h=`<tr class="tg grp${kendi?" kendi":""}"><td class="l"><b>${kendi?"Kendi satışı":esc(SIR[g.al][1])}</b>${tum?`<br><span class="muted">satıcı: ${esc(SIR[g.sat][1])}</span>`:kendi?`<br><span class="muted">${esc(SIR[g.al][1])}</span>`:""}</td><td><b>${ton(g.v)}</b></td><td></td><td class="l" colspan="2"><span style="font-size:13px">${ozet}</span></td></tr>`;
    const ts=[...g.t].filter(([,p])=>p.v>0.5).sort((a,b)=>b[1].v-a[1].v);
    for(const [t,pt] of ts){
      const us=[...pt.u].filter(([,o])=>o.v>0.5).sort((a,b)=>b[1].v-a[1].v);
      if(us.length===1){const [u,o]=us[0];
        h+=`<tr class="sub" tabindex="0" data-term="${t}"><td class="l ind"><b>${(esc(TERM[t][1])+LIS(t,0))}</b> <span class="muted">· ${esc(HUB[TERM[t][2]].ad)}</span><br>${dot(u)}<span class="muted">${AU[u]}</span></td><td><b>${cell(o.v)}</b></td><td>${o.il.size}</td><td class="l"><span class="muted">${tes(o)}</span></td><td class="l"><span class="muted">${kay(o)}</span></td></tr>`; continue;}
      h+=`<tr class="sub" tabindex="0" data-term="${t}"><td class="l ind"><b>${(esc(TERM[t][1])+LIS(t,0))}</b> <span class="muted">· ${esc(HUB[TERM[t][2]].ad)} · ara toplam</span></td><td><b>${cell(pt.v)}</b></td><td>${pt.il.size}</td><td></td><td></td></tr>`;
      for(const [u,o] of us) h+=`<tr class="sub"><td class="l ind2">${dot(u)}${AU[u]}</td><td>${cell(o.v)}</td><td>${o.il.size}</td><td class="l"><span class="muted">${tes(o)}</span></td><td class="l"><span class="muted">${kay(o)}</span></td></tr>`;
    }
    return h}).join("");
  const more=grp.length>LIM?`<tr><td colspan="5" class="empty"><button type="button" class="clear" id="hepsiM">${S.hepsiM?`İlk ${LIM} müşteriyi göster`:`Tümünü göster (${grp.length} müşteri)`}</button></td></tr>`:"";
  document.getElementById("t-mus").innerHTML=`<thead>${head}</thead><tbody>${body?body+more:`<tr><td colspan="5" class="empty">Bu seçimde dağıtıcı satışı yok.</td></tr>`}</tbody>`;
  const sat=grp.filter(g=>g.al!==g.sat), nM=new Set(sat.map(g=>g.al)).size, vS=sat.reduce((a,g)=>a+g.v,0), vK=grp.reduce((a,g)=>a+g.v,0)-vS;
  document.getElementById("s-mus").textContent=grp.length?`${nM} müşteri · satış ${ton(vS)}${vK>0.5?` · kendi ${ton(vK)}`:""} · LPG hariç`:"";
  yolMus();
  document.getElementById("h-mus").textContent=(tum?"Dağıtıcılar arası satışlar":`${SIR[S.sid][1]} – müşteriler`)+(S.mm>=0?` → ${SIR[S.mm][1]}`:"");
}


/* ---------- Tedarik tahsisi (PDM 09.10.2026, REF_TEDARIK_TAHSIS) ---------- */
const TD=JSON.parse(document.getElementById("tahsis").textContent), TH=TD.th;
const TAH=()=>S.sayfa==="tahsis";
const TIP=["Kendi ithalatı","Rafineri","Dağıtıcı","Tahsis üzerinden"], TPILL=["i","r","d","d"], TURUN=["Benzin","Motorin"];
const SINAD={A:"A sınıfı · lider",B:"B sınıfı · büyük",C:"C sınıfı · orta",D:"D sınıfı · küçük",E:"E sınıfı · mikro"};
let OPT_TAH="", TAH_SID=new Set();
(function(){
  const tot=new Map(); for(const r of TH) if(!r[5]) tot.set(r[0],(tot.get(r[0])||0)+r[6]);
  const ids=[...tot.keys()].sort((a,b)=>(TD.sin[a]||"E").localeCompare(TD.sin[b]||"E")||tot.get(b)-tot.get(a));
  TAH_SID=new Set(ids);
  let g="", h='<option value="-1">Tüm şirketler</option>';
  for(const i of ids){const c=TD.sin[i]||"E"; if(c!==g){ if(g) h+="</optgroup>"; h+=`<optgroup label="${SINAD[c]}">`; g=c;} h+=`<option value="${i}">${esc(SIR[i][1])} · ${ton(tot.get(i))}</option>`;}
  OPT_TAH=h+"</optgroup>";
})();
// Kartlar (PDM görevi panel-aytemiz-toptan-dahil-kart, kullanıcı 13.10.2026 11:48): toplam çıkış = satış (bayi + serbest) + toptan;
// kaynak kartları toptan karşılığı dahil, iki kırılımla.
const KP_AD=["Kendi ithalatı","Rafineriden","Dağıtıcıdan","Tahsis üzerinden"];
/* Kompozisyon kartı (kullanıcı 17.10.2026: görsel zenginlik): başlık + büyük toplam + yığılmış çubuk + açıklamalı satırlar */
function kompKart(baslik,parts,o={}){
  const f=o.fmt||ton, P=parts.filter(p=>p.v>=0.5), T=o.T??P.reduce((a,p)=>a+p.v,0);
  return `<div class="kc"${o.span?` style="--sp:${o.span}"`:""}><div class="kc-h"><span>${baslik}</span>${o.sag?`<span>${o.sag}</span>`:""}</div>`
    +(o.buyuk!=null?`<div class="kc-big"><b>${o.buyuk}</b>${o.alt?`<span>${o.alt}</span>`:""}</div>`:"")
    +(P.length?`<div class="kc-st" role="img" aria-label="${esc(baslik)}">${P.map(p=>`<i style="flex:${p.v.toFixed(2)} 1 0;background:${p.c}" title="${esc(p.l)}: ${f(p.v)}"></i>`).join("")}</div>`:"")
    +`<div class="kc-lg">${P.map(p=>`<div class="kc-r"><i style="background:${p.c}"></i><span class="kc-l">${esc(p.l)}${p.s?`<small>${p.s}</small>`:""}</span><b>${f(p.v)}</b><em>${pct(T?p.v/T:0)}</em></div>`).join("")}</div>`
    +(o.not?`<p class="kc-not">${o.not}</p>`:"")+`</div>`;
}
function siraKart(baslik,rows,o={}){ // rows [[ad, değer]] – sıralı çubuk listesi
  const f=o.fmt||ton, R=rows.filter(r=>r[1]>=0.5).sort((a,b)=>b[1]-a[1]), M=R.length?R[0][1]:1, n=o.n||6;
  return `<div class="kc"${o.span?` style="--sp:${o.span}"`:""}><div class="kc-h"><span>${baslik}</span>${o.sag?`<span>${o.sag}</span>`:""}</div><div class="kc-sl">${R.slice(0,n).map(([a,v])=>`<div class="kc-s"><span>${esc(a)}</span><span class="kc-bar"><i style="width:${(v/M*100).toFixed(1)}%;background:${o.c||"var(--accent)"}"></i></span><b>${f(v)}</b></div>`).join("")}</div>${R.length>n?`<p class="kc-not">+${R.length-n} daha${o.not?" · "+o.not:""}</p>`:o.not?`<p class="kc-not">${o.not}</p>`:""}</div>`;
}
const KP_RENK=["#2A5591","#0F6E8C","#B7791F","#7553B5"];

// db_110: tahsisi olmayan satıcının yerli ürünü hangi tahsis sahibinden geliyor (zincir)
const zinOz=sid=>{ const a=(TD.zs||{})[sid]; if(!a||!a.length) return ""; const T=a.reduce((q,x)=>q+x[1],0);
  return `<br><span class="zn">tahsisi yok · yerli ürün zinciri:<br>${a.slice(0,4).map(([z,v])=>`${esc(TD.zn[z].replace(/^[^←]*← /,""))} ${pct(v/T)}`).join("<br>")}</span>`; };
function tahsisKart(V,Vt,byS,byT){
  const C=V+Vt;
  return `<div class="kg">`+kompKart("Toplam çıkış",[{l:"Satış (bayi + serbest)",v:V,c:"#0F6E8C",s:"toptan hariç · benzin + motorin"},{l:"Toptan satış karşılığı",v:Vt,c:"#8CC3D3",s:"başka dağıtıcıya satılan"}],{buyuk:ton(C),alt:"benzin + motorin",span:5})
    +kompKart("Kaynak dağılımı",KP_AD.map((l,i)=>{const a=byS[i]||0,b=byT[i]||0; return {l,v:a+b,c:KP_RENK[i],s:`kendi satışı ${ton(a)}${b>0.5?` + toptan karşılığı ${ton(b)}`:""}`};}),{T:C,sag:"toplam çıkışın kaynakları",span:7})+`</div>`;
}
function tahsis(){
  const TT_=new Map(); for(const r of TH) if(r[5]) TT_.set(r[0],(TT_.get(r[0])||0)+r[6]);
  // Terminal bazında toplu görünüm (kullanıcı 09.10.2026 09:40): terminal satırı + altında satıcı × ürün × taşıma yöntemi kırılımı
  const tum=S.sid<0, G=new Map(), at=new Map();
  for(const r of TH){ if(!tum&&r[0]!==S.sid) continue;
    const gk=(tum?r[0]:-1)+"|"+r[3];
    const g=G.get(gk)||G.set(gk,{a:r[0],t:r[3],v:0,vk:0,nk:0,u:[0,0],ch:new Map(),md:new Map()}).get(gk);
    g.v+=r[6]; if(!r[5]){g.vk+=r[6]; g.nk+=r[8]*r[6];} g.u[r[4]]+=r[6];
    const ck=[r[1],r[4]].join("|");   // kırılım yalnız kaynak × ürün (kullanıcı 09:44: satış kanalı ve taşıma yöntemi dışarıda)
    const c=g.ch.get(ck)||g.ch.set(ck,{s:r[1],tp:r[2],u:r[4],zm:new Map(),v:0,il:0,nk:0,md:new Map()}).get(ck); if((r[10]??-1)>=0) c.zm.set(r[10],(c.zm.get(r[10])||0)+r[6]);
    c.v+=r[6]; c.md.set(r[9],(c.md.get(r[9])||0)+r[6]); g.md.set(r[9],(g.md.get(r[9])||0)+r[6]);   // taşıma modu (kullanıcı 11.10.2026 21:22) c.il=Math.max(c.il,r[7]); c.nk+=r[8]*r[6];
    if(!r[5]) at.set(r[0],(at.get(r[0])||0)+r[6]);
  }
  const grs=[...G.values()].filter(g=>g.v>=0.5).sort((x,y)=>(tum?(at.get(y.a)||0)-(at.get(x.a)||0)||(x.a-y.a):0)||y.v-x.v);
  let V=0,Vt=0; const by=[0,0,0,0], byT=[0,0,0,0];
  for(const r of TH){ if(!tum&&r[0]!==S.sid) continue; if(r[5]){ Vt+=r[6]; byT[r[2]]+=r[6]; } else {V+=r[6]; by[r[2]]+=r[6];} }
  const cls=tum?null:(TD.sin[S.sid]||"E"), nCh=grs.reduce((a,g)=>a+g.ch.size,0);
  document.getElementById("h-tah").textContent=tum?"Tedarik tahsisi – tüm şirketler":`${SIR[S.sid][1]} – kimden, nerede alıyor`;
  document.getElementById("s-tah").textContent=grs.length?`${grs.length} terminal · ${nCh} kırılım`:"";
  document.getElementById("l-tah").textContent=tum?"Alımı yapan şirketi seçin. Her terminalin altında kaynak × ürün kırılımı yer alır."
    :`${SINAD[cls]}. ${"ABC".includes(cls)?(SIR[S.sid][1]==="Opet"?"İthalat dışı ihtiyaç yalnız Tüpraş rafinerilerinden.":SIR[S.sid][1]==="Socar"?"İthalat dışı ihtiyaç yalnız Star Rafineri'den.":"İthalat dışı ihtiyaç rafinerilerden, en düşük navlunla."):"İthalattan kalan ihtiyaç A/B/C dağıtıcılarından, en düşük navlunla."}`;
  document.getElementById("k-tah").innerHTML=tahsisKart(V,Vt,by,byT);
  const modAd=m=>{const x=String(TD.mod[m]??"");return x==="Terminal içi devir (dağıtıcıdan alım)"?"Terminal içi devir":x;};
  const mods=(md,v)=>{const a=[...md].filter(([,x])=>x>=0.5).sort((p,q)=>q[1]-p[1]); return a.length?a.map(([m,x])=>esc(modAd(m))+(a.length>1?` <span class="muted">${pct(x/(v||1))}</span>`:"")).join("<br>"):'<span class="z">–</span>';};
  const head=`<tr>${tum?'<th class="l">Alıcı</th>':""}<th class="l">Terminal / satıcı</th><th class="l">Ürün</th><th class="l">Mod</th><th>Miktar</th><th>Pay</th><th>İl</th><th>Navlun endeksi</th></tr>`;
  const lim=S.hepsiT?1e9:40, out=[]; let prevA=null;
  for(const g of grs.slice(0,lim)){
    const tot=(tum?(at.get(g.a)||0)+(TT_.get(g.a)||0):(V+Vt))||1, firstA=g.a!==prevA; prevA=g.a;
    const ur=[0,1].filter(u=>g.u[u]>0.5).map(u=>`<span class="dot" style="background:${URENK["a"+u]?URENK["a"+u][2]:"var(--ink-3)"}"></span>${TURUN[u]} ${ton(g.u[u])}`).join("<br>");
    out.push(`<tr class="grp tg">${tum?`<td class="l">${firstA?`<b>${esc(SIR[g.a][1])}</b><br><span class="muted">${TD.sin[g.a]||"E"} sınıfı</span>`:""}</td>`:""}<td class="l"><b>${g.t<0?"Terminal belirtilmemiş":(esc(TERM[g.t][1])+LIS(g.t,0))}</b><br><span class="muted">${g.t<0?"il bazlı satırlar / satıcının ithalat noktası":esc(HUB[TERM[g.t][2]].ad)}</span></td><td class="l"><span class="muted">${ur}</span></td><td class="l"><span class="muted">${mods(g.md,g.v)}</span></td><td><b>${ton(g.v)}</b></td><td>${pct(g.v/tot)}</td><td>${TD.til[g.a+"|"+g.t]||'<span class="z">–</span>'}</td><td>${g.vk>0.5?nf.format(g.nk/g.vk)+" km":'<span class="z">–</span>'}</td></tr>`);
    const ch=[...g.ch.values()].filter(c=>c.v>=0.5).sort((x,y)=>(x.u-y.u)||y.v-x.v);
    for(const c of ch) out.push(`<tr class="sub">${tum?"<td></td>":""}<td class="l ind"><span class="pill ${TPILL[c.tp]}">${TIP[c.tp]}</span>${esc(TD.sat[c.s])}${c.zm.size&&TD.zn?`<br><span class="zn">tahsisi yok · ${[...c.zm].sort((a,b)=>b[1]-a[1]).map(([z,v])=>`${esc(TD.zn[z].replace(/^[^←]*← /,""))}${c.zm.size>1?" "+pct(v/(c.v||1)):""}`).join(" · ")}</span>`:""}</td><td class="l"><span class="dot" style="background:${URENK["a"+c.u]?URENK["a"+c.u][2]:"var(--ink-3)"}"></span>${TURUN[c.u]}</td><td class="l">${mods(c.md,c.v)}</td><td>${cell(c.v)}</td><td>${pct(c.v/tot)}</td><td>${c.il||'<span class="z">–</span>'}</td><td>${nf.format(c.nk/c.v)} km</td></tr>`);
  }
  const more=grs.length>40?`<tr><td colspan="8" class="empty"><button type="button" class="clear" id="hepsiT">${S.hepsiT?"İlk 40 terminali göster":`Tüm terminalleri göster (${grs.length})`}</button></td></tr>`:"";
  document.getElementById("t-tah").innerHTML=`<thead>${head}</thead><tbody>${out.length?out.join("")+more:'<tr><td colspan="8" class="empty">Bu şirket için tahsis yok.</td></tr>'}</tbody>`;
}


/* ---------- Tedarik tahsisi kaynak bazlı (kullanıcı 09.10.2026 09:46): terminal kırılımı yok ---------- */
const KAYN=()=>S.sayfa==="kaynak";
const KRENK=["#2A5591","#0F6E8C","#C8641C","#8A5A14"];   // kendi ithalatı · rafineri · dağıtıcı ailesi
function kaynakDag(){
  const tum=S.sid<0, m=new Map();
  for(const r of TH){ if(!tum&&r[0]!==S.sid) continue;
    const o=m.get(r[1])||m.set(r[1],{s:r[1],tp:r[2],u:[0,0],tu:[0,0],nu:[0,0],ku:[0,0]}).get(r[1]);
    o.u[r[4]]+=r[6]; if(r[5]) o.tu[r[4]]+=r[6]; else {o.ku[r[4]]+=r[6]; o.nu[r[4]]+=r[8]*r[6];}
  }
  const rows=[...m.values()].map(o=>(o.v=o.u[0]+o.u[1],o.tt=o.tu[0]+o.tu[1],o)).filter(o=>o.v>=0.5).sort((a,b)=>(a.tp-b.tp)||b.v-a.v);
  const T=rows.reduce((a,o)=>a+o.v,0)||1, TU=[0,1].map(u=>rows.reduce((a,o)=>a+o.u[u],0)), Tt=rows.reduce((a,o)=>a+o.tt,0), V=T-Tt, by=[0,0,0,0], byT=[0,0,0,0];
  for(const o of rows){ by[o.tp]+=o.v-o.tt; byT[o.tp]+=o.tt; }
  const sh=[0,0,0,0]; for(const o of rows){o.c=KRENK[o.tp]; o.op=Math.max(.35,1-0.16*sh[o.tp]++);}
  const cls=tum?null:(TD.sin[S.sid]||"E"), showT=!tum&&Tt>0.5;
  document.getElementById("h-kay").textContent=tum?"Kaynak dağılımı – tüm şirketler":`${SIR[S.sid][1]} – kaynak dağılımı`;
  document.getElementById("s-kay").textContent=rows.length?`${rows.length} kaynak · ${ton(T)}`:"";
  document.getElementById("l-kay").textContent=tum?"Pazarın tamamı: benzin ve motorinin kaynaklara göre dağılımı. Alımı yapan şirketi seçerek tek şirkete inin."
    :`${SINAD[cls]}. ${"ABC".includes(cls)?(SIR[S.sid][1]==="Opet"?"İthalat dışı ihtiyaç yalnız Tüpraş rafinerilerinden.":SIR[S.sid][1]==="Socar"?"İthalat dışı ihtiyaç yalnız Star Rafineri'den.":"İthalat dışı ihtiyaç rafinerilerden, en düşük navlunla."):"İthalattan kalan ihtiyaç A/B/C dağıtıcılarından, en düşük navlunla."}`;
  document.getElementById("k-kay").innerHTML=tahsisKart(V,Tt,by,byT);

  // Rafineri alımları KPI (kullanıcı 10:00): rafineri × benzin/motorin
  // Tüpraş rafinerileri tek kutuda (kullanıcı 10:01)
  const RFm=new Map(); for(const o of rows.filter(o=>o.tp===1)){const ad=TD.sat[o.s].startsWith("Tüpraş")?"Tüpraş":TD.sat[o.s];
    const g=RFm.get(ad)||RFm.set(ad,{ad,c:o.c,op:o.op,u:[0,0],v:0,tt:0}).get(ad); g.u[0]+=o.u[0]; g.u[1]+=o.u[1]; g.v+=o.v; g.tt+=o.tt;}
  const RF=[...RFm.values()].sort((a,b)=>b.v-a.v), RT=RF.reduce((a,o)=>a+o.v,0), RU=[0,1].map(u=>RF.reduce((a,o)=>a+o.u[u],0));
  document.getElementById("hr-t").textContent="Rafineri alımları";
  document.getElementById("hr-kay").hidden=!RF.length; document.getElementById("r-kay").hidden=!RF.length;
  document.getElementById("sr-kay").textContent=RF.length?`Toplam ${ton(RT)} · Benzin ${ton(RU[0])} · Motorin ${ton(RU[1])}${showT?" · toptan satış için alım dahil":""}`:"";
  // Ciro primi ve vade rafineri bazında ayrı (kullanıcı 10:04 + 10:12): Tüpraş SPD-543, Star 2025 koşulları; tahsisteki rafineri alımına göre
  const KS=(!tum&&TD.kos[S.sid])||[];
  const p2=v=>"%"+new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2}).format(v*100);
  const dotU=u=>`<span class="dot" style="background:${URENK["a"+u]?URENK["a"+u][2]:"var(--ink-3)"}"></span>`;
  const kosKart=(ad,c)=>{const ks=KS.filter(r=>(r[0]==="Tüpraş"?"Tüpraş":r[0])===ad).sort((a,b)=>b[1]-a[1]); if(!ks.length) return "";
    const pm=ks.filter(r=>r[4]!=null&&r[1]===1), pT=pm.reduce((a,r)=>a+r[2],0), pW=pT?pm.reduce((a,r)=>a+r[2]*r[4],0)/pT:null, pP=pT?pm.reduce((a,r)=>a+r[2]*r[5],0)/pT:0;
    const vm=ks.filter(r=>r[6]!=null), vT=vm.reduce((a,r)=>a+r[2],0), vW=vT?vm.reduce((a,r)=>a+r[2]*r[6],0)/vT:null;
    const satir=ks.map(r=>`<span>${dotU(r[1])}${TURUN[r[1]]}</span><span class="muted">${r[6]==null?"koşul yok":r[1]===0&&ad==="Tüpraş"?"ciro primi yok":`kademe ${r[3]}${r[11]>0.5?` · sonraki kademeye ${ton(r[11])}`:""}`}</span><em>${r[4]==null||r[1]===0?"–":p2(r[4])+(r[5]>0?`<br><span class="muted">+${p2(r[5])} perf.</span>`:"")}</em><em>${r[6]==null?"–":nf1.format(r[6])+" gün"}</em>`
      +(r[6]==null?"":`<span></span><span class="muted vb">vade: baz ${nf1.format(r[7])} + ek ${nf.format(r[8])}${r[9]?` + perf. ${nf.format(r[9])}`:""}${r[10]>0.05?` + diğer ${nf1.format(r[10])}`:""}</span>`)).join("");
    return `<div class="kpi rf ks" style="--rc:${c};"><span>${ad==="Star Rafineri"?"Star":esc(ad)} · ciro primi ve vade</span><div class="kv"><div><b>${pW==null?"–":p2(pW)}</b><span>ciro primi${pW==null?"":" · motorin"}${pP>0?` · +${p2(pP)} performans primi`:""}</span></div><div><b>${vW==null?"–":nf1.format(vW)+" gün"}</b><span>vade · alım ağırlıklı</span></div></div><div class="pr pr4"><span></span><span></span><em class="h">Prim</em><em class="h">Vade</em>${satir}</div></div>`};
  document.getElementById("r-kay").innerHTML=RF.map(o=>{const pr=[0,1].map(u=>`<span><span class="dot" style="background:${URENK["a"+u]?URENK["a"+u][2]:"var(--ink-3)"}"></span>${TURUN[u]}</span><div class="kbar"><i style="width:${RU[u]>0.5?(o.u[u]/RU[u]*100).toFixed(1):0}%;background:${URENK["a"+u]?URENK["a"+u][2]:o.c}"></i></div><em>${o.u[u]>0.5?ton(o.u[u]):"–"}</em>`).join("");
    return `<div class="kpi rf" style="--rc:${o.c};"><span>${o.ad==="Star Rafineri"?"Star":esc(o.ad)}</span><b>${ton(o.v)}</b><span>${pct(o.v/(RT||1))} · rafineri alımının${o.tt>0.5?` · toptan için ${ton(o.tt)}`:""}</span><div class="pr">${pr}</div></div>`+kosKart(o.ad,o.c)}).join("");
  // En sağda ortalama ciro primi ve vade (kullanıcı 10:21): tüm rafineri alımları, alım ağırlıklı
  document.getElementById("r-kay").classList.toggle("g",KS.length>0);
  if(KS.length){
    const pm=KS.filter(r=>r[4]!=null&&r[1]===1), pT=pm.reduce((a,r)=>a+r[2],0), pW=pT?pm.reduce((a,r)=>a+r[2]*r[4],0)/pT:null, pP=pT?pm.reduce((a,r)=>a+r[2]*r[5],0)/pT:0;
    const vm=KS.filter(r=>r[6]!=null), vT=vm.reduce((a,r)=>a+r[2],0), vW=vT?vm.reduce((a,r)=>a+r[2]*r[6],0)/vT:null;
    const vu=[0,1].map(u=>{const x=vm.filter(r=>r[1]===u), t=x.reduce((a,r)=>a+r[2],0); return t?[x.reduce((a,r)=>a+r[2]*r[6],0)/t,t]:null});
    document.getElementById("r-kay").innerHTML+=`<div class="kpi rf ks av" style="--rc:var(--ink);"><span>Ortalama · ciro primi ve vade</span><div class="kv"><div><b>${pW==null?"–":p2(pW)}</b><span>ciro primi · motorin${pP>0?` · +${p2(pP)} perf.`:""}</span></div><div><b>${vW==null?"–":nf1.format(vW)+" gün"}</b><span>vade</span></div></div><div class="pr pr4"><span></span><span></span><em class="h">Alım</em><em class="h">Vade</em>${[0,1].filter(u=>vu[u]).map(u=>`<span>${dotU(u)}${TURUN[u]}</span><span class="muted">${u===1&&pW!=null?`ciro ${p2(pW)}`:""}</span><em>${ton(vu[u][1])}</em><em>${nf1.format(vu[u][0])} gün</em>`).join("")}</div><span class="muted" style="margin-top:4px">Tüpraş + Star, alım ağırlıklı</span></div>`;
  }
  // D/E: tedarikçi dağıtıcılar (kullanıcı 11:25: 1, gerekirse en çok 2 şirket)
  const DS=rows.filter(o=>o.tp===2||o.tp===3);
  // Dağıtıcıdan alım rafineri alımından büyükse dağıtıcı kartları gösterilir (kullanıcı 13.10.2026: Kadooğlu 4 kt rafineri, 630 kt PO)
  if(DS.length&&!tum&&DS.reduce((a,o)=>a+o.v,0)>RT){
    const DT=DS.reduce((a,o)=>a+o.v,0), DU=[0,1].map(u=>DS.reduce((a,o)=>a+o.u[u],0));
    document.getElementById("hr-t").textContent="Dağıtıcı alımları";
    document.getElementById("sr-kay").textContent=`${DS.length} tedarikçi · ${ton(DT)} · benzin ${ton(DU[0])} · motorin ${ton(DU[1])}`;
    document.getElementById("hr-kay").hidden=false; const rk=document.getElementById("r-kay"); rk.hidden=false; rk.classList.remove("g");
    rk.innerHTML=DS.map(o=>`<div class="kpi rf" style="--rc:${KRENK[2]};"><span>${esc(TD.sat[o.s])}</span><b>${ton(o.v)}</b><span>${pct(o.v/(DT||1))} · dağıtıcı alımının</span><div class="pr">${[0,1].map(u=>`<span>${dotU(u)}${TURUN[u]}</span><div class="kbar"><i style="width:${DU[u]>0.5?(o.u[u]/DU[u]*100).toFixed(1):0}%;background:${URENK["a"+u]?URENK["a"+u][2]:o.c}"></i></div><em>${o.u[u]>0.5?ton(o.u[u]):"–"}</em>`).join("")}</div></div>`).join("");
  }
  // Toptan satışlar (kullanıcı 11:16): seçili şirketin D/E alıcılarına hangi terminalde, ürün kırılımıyla ne kadar sattığı
  // Toptan müşteri filtresi (kullanıcı 13.10.2026 21:38): seçenekler seçili satıcının (ya da tüm satıcıların) toptan müşterileri
  const tpS=TD.tp.filter(r=>tum||r[0]===S.sid), mT=new Map(); for(const r of tpS) mT.set(r[1],(mT.get(r[1])||0)+r[4]);
  if(S.tmus>=0&&!mT.has(S.tmus)) S.tmus=-1;
  const fTM=document.getElementById("f-tmus"), tmO=[...mT].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]);
  fTM.innerHTML=`<option value="-1">Tüm müşteriler (${tmO.length})</option>`+tmO.map(([a,v])=>`<option value="${a}">${esc(SIR[a][1])} · ${ton(v)}</option>`).join(""); fTM.value=String(S.tmus); fTM.disabled=!tmO.length;
  const tmu=S.tmus>=0;
  const tps=tpS.filter(r=>!tmu||r[1]===S.tmus), tg=new Map();
  for(const r of tps){const k=(tum?r[0]:-1)+"|"+r[1]; const g=tg.get(k)||tg.set(k,{s:r[0],a:r[1],u:[0,0],t:new Map()}).get(k);
    g.u[r[3]]+=r[4]; const x=g.t.get(r[2])||g.t.set(r[2],{t:r[2],u:[0,0],il:0}).get(r[2]); x.u[r[3]]+=r[4]; x.il=Math.max(x.il,r[5]);}
  const st=new Map(); for(const g of tg.values()) st.set(g.s,(st.get(g.s)||0)+g.u[0]+g.u[1]);
  const grs=[...tg.values()].sort((x,y)=>(tum?(st.get(y.s)-st.get(x.s))||(x.s-y.s):0)||(y.u[0]+y.u[1])-(x.u[0]+x.u[1]));
  const TOP=grs.reduce((a,g)=>a+g.u[0]+g.u[1],0), TB=grs.reduce((a,g)=>a+g.u[0],0);
  document.getElementById("h-top").textContent=(tum?"Toptan satışlar – tüm satıcılar":`${SIR[S.sid][1]} – toptan satışlar`)+(tmu?` → ${SIR[S.tmus][1]}`:"");
  document.getElementById("s-top").textContent=grs.length?`${tmu?`${new Set(grs.map(g=>g.s)).size} satıcı`:`${new Set(grs.map(g=>g.a)).size} müşteri`} · ${ton(TOP)} · benzin ${ton(TB)} · motorin ${ton(TOP-TB)}`:"";
  const head=`<tr>${tum?'<th class="l">Satıcı</th>':""}<th class="l">Müşteri / terminal</th><th>Benzin</th><th>Motorin</th><th>Toplam</th><th>Pay</th><th>İl</th></tr>`;
  const out=[]; let prevS=null;
  for(const g of grs){const v=g.u[0]+g.u[1], tot=tum?st.get(g.s):TOP, fs=g.s!==prevS; prevS=g.s;
    out.push(`<tr class="grp tg">${tum?`<td class="l">${fs?`<b>${esc(SIR[g.s][1])}</b><br><span class="muted">${ton(st.get(g.s))}</span>${zinOz(g.s)}`:""}</td>`:""}<td class="l"><b>${esc(SIR[g.a][1])}</b> <span class="muted">· ${TD.sin[g.a]||"E"} sınıfı · ${g.t.size} terminal</span></td><td>${cell(g.u[0])}</td><td>${cell(g.u[1])}</td><td><b>${ton(v)}</b></td><td>${pct(v/(tot||1))}</td><td></td></tr>`);
    for(const x of [...g.t.values()].sort((p,q)=>(q.u[0]+q.u[1])-(p.u[0]+p.u[1]))){const w=x.u[0]+x.u[1]; if(w<0.5) continue;
      out.push(`<tr class="sub">${tum?"<td></td>":""}<td class="l ind">${(esc(TERM[x.t][1])+LIS(x.t,0))} <span class="muted">· ${esc(HUB[TERM[x.t][2]].ad)}</span></td><td>${cell(x.u[0])}</td><td>${cell(x.u[1])}</td><td>${ton(w)}</td><td>${pct(w/(tot||1))}</td><td>${x.il}</td></tr>`);}
  }
  if(grs.length) out.push(`<tr class="grp tg">${tum?"<td></td>":""}<td class="l"><b>Toplam</b></td><td><b>${ton(TB)}</b></td><td><b>${ton(TOP-TB)}</b></td><td><b>${ton(TOP)}</b></td><td>%100</td><td></td></tr>`);
  const bos=tmu?"Bu seçimde toptan satış yok.":!tum&&!"ABC".includes(TD.sin[S.sid]||"E")?"D/E sınıfı şirketler toptan satış yapmaz; bu şirket dağıtıcılardan alır.":"Bu şirketin D/E alıcılarına toptan satışı yok.";
  document.getElementById("t-kay").innerHTML=`<thead>${head}</thead><tbody>${out.length?out.join(""):`<tr><td colspan="7" class="empty">${bos}</td></tr>`}</tbody>`;
}

/* ---------- İthalat (kullanıcı 09.10.2026: başlık İthalat, filtre şirket, tablo terminal ve miktarlar) ---------- */
const ITH=()=>S.sayfa==="ithalat";
const TKD=D.tk||[], TKM=new Map(), TKM2=new Map();
for(const r of TKD){ const k=[r[0],r[2],r[3],r[4],r[5]].join("|"), k2=[r[0],r[3]].join("|");
  for(const [M,K] of [[TKM,k],[TKM2,k2]]){ const o=M.get(K)||M.set(K,new Map()).get(K); o.set(r[1],(o.get(r[1])||0)+r[6]); } }
// İç terminale transfer edilen ithal ürün (PDM 12.10.2026, Aytemiz Kırıkkale/Kocaeli, PO Doğu Karasal): ithalat giriş terminalinde gösterilir
const TRM=new Map((D.tr||[]).map(r=>[r[0]+"|"+r[1]+"|"+r[3],r[2]]));
const enb=m=>m?[...m].sort((a,b)=>b[1]-a[1])[0][0]:null;
const takasGiris=(sat,al,alT,il,u)=>enb(TKM.get([sat,al,alT,il,u].join("|")))??enb(TKM2.get([sat,alT].join("|")));
// Havalimanı depoları ithalat terminali değildir (PDM 09.10.2026, ithalat-imex-frekans): ithal yakıt limandan gelir, tek satırda toplanır.
// İstisna: T148 Arnavutköy, TFS'nin lisanslı ithalat terminali (DEP/9944-2/43996 – kullanıcı 09.10.2026 19:38).
const HAVA=t=>/havacılık deposu/i.test(TERM[t][1])&&TERM[t][0]!=="T148";
const ITH_SUT=[["Benzin",[0]],["Motorin",[1]],["Havacılık",[3]],["Denizcilik",[4]],["Fuel Oil",[2]],["Diğer",[5,6]]];
function ithalat(){
  const tum=S.sid<0, m=new Map(), g=t=>m.get(t)||m.set(t,{c:new Array(ITH_SUT.length+1).fill(0),sir:new Map()}).get(t);
  const ui=u=>ITH_SUT.findIndex(x=>x[1].includes(u));
  for(const f of AF){ const it=f[10]||0; if(it<0.05) continue; const imp=f[11]; if(!tum&&imp!==S.sid) continue;
    // Takas (alıcının kendi terminalinden yükleme): ithalat giriş terminalinde gösterilir (PDM 10.10.2026, REF_ITHALAT_TAKAS)
    const tk=(MOD[f[5]]||"").startsWith("Dağıtıcıdan alım (takas")&&imp!==f[0]?takasGiris(imp,f[0],f[1],f[2],f[3]):null;
    const trg=TRM.get(imp+"|"+f[1]+"|"+f[3]);   // iç terminaldeki ithal ürün (satıcının devri dahil) giriş terminalinden gelir
    const tx=trg!=null?trg:tk!=null?tk:/T148/.test(MOD[f[5]]||"")?TERM.findIndex(x=>x[0]==="T148"):f[1];   // TFS: ithalat noktası T148, diğer depolara oradan sevk (kullanıcı 09.10 19:38 / 10.10 14:34)
    const o=g(HAVA(tx)?-1:tx); o.c[ui(f[3])]+=it; o.sir.set(imp,(o.sir.get(imp)||0)+it); if(HAVA(tx)) (o.dep||=new Set()).add(tx); if(tk!=null&&tk!==f[1]) (o.tk||=new Map()).set(f[1],(o.tk.get(f[1])||0)+it); if(trg!=null&&trg!==f[1]) (o.tr||=new Map()).set(f[1],(o.tr.get(f[1])||0)+it); }
  // LPG akaryakıt ithalat sayfasından çıkarıldı (kullanıcı 18.10.2026 11:47); LPG ithalatı LPG > İthalat sayfasında
  const rows=[...m].map(([t,o])=>({t,o,tot:o.c.reduce((a,b)=>a+b,0)})).filter(r=>r.tot>0.5).sort((a,b)=>b.tot-a.tot);
  const colT=ITH_SUT.map((x,k)=>rows.reduce((a,r)=>a+r.o.c[k],0)).concat([rows.reduce((a,r)=>a+r.o.c[ITH_SUT.length],0)]);
  const ad=ITH_SUT.map(x=>x[0]).concat(["LPG"]), vis=colT.map(v=>v>=0.5), T=rows.reduce((a,r)=>a+r.tot,0);
  const head=`<tr><th class="l">Terminal</th>${ad.map((a,k)=>vis[k]?`<th>${a}</th>`:"").join("")}<th>Toplam</th><th>Pay</th>${tum?'<th class="l">İthalatçılar</th>':""}</tr>`;
  const body=rows.map(({t,o,tot})=>{const sr=[...o.sir].sort((a,b)=>b[1]-a[1]);
    const ith=sr.slice(0,3).map(([i,v])=>`${esc(SIR[i][1])} · ${pct(v/tot)}`).join("<br>")+(sr.length>3?`<br>+${sr.length-3} şirket`:"");
    const tkx=o.tk?[...o.tk].sort((a,b)=>b[1]-a[1]).map(([x,v])=>`${esc(TERM[x][1])} ${ton(v)}`).join(" · "):"";
    const ad0=t<0?`Havalimanı depolarına ithal yakıt<br><span class="muted">${o.dep.size} depo · liman veride belirtilmemiş</span>`:`${(esc(TERM[t][1])+LIS(t,0))}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)}</span>${tkx?`<br><span class="muted">takas → ${tkx}</span>`:""}${o.tr?`<br><span class="muted">iç terminale transfer → ${[...o.tr].sort((a,b)=>b[1]-a[1]).map(([x,v])=>`${esc(TERM[x][1])} ${ton(v)}`).join(" · ")}</span>`:""}`;
    return `<tr${t<0?' class="tg"':""}><td class="l">${ad0}</td>${o.c.map((v,k)=>vis[k]?`<td>${cell(v)}</td>`:"").join("")}<td><b>${ton(tot)}</b></td><td>${pct(T?tot/T:0)}</td>${tum?`<td class="l"><span class="muted">${ith}</span></td>`:""}</tr>`}).join("");
  const foot=rows.length?`<tr class="grp"><td class="l"><b>Toplam</b></td>${colT.map((v,k)=>vis[k]?`<td><b>${ton(v)}</b></td>`:"").join("")}<td><b>${ton(T)}</b></td><td>%100,0</td>${tum?"<td></td>":""}</tr>`:"";
  document.getElementById("t-ith").innerHTML=`<thead>${head}</thead><tbody>${body?body+foot:`<tr><td colspan="10" class="empty">Bu şirketin modelde ithalatı yok.</td></tr>`}</tbody>`;
  document.getElementById("h-ith").textContent=tum?"İthalat – tüm şirketler":`İthalat – ${SIR[S.sid][1]}`;
  document.getElementById("s-ith").textContent=rows.length?`${rows.filter(r=>r.t>=0).length} terminal${rows.some(r=>r.t<0)?" + havalimanı depoları":""} · ${ton(T)}`:"";
  // KPI: ürün toplamları + EPDK bildirimi (petrol ürünleri, sepet kalemi 1 = ithalat)
  // EPDK karşılaştırması: ithalat (kalem 1); TFS için yabancıya ihrakiye (kalem 3) de antrepo ithalatı sayılır (kullanıcı 09.10.2026 19:38)
  const IHR_ITH=new Set(SIR.map((x,i)=>x[0]==="S126"?i:-1).filter(i=>i>=0));
  let ep=0, eih=0; for(const r of SEP) if(tum||r[0]===S.sid){ if(r[2]===1) ep+=r[3]; else if(r[2]===3&&IHR_ITH.has(r[0])) eih+=r[3]; }
  ep+=eih;
  const pet=T-colT[ITH_SUT.length];
  const ITH_RK=["a0","a1","a3","a4","a2","a6","L"];
  document.getElementById("k-ith").innerHTML=`<div class="kg">`+kompKart("Ürün dağılımı",ad.map((l,k)=>({l,v:vis[k]?colT[k]:0,c:URENK[ITH_RK[k]][2]})),{buyuk:ton(T),alt:"modelde terminale yerleşen ithalat",span:ep>0.5?7:12})
    +(ep>0.5?`<div class="kc" style="--sp:5"><div class="kc-h"><span>EPDK ithalat bildirimi${eih>0.5?" + TFS ihrakiye":""}</span><span class="rz-chip nt">${pct(pet/ep)} terminale yerleşti</span></div><div class="kc-big"><b>${ton(ep)}</b><span>petrol ürünleri${eih>0.5?` (ithalat ${ton(ep-eih)} + yabancıya ihrakiye ${ton(eih)})`:""}</span></div>`
      +`<div class="kc-sl"><div class="kc-s"><span>EPDK bildirimi</span><span class="kc-bar"><i style="width:100%;background:var(--ink-3)"></i></span><b>${ton(ep)}</b></div><div class="kc-s"><span>Modelde terminale yerleşen</span><span class="kc-bar"><i style="width:${Math.min(100,pet/ep*100).toFixed(1)}%;background:var(--accent)"></i></span><b>${ton(pet)}</b></div></div>`
      +`<p class="kc-not">Fark ${ton(Math.abs(ep-pet))}: modelde terminale yerleşmeyen ya da başka kaleme giden ithalat.</p></div>`:"")+`</div>`;
}

/* ---------- Takas (kullanıcı 11.10.2026: PDM takası yeniden kurunca yeni sayfa) ---------- */
function tkSatir(f){ return isTk(f)&&(S.sid<0||f[11]===S.sid)&&(S.alc<0||f[0]===S.alc)&&(S.term==null||f[1]===S.term)&&(S.il==null||f[2]===S.il)&&(S.urun==="tum"||(S.urun[0]==="a"&&f[3]===+S.urun.slice(1))); }
function takasOklari(){
  gK.replaceChildren(); if(!TKS()||(S.urun!=="tum"&&S.urun!=="a1")) return;
  const m=new Map();
  for(const r of TKD){ if(S.sid>=0&&r[0]!==S.sid) continue; if(S.alc>=0&&r[2]!==S.alc) continue; if(S.term!=null&&r[3]!==S.term) continue; if(S.il!=null&&r[4]!==S.il) continue;
    const k=r[1]+"|"+r[3]; m.set(k,(m.get(k)||0)+r[6]); }
  const rows=[...m].filter(([,v])=>v>=500).sort((a,b)=>b[1]-a[1]); if(!rows.length) return;
  const mx=rows[0][1]; let ciz=0;
  for(const [k,v] of rows.reverse()){ const [g,a]=k.split("|").map(Number); const hg=TERM[g][2], ha=TERM[a][2];
    const [x1,y1]=pj(HUB[hg].lat,HUB[hg].lon), [x2,y2]=pj(HUB[ha].lat,HUB[ha].lon), d=Math.hypot(x2-x1,y2-y1); if(d<4) continue;
    const mx2=(x1+x2)/2-(y2-y1)*0.18, my2=(y1+y2)/2+(x2-x1)*0.18, w=1.2+8*Math.sqrt(v/mx);
    const e=document.createElementNS(NS,"path"); e.setAttribute("d",`M${x1.toFixed(1)},${y1.toFixed(1)}Q${mx2.toFixed(1)},${my2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`);
    e.setAttribute("class","arc"); e.setAttribute("stroke-width",w.toFixed(1));
    const t=document.createElementNS(NS,"title"); t.textContent=`${TERM[g][1]} → ${TERM[a][1]}: ithal motorin ${ton(v)}`; e.appendChild(t); gK.appendChild(e);
    ciz++; const h=document.createElementNS(NS,"circle"); h.setAttribute("cx",x2.toFixed(1)); h.setAttribute("cy",y2.toFixed(1)); h.setAttribute("r",(w/2+1.5).toFixed(1)); h.setAttribute("fill","#7A3E9D"); h.setAttribute("fill-opacity",".75"); gK.appendChild(h); }
  if(ciz) document.getElementById("legend").insertAdjacentHTML("beforeend",`<span><svg width="26" height="10" aria-hidden="true"><path d="M2,8Q13,0 24,8" stroke="#7A3E9D" stroke-opacity=".6" stroke-width="3" fill="none"/></svg> ithal motorin: giriş terminali → alıcının terminali (kalınlık = ton)</span>`);
}
function takas(){
  const tum=S.sid<0, G=new Map();
  const grp=(m,k,mk)=>m.get(k)||m.set(k,mk()).get(k), yeni=()=>({b:0,m:0,i:0,km:0,il:new Set(),alt:new Map(),gr:new Map(),tur:new Set()});
  const TUR=[0,0,0,0]; const ekle=(o,f,gi)=>{ o.tur.add(tkTur(f)); if(f[3]===0) o.b+=f[6]; else o.m+=f[6]; o.i+=f[10]||0; o.km+=f[6]*f[7]; o.il.add(f[2]); if(gi!=null&&(f[10]||0)>0) o.gr.set(gi,(o.gr.get(gi)||0)+f[10]); };
  const GIR=new Map(), SAT=new Set(), ALC=new Set();
  for(const f of AF){ if(!tkSatir(f)) continue;
    const gi=tkTur(f)===1?f[1]:null;
    const s=grp(G,f[11],yeni), a=grp(s.alt,f[0],yeni), t=grp(a.alt,f[1],yeni);
    for(const o of [s,a,t]) ekle(o,f,gi); TUR[tkTur(f)]+=f[6];
    SAT.add(f[11]); ALC.add(f[0]); if(gi!=null&&(f[10]||0)>0) GIR.set(gi,(GIR.get(gi)||0)+f[10]); }
  const top=o=>o.b+o.m, srt=m=>[...m].sort((x,y)=>top(y[1])-top(x[1]));
  const TB=[...G.values()].reduce((a,o)=>a+o.b,0), TM=[...G.values()].reduce((a,o)=>a+o.m,0), TI=[...G.values()].reduce((a,o)=>a+o.i,0), TT=TB+TM;
  const showB=TB>=0.5, showM=TM>=0.5;
  const km=o=>top(o)>0.5?nf.format(o.km/top(o)):"–";
  const girs=o=>[...o.gr].sort((a,b)=>b[1]-a[1]).map(([g,v])=>esc(TERM[g][1])+(o.gr.size>1?" "+ton(v):"")).join(" · ");
  const turAd=o=>[[1,"bayi yönlendirmesi"],[3,"ürün değişimi"],[2,"rafineri tahsisinden"]].filter(([k])=>o.tur.has(k)).map(([,t])=>t).join(" + ");
  const vals=o=>`${showB?`<td>${cell(o.b)}</td>`:""}${showM?`<td>${cell(o.m)}</td><td class="muted">${cell(o.i)}</td>`:""}<td><b>${ton(top(o))}</b></td><td>${pct(TT?top(o)/TT:0)}</td><td>${o.il.size}</td><td>${km(o)}</td>`;
  const head=`<tr><th class="l">Satıcı → alıcı → yükleme terminali</th>${showB?"<th>Benzin</th>":""}${showM?"<th>Motorin</th><th>İthal</th>":""}<th>Toplam</th><th>Pay</th><th>İl</th><th>km</th></tr>`;
  const out=[];
  for(const [sid,s] of srt(G)){
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(SIR[sid][1])}</b> <span class="muted">· satıcı · ${s.alt.size} alıcı${s.gr.size?" · giriş: "+girs(s):""}</span></td>${vals(s)}</tr>`);
    for(const [aid,a] of srt(s.alt)){
      out.push(`<tr class="sub"><td class="l ind"><b>${esc(SIR[aid][1])}</b> <span class="muted">· alıcı · ${a.alt.size} terminal</span></td>${vals(a)}</tr>`);
      if(a.alt.size>1||S.alc>=0||S.sid>=0) for(const [t,o] of srt(a.alt)) out.push(`<tr class="sub" tabindex="0" data-term="${t}"><td class="l ind2">${(esc(TERM[t][1])+LIS(t,0))} <span class="muted">· ${esc(HUB[TERM[t][2]].ad)} · ${turAd(o)}</span></td>${vals(o)}</tr>`);
      else { const [t,o]=[...a.alt][0]; out[out.length-1]=out[out.length-1].replace("· alıcı · 1 terminal",`· alıcı · ${(esc(TERM[t][1])+LIS(t,0))} · ${turAd(o)}`); }
    }
  }
  if(G.size) out.push(`<tr class="grp tg"><td class="l"><b>Toplam</b></td>${showB?`<td><b>${ton(TB)}</b></td>`:""}${showM?`<td><b>${ton(TM)}</b></td><td><b>${ton(TI)}</b></td>`:""}<td><b>${ton(TT)}</b></td><td>%100</td><td></td><td></td></tr>`);
  document.getElementById("t-tks").innerHTML=`<thead>${head}</thead><tbody>${out.length?out.join(""):'<tr><td colspan="8" class="empty">Bu filtrelerle takas yok.</td></tr>'}</tbody>`;
  document.getElementById("h-tks").textContent=tum&&S.alc<0?"Takas – tüm satıcılar":[S.sid>=0?SIR[S.sid][1]+" (satıcı)":null,S.alc>=0?SIR[S.alc][1]+" (alıcı)":null].filter(Boolean).join(" → ")+" – takas";
  document.getElementById("s-tks").textContent=G.size?`${SAT.size} satıcı · ${ALC.size} alıcı · ${ton(TT)}`:"";
  const gl=[...GIR].sort((a,b)=>b[1]-a[1]);
  document.getElementById("k-tks").innerHTML=`<div class="kg">`+kompKart("Takas türü",[{l:"Bayi yönlendirmesi",v:TUR[1],c:"#0F6E8C",s:"satıcının giriş terminalinden yükleme"},{l:"Ürün değişimi",v:TUR[3],c:"#7553B5",s:"rafineri alıcısıyla takas"},{l:"Rafineri tahsisinden alım",v:TUR[2],c:"#8A6238",s:"satıcının tahsisi, rafineriden alıcının terminaline"}],{buyuk:ton(TT),alt:`${SAT.size} satıcı · ${ALC.size} alıcı`,span:gl.length?4:6})
    +kompKart("Ürün",[{l:"Benzin",v:showB?TB:0,c:URENK.a0[2],s:"satıcının rafineri benzini"},{l:"Motorin · ithal",v:showM?TI:0,c:URENK.a1[2],s:"IM/EX ithal motorin"},{l:"Motorin · yerli",v:showM?TM-TI:0,c:URENK.a1[1],s:"rafineri motorini"}],{T:TT,span:gl.length?4:6})
    +(gl.length?siraKart("Yönlendirilen giriş terminalleri",gl.map(([g,v])=>[TERM[g][1],v]),{sag:"ithal motorin",c:"#7A3E9D",span:4}):"")+`</div>`;
}

/* ---------- Rafineriler (kullanıcı 13.10.2026 14:43: hangi rafineri kime ne kadar ürün satıyor) ---------- */
const RAFP=()=>S.sayfa==="rafineri";
const fR=document.getElementById("f-raf");
const RAF_AD=(()=>{const m=new Map(); for(const r of (TD.th||[])) if(r[2]===1){const a=TD.sat[r[1]]; m.set(a,(m.get(a)||0)+r[6]);} return [...m].sort((a,b)=>b[1]-a[1]);})();
// Mod KPI'si taşıma moduna göre: takas öneki ve 'Rafineri tahsisinden alım (…)' sarmalı ayrılır (db_83: 49 Leg1 etiketi)
const modBaz=x=>{ x=String(x??"?"); for(let i=0;i<3;i++){ const m=x.match(/^Rafineri tahsisinden alım \((.*)\)$/); if(m) x=m[1]; x=x.replace(/^[^;]*takası\); */,""); } return x; };
// ülke dengesi KPI'ları (kullanıcı 21.10.2026 18:54: rafineriler sayfalarına üretim, ithalat, ihracat, yurt içi satış)
const ubalK=(L)=>L.map(([a,v,alt])=>`<div class="kpi"><span>${a}</span><b>${ton(v)}</b><span>${alt}</span></div>`).join("");
const UBAL_A=()=>{ const ug=id=>(D.ug||[]).find(r=>r[0]===id)||[], b=ug("UG1"), m=ug("UG2"), ru=D.rur||[0,0], f=(x,y)=>`benzin ${kisa(x||0)} · motorin ${kisa(y||0)}`;
  return ubalK([[`Üretim · ${YIL}`,(ru[0]||0)+(ru[1]||0),f(ru[0],ru[1])+" · rafineri"],[`İthalat · ${YIL}`,(b[7]||0)+(m[7]||0),f(b[7],m[7])],[`İhracat · ${YIL}`,(b[8]||0)+(m[8]||0),f(b[8],m[8])],[`Yurt içi satış · ${YIL}`,(b[3]||0)+(m[3]||0),f(b[3],m[3])]]); };
function rafineriler(){
  const sec=S.raf||"", tum=S.sid<0;
  document.getElementById("u-raf").innerHTML=UBAL_A();
  fR.innerHTML='<option value="">Tüm rafineriler</option>'+RAF_AD.map(([a,v])=>`<option value="${esc(a)}">${esc(a)} · ${ton(v)}</option>`).join(""); fR.value=sec;
  const G=new Map(), RT=new Map(), MDT=new Map(), KU=[[0,0],[0,0]]; let TB=0,TM=0,TT=0;
  for(const r of (TD.th||[])){ if(r[2]!==1) continue; const ad=TD.sat[r[1]]; if(sec&&ad!==sec) continue; if(!tum&&r[0]!==S.sid) continue;
    const g=G.get(r[0])||G.set(r[0],{a:r[0],u:[0,0],tt:0,ku:[[0,0],[0,0]],ch:new Map(),raf:new Set()}).get(r[0]);
    g.u[r[4]]+=r[6]; if(r[5]) g.tt+=r[6]; g.ku[r[5]?1:0][r[4]]+=r[6]; g.raf.add(ad);
    const k=(sec?"":ad)+"|"+r[3]; const c=g.ch.get(k)||g.ch.set(k,{ad,t:r[3],u:[0,0],tt:0,ku:[[0,0],[0,0]],md:new Map()}).get(k);
    c.u[r[4]]+=r[6]; if(r[5]) c.tt+=r[6]; c.ku[r[5]?1:0][r[4]]+=r[6]; KU[r[5]?1:0][r[4]]+=r[6]; c.md.set(r[9],(c.md.get(r[9])||0)+r[6]);
    { const mk=modBaz(TD.mod[r[9]]); const o=MDT.get(mk)||MDT.set(mk,[0,0]).get(mk); o[r[4]]+=r[6]; }   // mod × ürün (kullanıcı 13.10.2026 14:46)
    RT.set(ad,(RT.get(ad)||0)+r[6]); if(r[4]===0) TB+=r[6]; else TM+=r[6]; if(r[5]) TT+=r[6]; }
  const T=TB+TM, grs=[...G.values()].sort((x,y)=>(y.u[0]+y.u[1])-(x.u[0]+x.u[1]));
  const kosAd=ad=>ad.startsWith("Tüpraş")?"Tüpraş":ad;
  const kos=(a,ads)=>{const ks=(TD.kos[a]||[]).filter(r=>r[1]===1&&[...ads].some(x=>kosAd(x)===r[0])); return ks.length?ks.map(r=>`${r[0]==="Star Rafineri"?"Star":r[0]} k${r[3]} · %${nf2.format((r[4]||0)*100)}`).join("<br>"):'<span class="z">–</span>';};
  const modAd=m=>{const x=String(TD.mod[m]??""); return x;};
  const mods=md=>{const a=[...md].filter(([,x])=>x>=0.5).sort((p,q)=>q[1]-p[1]); return a.map(([m])=>esc(modAd(m))).join(" · ")||"–";};
  document.getElementById("h-raf").textContent=(sec||"Tüm rafineriler")+(tum?" – alıcılar":` – ${SIR[S.sid][1]}`);
  document.getElementById("s-raf").textContent=grs.length?`${grs.length} alıcı · ${ton(T)}`:"";
  // Özet bloğu yeniden tasarım (kullanıcı 17.10.2026: "buradaki gösterim çok zayıf"): özet + rafineri payı + mod + EPDK kartları
  const BZ=URENK.a0[2], MT=URENK.a1[2], BZa=URENK.a0[1], MTa=URENK.a1[1];
  const seg=(v,c,t)=>v>0.5?`<i style="flex:${v.toFixed(1)} 1 0;background:${c}" title="${t}: ${ton(v)}"></i>`:"";
  const lg=(c,t,v)=>`<span class="rz-lg"><i style="background:${c}"></i>${t}<b>${cell(v)}</b></span>`;
  let k=`<div class="rz">`;
  k+=`<div class="rz-c rz-oz"><div class="rz-h">Rafineri satışı${sec?` · ${esc(sec)}`:""}</div><div class="rz-big"><b>${ton(T)}</b><span>${grs.length} alıcı · benzin ${pct(T?TB/T:0)} · motorin ${pct(T?TM/T:0)}</span></div>`
    +`<div class="rz-st" role="img" aria-label="Kendi tüketimi ${ton(KU[0][0]+KU[0][1])}, toptan satış alımları ${ton(KU[1][0]+KU[1][1])}">${seg(KU[0][0],BZ,"Kendi · benzin")}${seg(KU[0][1],MT,"Kendi · motorin")}${seg(KU[1][0],BZa,"Toptan · benzin")}${seg(KU[1][1],MTa,"Toptan · motorin")}</div>`
    +`<div class="rz-two">`+[["Kendi tüketimi","bayi ve serbest satış için",0],["Toptan satış alımları","başka dağıtıcıya satış için",1]].map(([t,d,i])=>{const v=KU[i][0]+KU[i][1];
      return `<div class="rz-ku${i?" tp":""}"><span class="rz-kt">${t}</span><b>${ton(v)}<em>${pct(T?v/T:0)}</em></b><span class="rz-d">${d}</span>${lg(i?BZa:BZ,"Benzin",KU[i][0])}${lg(i?MTa:MT,"Motorin",KU[i][1])}</div>`;}).join("")+`</div></div>`;
  { const R=[...RT].filter(x=>x[1]>=0.5).sort((a,b)=>b[1]-a[1]), RM=R.length?R[0][1]:1;
    k+=`<div class="rz-c rz-rf"><div class="rz-h">Rafineriler<span>${sec?"seçili rafineri":"seçmek için tıklayın"}</span></div>`
      +(sec?`<div class="rz-sel">${ikonHTML(["rafineri"])}<div><b>${esc(sec)}</b><span>${ton(T)}${(()=>{const v=(RAF_AD.find(x=>x[0]===sec)||[])[1], A=RAF_AD.reduce((q,x)=>q+x[1],0);return v&&A?` · tüm rafineri satışının ${pct(v/A)}`:"";})()}</span></div></div><button type="button" class="rz-tum" data-raf="">Tüm rafinerileri göster</button>`
        :R.map(([a,v])=>`<button type="button" class="rz-rr" data-raf="${esc(a)}"><span class="rz-n">${esc(a)}</span><span class="rz-bar"><span style="width:${(v/RM*100).toFixed(1)}%;background:var(--accent)"></span></span><b>${ton(v)}</b><em>${pct(T?v/T:0)}</em></button>`).join("")||'<span class="muted">Satış yok.</span>')+`</div>`; }
  { const MR=[...MDT].map(([m,v])=>[m,v,v[0]+v[1]]).filter(x=>x[2]>=0.5).sort((a,b)=>b[2]-a[2]), MX=MR.length?MR[0][2]:1;
    k+=`<div class="rz-c rz-md"><div class="rz-h">Taşıma modu<span class="rz-key"><i style="background:${BZ}"></i>Benzin<i style="background:${MT}"></i>Motorin</span></div>`
      +(MR.map(([m,v,t])=>`<div class="rz-r" style="--mc:${modRenk(m)}">${ikonHTML(modIkon(m))}<span class="rz-n">${esc(m)}<small>${[v[0]>0.5?`benzin ${ton(v[0])}`:"",v[1]>0.5?`motorin ${ton(v[1])}`:""].filter(Boolean).join(" · ")}</small></span><b>${ton(t)}</b><em>${pct(T?t/T:0)}</em><span class="rz-bar"><span style="width:${(t/MX*100).toFixed(1)}%">${seg(v[0],BZ,"Benzin")}${seg(v[1],MT,"Motorin")}</span></span></div>`).join("")||'<span class="muted">Satış yok.</span>')+`</div>`; }
  // EPDK karşılaştırması: akış – bu tablo – EPDK Tablo 4.1 serbest dolaşım (kullanıcı 13.10.2026 19:04; piyasa geneli, şirket filtresinden bağımsız)
  { const EG=sec?(sec.startsWith("Tüpraş")?"Tüpraş":sec):null, ER=(TD.ep||[]).filter(r=>(!EG||r[0]===EG)&&(r[2]+r[3]+r[4])>=0.5);
    if(ER.length){ const tol=x=>Math.max(0.5,x*0.005), EM=Math.max(...ER.map(r=>Math.max(r[4],r[6]??r[3])))||1, w=x=>(x/EM*100).toFixed(1);
      const nOK=ER.filter(([g,u,a,t,e,,c])=>{c=c??t; return c<=e+tol(e)&&Math.abs(a-t)<=tol(a);}).length;
      k+=`<div class="rz-c rz-ep"><div class="rz-h">EPDK karşılaştırması · piyasa geneli<span class="rz-chip ${nOK===ER.length?"ok":"uy"}">${nOK}/${ER.length} örtüşüyor</span></div>`
        +`<div class="rz-key2"><span><i class="f"></i>Ticari satış</span><span><i class="m"></i>EPDK Tablo 4.1 serbest dolaşım</span></div>`
        +ER.map(([g,u,a,t,e,,c])=>{ c=c??t; const ok=c<=e+tol(e)&&Math.abs(a-t)<=tol(a);
        const nt=[c>e+tol(e)?`ticari satış EPDK'yı aşıyor (+${ton((c-e)*1000)})`:"", Math.abs(a-t)>tol(a)?`akış ≠ tablo (${t>a?"+":"−"}${ton(Math.abs(t-a)*1000)})`:""].filter(Boolean).join(" · ");
        return `<div class="rz-e${ok?"":" uy"}"><span class="rz-n">${g==="Star Rafineri"?"Star":g} <span style="color:${u?MT:BZ}">${u?"motorin":"benzin"}</span></span><span class="rz-v"><b>${ton(c*1000)}</b> / ${ton(e*1000)}<em>${e?pct(c/e):""}</em></span><span class="rz-chip ${ok?"ok":"uy"}">${ok?"✓ örtüşüyor":"⚠ fark"}</span>`
          +`<span class="rz-bl" title="Ticari satış ${ton(c*1000)} · EPDK ${ton(e*1000)}"><span class="tr" style="width:${w(e)}%"></span><span class="fl" style="width:${w(c)}%"></span><span class="mk" style="left:${w(e)}%"></span></span>`
          +`<span class="rz-dt">Akış ${ton(a*1000)} · tablo ${ton(t*1000)}${ok?"":` · <strong>${nt}</strong>`}</span></div>`;}).join("")
        +`<p class="rz-not">Akış ve tablo fiziksel rafineriye göre (akış: FACT_AKARYAKIT_AKIS kaynak rafineri; tablo: tedarik tahsisi, rafineri satışı + kendi ithalatı karşılığı rafineriden yüklenen) ve birbirine eşit olmalı. Ticari: tahsisteki satıcı rafineri, EPDK ile karşılaştırılır. Kaynak: EPDK ${YIL} Petrol Piyasası Gelişim Raporu Tablo 4.1${YIL>2025?' (Oca–Ağu raporu + PDM Eyl–Ara tahmini)':''}, serbest dolaşım. Tolerans ±%0,5.</p></div>`; } }
  k+=`</div>`;
  document.getElementById("k-raf").innerHTML=k;
  const head=`<tr><th class="l">Alıcı / ${sec?"":"rafineri · "}yükleme terminali</th><th>Kendi<br>benzin</th><th>Kendi<br>motorin</th><th>Kendi<br>toplam</th><th>Toptan<br>benzin</th><th>Toptan<br>motorin</th><th>Toptan<br>toplam</th><th>Toplam</th><th>Pay</th><th class="l">Mod</th><th class="l">Kademe · ciro primi (motorin)</th></tr>`;
  const kt=x=>`<td>${cell(x.ku[0][0])}</td><td>${cell(x.ku[0][1])}</td><td>${cell(x.ku[0][0]+x.ku[0][1])}</td><td>${cell(x.ku[1][0])}</td><td>${cell(x.ku[1][1])}</td><td>${cell(x.ku[1][0]+x.ku[1][1])}</td>`;
  const out=[];
  for(const g of grs){ const v=g.u[0]+g.u[1];
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(SIR[g.a][1])}</b> <span class="muted">· ${TD.sin[g.a]||"E"} sınıfı · ${g.ch.size} kırılım</span></td>${kt(g)}<td><b>${ton(v)}</b></td><td>${pct(T?v/T:0)}</td><td></td><td class="l"><span class="muted">${kos(g.a,g.raf)}</span></td></tr>`);
    for(const c of [...g.ch.values()].sort((x,y)=>(y.u[0]+y.u[1])-(x.u[0]+x.u[1]))){ const w=c.u[0]+c.u[1]; if(w<0.5) continue;
      const tn=c.t<0?"Terminal belirtilmemiş":(esc(TERM[c.t][1])+LIS(c.t,0))+` <span class="muted">· ${esc(HUB[TERM[c.t][2]].ad)}</span>`;
      out.push(`<tr class="sub"><td class="l ind">${sec?"":`<span class="pill r">${esc(c.ad)}</span>`}${tn}</td>${kt(c)}<td>${ton(w)}</td><td>${pct(T?w/T:0)}</td><td class="l"><span class="muted">${mods(c.md)}</span></td><td></td></tr>`); } }
  if(grs.length) out.push(`<tr class="grp"><td class="l"><b>Toplam</b></td>${kt({ku:KU}).replace(/<td>/g,"<td><b>").replace(/<\/td>/g,"</b></td>")}<td><b>${ton(T)}</b></td><td>%100</td><td></td><td></td></tr>`);
  document.getElementById("t-raf").innerHTML=`<thead>${head}</thead><tbody>${out.length?out.join(""):'<tr><td colspan="11" class="empty">Bu seçimde rafineri satışı yok.</td></tr>'}</tbody>`;
}
fR.addEventListener("change",()=>{S.raf=fR.value||null; render()});
document.getElementById("f-tmus").addEventListener("change",e=>{S.tmus=+e.target.value; render()});
document.getElementById("k-raf").addEventListener("click",e=>{const c=e.target.closest("[data-raf]"); if(c){S.raf=c.dataset.raf||null; render();}});


/* ---------- Taşıma (kullanıcı 15.10.2026 15:29: filtre şirket + taşıma modu; tabloda ürünün taşındığı terminaller ve miktarlar) ---------- */
const TASP=()=>S.sayfa==="tasima";
const tasModD=x=>{ x=String(x??"?"); for(let i=0;i<3;i++){ const m=x.match(/^Rafineri tahsisinden alım \((.*)\)$/); if(m) x=m[1]; x=x.replace(/^[^;]*takası\); */,""); }
  if(x.startsWith("Terminal içi devir")) return "Terminal içi devir (taşıma yok)";
  if(x.startsWith("Stoktan satış")) return "Stoktan satış (açılış stoku)";
  if(x.startsWith("İthal ürün (kıyı terminalinden iç terminale")) return x.includes("demiryolu")?"İç terminale transfer (ithal ürün, demiryolu)":"İç terminale transfer (ithal ürün)";
  return x; };

/* Ana mod grupları (kullanıcı 15.10.2026 18:04: "modları toplu olarak göster, demiryolu, boru hattı, denizyolu").
   Bileşik etiketlerde uzun mesafe ayağı belirler: İzmit → Kırıkkale demiryolu + saha/boru hattı → Demiryolu. Ayrıntı tabloda kalır. */
const tasMod=x=>{ const m=tasModD(x);
  if(/Demiryolu|demiryolu/.test(m)) return "Demiryolu";
  if(/Deniz Yolu/.test(m)) return "Deniz Yolu";
  if(/Boru Hattı/.test(m)) return "Boru Hattı";
  if(/Karayolu/.test(m)) return "Karayolu";
  if(m.startsWith("Doğrudan")) return "Rafineri sahasından yükleme";
  if(m.startsWith("Rafineri transferi")) return "Rafineri transferi (komşu saha)";
  if(m.startsWith("İç terminale transfer")) return "İç terminale transfer (ithal ürün)";
  if(m.startsWith("İthalat (antrepo")) return "Antrepo tahliye (havacılık, T148)";
  return m; };
const fTM2=document.getElementById("f-tmod");
fTM2.addEventListener("change",()=>{S.tmod=fTM2.value; render()});
const fTUR=document.getElementById("f-tur"), TURAD=["Benzin","Motorin","Fuel Oil","Havacılık","Denizcilik","Gazyağı","Diğer"];
/* Ürün filtresi çoklu seçim (kullanıcı 17.10.2026 18:13): boş = tüm ürünler */
const msB=document.getElementById("ms-b"), msP=document.getElementById("ms-p");
const msAc=ac=>{ msP.hidden=!ac; msB.setAttribute("aria-expanded",String(ac)); if(ac){ const c=msP.querySelector("input"); if(c) c.focus(); } };
msB.addEventListener("click",()=>msAc(msP.hidden));
msP.addEventListener("change",e=>{ const x=e.target; if(!x.matches("input")) return; const v=+x.value;
  if(v<0) S.tur=[]; else { const t=new Set(S.tur); x.checked?t.add(v):t.delete(v); S.tur=[...t].sort((a,b)=>a-b); }
  render(); const f=msP.querySelector(`input[value="${v}"]`); if(f) f.focus(); });
document.addEventListener("click",e=>{ if(!msP.hidden&&!fTUR.contains(e.target)) msAc(false); });
fTUR.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!msP.hidden){ msAc(false); msB.focus(); } });
// Taşımayı yapan (kullanıcı 15.10.2026 15:59): rafineriden deniz ve demiryolu taşımalarını tahsisler dahilinde rafineri (Tüpraş / Star) planlar ve yapar
const fTASY=document.getElementById("f-tasy");
fTASY.addEventListener("change",()=>{S.tasy=fTASY.value; render()});
// db_101: Leg1 taşıyan DB alanından (FACT.Leg1_Tasiyan_Tipi / _Sirket_ID → af[12], af[13]); alan yoksa türetilmiş kural
const TTY=D.tty||[];
const rafBoru=f=>{ const K=KAY[f[4]]; return String(K[2]||"")==="Rafineri"&&/Boru Hattı/.test(tasModD(MOD[f[5]])) ? (String(K[1]).startsWith("Star")?"Star (rafineri)":"Tüpraş (rafineri)") : null; };   /* kullanıcı 15.10.2026 17:50: rafineriden boru hattı taşımaları da rafineriye – DB alanı güncellenene kadar panelde */
const tasiyan=f=>{ /* db_102: boru hattı da DB alanında rafineride; panel kuralı (rafBoru) yalnız alan yoksa */
  if(!(f.length>12&&TTY[f[12]]&&TTY[f[12]]!=="?")){ const rb=rafBoru(f); if(rb) return rb; }
  if(f.length>12&&TTY[f[12]]&&TTY[f[12]]!=="?"){ const t=TTY[f[12]];
    if(t==="Rafineri"){ const n=f[13]>=0?String(SIR[f[13]][1]):String(KAY[f[4]][1]||""); /* Star (S177) şirket listesinde yok: kaynak adı */ return n.startsWith("Star")?"Star (rafineri)":"Tüpraş (rafineri)"; }
    return t==="Yok"?"Taşıma yok":t; }
  const m=tasModD(MOD[f[5]]), K=KAY[f[4]], ky=String(K[2]||"");
  if(m.startsWith("Terminal içi devir")||m.startsWith("Stoktan")) return "Taşıma yok";
  if(ky==="Rafineri"&&(/Deniz Yolu|Demiryolu|Boru Hattı/.test(m)&&!m.includes("(ithalat)")||m.startsWith("Rafineri transferi"))) return String(K[1]).startsWith("Star")?"Star (rafineri)":"Tüpraş (rafineri)";
  if(ky.startsWith("Dağıtıcı")||/ithal|İthal/.test(m)) return "İthalatçı";
  return "Dağıtıcı"; };
const TASY_SIRA=["Tüpraş (rafineri)","Star (rafineri)","Dağıtıcı","İthalatçı","Taşıma yok"];
document.getElementById("k-tas").addEventListener("click",e=>{const b=e.target.closest("[data-tmod]"); if(b){S.tmod=S.tmod===b.dataset.tmod?"":b.dataset.tmod; render();}});
document.getElementById("y-tas").addEventListener("click",e=>{const b=e.target.closest("[data-tasy]"); if(b){S.tasy=S.tasy===b.dataset.tasy?"":b.dataset.tasy; render();}});

/* Taşıma modu piktogramları (kullanıcı 15.10.2026 17:46) – 24×24, çizgi, currentColor */
const IKON={
 gemi:'<path d="M3 15h18l-2.6 4.4H5.6z"/><path d="M6 15v-2.6h8.5V15"/><path d="M14.5 15V9h3.2l1.3 6"/><path d="M8 12.4V10.8h4.5v1.6"/><path d="M2 21.5c1.3 0 1.7-.8 3-.8s1.7.8 3 .8 1.7-.8 3-.8 1.7.8 3 .8 1.7-.8 3-.8 1.7.8 3 .8"/>',
 gemi_ithal:'<path d="M3 15h18l-2.6 4.4H5.6z"/><path d="M8 15v-2.6h8.5V15"/><path d="M16.5 15V10h2.5l1 5"/><circle cx="6" cy="7" r="3.2"/><path d="M2.8 7h6.4M6 3.8c1.1 1.1 1.1 5.3 0 6.4M6 3.8c-1.1 1.1-1.1 5.3 0 6.4"/><path d="M2 21.5c1.3 0 1.7-.8 3-.8s1.7.8 3 .8 1.7-.8 3-.8 1.7.8 3 .8 1.7-.8 3-.8 1.7.8 3 .8"/>',
 tren:'<rect x="3" y="7" width="18" height="8" rx="4"/><path d="M12 7v-2M3 15.5h18"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/><path d="M2 21h20"/>',
 boru:'<path d="M2 9.5h20M2 14.5h20"/><path d="M7 7.5v9M9 7.5v9M15 7.5v9M17 7.5v9"/><path d="M12 17.5c0 1.4-1 2.2-1 3a1 1 0 0 0 2 0c0-.8-1-1.6-1-3z"/>',
 tir:'<rect x="2" y="8" width="12" height="7" rx="3.3"/><path d="M14 10h3.6l3.4 3.4V16h-7z"/><path d="M2 16h19"/><circle cx="6" cy="17.6" r="1.7"/><circle cx="17.5" cy="17.6" r="1.7"/>',
 rafineri:'<path d="M5 20V8h3v12M10.5 20V4h3v16"/><path d="M15.5 20v-6.5c0-1 1-1.8 2.5-1.8s2.5.8 2.5 1.8V20"/><path d="M3 20h18"/><path d="M12 4V2.5"/>',
 devir:'<path d="M4 9h14.5l-3.2-3.2"/><path d="M20 15H5.5l3.2 3.2"/>',
 tank:'<path d="M4 8c0-1.7 3.6-3 8-3s8 1.3 8 3v9c0 1.7-3.6 3-8 3s-8-1.3-8-3z"/><path d="M4 8c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
 transfer:'<path d="M3 7.5c0-.8 1.3-1.5 3-1.5s3 .7 3 1.5v8c0 .8-1.3 1.5-3 1.5s-3-.7-3-1.5z"/><path d="M15 7.5c0-.8 1.3-1.5 3-1.5s3 .7 3 1.5v8c0 .8-1.3 1.5-3 1.5s-3-.7-3-1.5z"/><path d="M9.8 11.5h4.4l-1.6-1.6M14.2 11.5l-1.6 1.6"/>',
 antrepo:'<path d="M3 10l9-6 9 6v10H3z"/><path d="M8 20v-6h8v6M8 17h8"/>'
};
const modIkon=m=>{ m=String(m);
  if(m.startsWith("Terminal içi")) return ["devir"];
  if(m.startsWith("Stoktan")) return ["tank"];
  if(m.startsWith("İç terminale")) return m.includes("demiryolu")?["transfer","tren"]:["transfer"];
  if(m.startsWith("İthal ürün (kıyı")) return ["transfer"];
  if(m.startsWith("İthalat (antrepo")||m.startsWith("Antrepo")) return ["antrepo"];
  if(m.startsWith("Rafineri transferi")) return ["rafineri","transfer"];
  const a=[]; if(/Deniz Yolu/.test(m)) a.push(m.includes("ithalat")?"gemi_ithal":"gemi"); if(/Demiryolu/.test(m)) a.push("tren"); if(/Boru Hattı/.test(m)) a.push("boru"); if(/Karayolu/.test(m)) a.push("tir"); if(/Doğrudan|sahasından/.test(m)) a.push("rafineri");
  return a.length?a:["tank"]; };
const modRenk=m=>{ m=String(m); return m.startsWith("Terminal içi")||m.startsWith("Stoktan")?"#6F7E89":/ithalat|İthal|İç terminale/.test(m)?"#2A5591":/Demiryolu/.test(m)?"#7553B5":/Deniz Yolu/.test(m)?"#1F6FB2":/Boru Hattı/.test(m)?"#0F7A6B":/Karayolu/.test(m)?"#C8641C":/Doğrudan|sahasından/.test(m)?"#8A6238":/Antrepo/.test(m)?"#2A5591":"#5E7384"; };
const ikonHTML=ks=>`<span class="ikon${ks.length>1?" iki":""}" aria-hidden="true">${ks.map(k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${IKON[k]||IKON.tank}</svg>`).join("")}</span>`;
function tasima(){
  const tum=S.sid<0, P=u=>u===0?0:u===1?1:2, co=f=>tum||f[0]===S.sid||(f.length>13&&f[13]===S.sid);   /* şirket = ürün sahibi ya da taşıyan (kullanıcı 15.10.2026 17:38: Tüpraş seçilince taşıdığı ürün) */
  // Ürün filtresi (kullanıcı 15.10.2026 15:38): seçenekler seçili şirketin ürünleri
  const UT=new Map(); for(const f of AF) if(co(f)) UT.set(f[3],(UT.get(f[3])||0)+f[6]);
  S.tur=S.tur.filter(u=>UT.get(u)>=0.5);
  { const TR=[...UT].filter(([,v])=>v>=0.5).sort((a,b)=>a[0]-b[0]), sec=new Set(S.tur);
    msP.innerHTML=`<label class="ms-o tum"><input type="checkbox" value="-1"${sec.size?"":" checked"}><span>Tüm ürünler</span><em>${ton(TR.reduce((a,x)=>a+x[1],0))}</em></label>`
      +TR.map(([u,v])=>`<label class="ms-o"><input type="checkbox" value="${u}"${sec.has(u)?" checked":""}><i style="background:${(URENK["a"+[0,1,2,3,4,5,6][u]]||URENK.tum)[2]}"></i><span>${TURAD[u]||"?"}</span><em>${ton(v)}</em></label>`).join("");
    document.getElementById("ms-v").textContent=!sec.size?"Tüm ürünler":sec.size<=2?S.tur.map(u=>TURAD[u]).join(", "):`${sec.size} ürün seçili`; }
  const TURS=new Set(S.tur), own0=f=>co(f)&&(!TURS.size||TURS.has(f[3])), tek=TURS.size===1, turAd=S.tur.map(u=>TURAD[u]).join(" + ");
  const TY=new Map(); for(const f of AF) if(own0(f)) TY.set(tasiyan(f),(TY.get(tasiyan(f))||0)+f[6]);
  if(S.tasy&&!TY.has(S.tasy)) S.tasy="";
  fTASY.innerHTML='<option value="">Tümü</option>'+TASY_SIRA.filter(x=>TY.get(x)>=0.5).map(x=>`<option value="${esc(x)}">${esc(x)} · ${ton(TY.get(x))}</option>`).join(""); fTASY.value=S.tasy;
  const own=f=>own0(f)&&(!S.tasy||tasiyan(f)===S.tasy);
  const MT=new Map(); let T=0;
  for(const f of AF){ if(!own(f)) continue; const m=tasMod(MOD[f[5]]); const o=MT.get(m)||MT.set(m,[0,0,0]).get(m); o[P(f[3])]+=f[6]; T+=f[6]; }
  if(S.tmod&&!MT.has(S.tmod)) S.tmod="";
  const ML=[...MT].map(([m,u])=>[m,u,u[0]+u[1]+u[2]]).filter(x=>x[2]>=0.5).sort((a,b)=>b[2]-a[2]);
  fTM2.innerHTML=`<option value="">Tüm modlar</option>`+ML.map(([m,,v])=>`<option value="${esc(m)}">${esc(m)} · ${ton(v)}</option>`).join(""); fTM2.value=S.tmod;
  const ad=tum?"Tüm şirketler":SIR[S.sid][1];
  document.getElementById("h-tas").textContent=`${ad} – taşıma`+(TURS.size?` · ${turAd}`:"")+(S.tmod?` · ${S.tmod}`:"")+(S.tasy?` · ${S.tasy}`:"");
  document.getElementById("s-tas").textContent=T>0.5?`${ML.length} mod · ${ton(T)}`:"";
  document.getElementById("l-tas").textContent="Ürünün kaynaktan (rafineri ya da ithalat) bayiye yüklendiği terminale hangi yolla geldiği. Rafineriden deniz yolu, demiryolu ve boru hattı taşımalarını tahsisler dahilinde rafineri (Tüpraş / Star) planlar ve yapar; karayolu ve sahadan yükleme dağıtıcının, ithal ürünün taşınması ithalatçının işidir.";
  // Taşımayı yapan özeti (filtreden bağımsız, şirket + ürün seçimine göre)
  const TYT=[...TY.values()].reduce((a,v)=>a+v,0);
  document.getElementById("y-tas").innerHTML=TASY_SIRA.filter(x=>TY.get(x)>=0.5).map(x=>{ const v=TY.get(x), r=TYT?v/TYT:0, ik=x.includes("rafineri")?["rafineri"]:x==="Dağıtıcı"?["tir"]:x==="İthalatçı"?["gemi_ithal"]:["devir"], mc=x.includes("rafineri")?"#0F6E8C":x==="Dağıtıcı"?"#C8641C":x==="İthalatçı"?"#2A5591":"#6F7E89";
    return `<button type="button" class="kpi tm ik" style="--mc:${mc}" data-tasy="${esc(x)}" aria-pressed="${S.tasy===x}">${ikonHTML(ik)}<span class="kt">${esc(x)}</span><b>${ton(v)}</b><span class="pb" aria-hidden="true"><i style="width:${(r*100).toFixed(1)}%"></i></span><span class="ks">${pct(r)} · ${x.includes("rafineri")?"rafineri planlar ve taşır":x==="Dağıtıcı"?"karayolu, sahadan yükleme":x==="İthalatçı"?"ithal ürünün taşınması":"aynı terminalde devir / stok"}</span></button>`; }).join("");
  const sel=S.tmod?MT.get(S.tmod):null, SV=sel?sel[0]+sel[1]+sel[2]:T;
  let k=`<div class="kpi ik tot" style="--mc:var(--ink)"><span class="ikon" aria-hidden="true"><span class="sig">Σ</span></span><span class="kt">${S.tmod?"Bu modla taşınan":"Toplam akış"}</span><b>${ton(SV)}</b><span class="ks">${S.tmod?pct(T?SV/T:0)+" · "+(tum?"":"şirketin ")+(TURS.size?turAd.toLocaleLowerCase("tr")+" akışının":"tüm akışının"):(TURS.size?turAd:"tüm ürünler")+" · "+ML.length+" mod"}</span></div>`;
  k+=ML.map(([m,u,v])=>{ const r=T?v/T:0, mc=modRenk(m); return `<button type="button" class="kpi tm ik" style="--mc:${mc}" data-tmod="${esc(m)}" aria-pressed="${S.tmod===m}">${ikonHTML(modIkon(m))}<span class="kt">${esc(m)}</span><b>${ton(v)}</b><span class="pb" aria-hidden="true"><i style="width:${(r*100).toFixed(1)}%"></i></span><span class="ks">${pct(r)}${tek?"":` · benzin ${cell(u[0])} · motorin ${cell(u[1])}${u[2]>0.5?" · diğer "+ton(u[2]):""}`}</span></button>`; }).join("");
  document.getElementById("k-tas").innerHTML=k;
  // Terminal → kaynak (× mod) kırılımı
  const G=new Map();
  for(const f of AF){ if(!own(f)) continue; const m=tasModD(MOD[f[5]]); if(S.tmod&&tasMod(MOD[f[5]])!==S.tmod) continue;
    const g=G.get(f[1])||G.set(f[1],{t:f[1],u:[0,0,0],v:0,il:new Set(),km:0,sr:new Map(),md:new Map()}).get(f[1]);
    const K=KAY[f[4]], kn=String(K[2]||"").startsWith("Dağıtıcı")?K[1]+" ithalatı":K[1], ty=tasiyan(f), tn=f.length>13&&f[13]>=0?SIR[f[13]][1]:"", sk=kn+"|"+m+"|"+ty+"|"+tn;
    const x=g.sr.get(sk)||g.sr.set(sk,{k:kn,m,ty,tn,u:[0,0,0],v:0,il:new Set(),sir:new Map()}).get(sk);
    g.u[P(f[3])]+=f[6]; g.v+=f[6]; g.il.add(f[2]); g.km+=(f[7]||0)*f[6]; g.md.set(m,(g.md.get(m)||0)+f[6]);
    x.u[P(f[3])]+=f[6]; x.v+=f[6]; x.il.add(f[2]); x.sir.set(f[0],(x.sir.get(f[0])||0)+f[6]); }
  const GL=[...G.values()].filter(g=>g.v>=0.5).sort((a,b)=>b.v-a.v), GT=GL.reduce((a,g)=>a+g.v,0), GU=[0,1,2].map(i=>GL.reduce((a,g)=>a+g.u[i],0));
  document.getElementById("s-tas2").textContent=GL.length?`${GL.length} terminal · ${ton(GT)}`:"";
  const pc=x=>tek?"":`<td>${cell(x[0])}</td><td>${cell(x[1])}</td><td>${cell(x[2])}</td>`;
  const head=`<tr><th class="l">Terminal / kaynak</th>${tek?"":"<th>Benzin</th><th>Motorin</th><th>Diğer</th>"}<th>${tek?esc(turAd):"Toplam"}</th><th>Pay</th><th>İl</th><th>Bayiye km</th><th class="l">Taşımayı yapan · ${S.tmod?"şirketler":"taşıma modu"}</th></tr>`;
  const out=[];
  for(const g of GL){ const ms=[...g.md].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]);
    out.push(`<tr class="grp tg"><td class="l"><b>${(esc(TERM[g.t][1])+LIS(g.t,0))}</b> <span class="muted">· ${esc(HUB[TERM[g.t][2]].ad)}</span></td>${pc(g.u)}<td><b>${ton(g.v)}</b></td><td>${pct(GT?g.v/GT:0)}</td><td>${g.il.size}</td><td>${nf.format(Math.round(g.km/g.v))}</td><td class="l"><span class="muted">${S.tmod?"":ms.slice(0,3).map(([m,v])=>esc(m)+(ms.length>1?" "+pct(v/g.v):"")).join(" · ")}</span></td></tr>`);
    for(const x of [...g.sr.values()].filter(x=>x.v>=0.5).sort((a,b)=>b.v-a.v)){
      const sr=[...x.sir].sort((a,b)=>b[1]-a[1]);
      out.push(`<tr class="sub"><td class="l ind">${esc(x.k)}</td>${pc(x.u)}<td>${ton(x.v)}</td><td>${pct(GT?x.v/GT:0)}</td><td>${x.il.size}</td><td></td><td class="l"><span class="pill${x.ty.includes("rafineri")?" r":x.ty==="İthalatçı"?" i":""}">${esc(x.ty)}${x.tn&&!x.ty.includes("rafineri")?" · "+esc(x.tn):""}</span><span class="muted">${S.tmod?(tum?sr.slice(0,3).map(([s,v])=>esc(SIR[s][1])+" "+ton(v)).join(" · ")+(sr.length>3?` · +${sr.length-3}`:""):""):esc(x.m)}</span></td></tr>`); } }
  if(GL.length) out.push(`<tr class="grp"><td class="l"><b>Toplam</b></td>${tek?"":`<td><b>${ton(GU[0])}</b></td><td><b>${ton(GU[1])}</b></td><td><b>${ton(GU[2])}</b></td>`}<td><b>${ton(GT)}</b></td><td>%100</td><td></td><td></td><td></td></tr>`);
  document.getElementById("t-tas").innerHTML=`<thead>${head}</thead><tbody>${out.length?out.join(""):'<tr><td colspan="${tek?6:9}" class="empty">Bu seçimde taşıma yok.</td></tr>'}</tbody>`;
}
/* ---------- Bayiler (kullanıcı 12.10.2026 14:41: filtre dağıtım şirketi; tablo il ve bayi sayıları; haritada görsel) ---------- */
const BAY=()=>S.sayfa==="bayi";
const BI=D.bi||[], BIT=new Map(), BIS=new Map();
for(const r of BI){ if(r[0]<0) BIT.set(r[1],r.slice(2)); else { const m=BIS.get(r[0])||BIS.set(r[0],new Map()).get(r[0]); m.set(r[1],r.slice(2)); } }
const BAY_BIN=[0.10,0.20];
let BAYH=new Map();
function bayiler(){
  gT.replaceChildren(); gK.replaceChildren(); urunRenk();
  const tum=S.sid<0, sel=tum?BIT:(BIS.get(S.sid)||new Map());
  BAYH=sel;
  const toplam=k=>[...sel.values()].reduce((a,v)=>a+v[k],0), ulke=[...BIT.values()].reduce((a,v)=>a+v[2],0);
  let bins=[];
  if(tum){ const v=[...BIT.values()].map(x=>x[2]).filter(x=>x>0).sort((a,b)=>a-b); bins=[1/3,2/3].map(q=>v[Math.floor(q*(v.length-1))]||0); }
  for(const [i,e] of ilYol){ const o=sel.get(i), T=BIT.get(i); let f="var(--c0)";
    if(o&&o[2]>0){ if(tum){ let k=1; for(const b of bins) if(o[2]>=b) k++; f=`var(--s${k})`; } else { const p=o[2]/(T?.[2]||1); let k=1; for(const b of BAY_BIN) if(p>=b) k++; f=`var(--s${k})`; } }
    e.setAttribute("fill",f); e.classList.toggle("sel",S.il===i); }
  const ad=tum?"tüm şirketler":SIR[S.sid][1], nIl=[...sel.values()].filter(v=>v[2]>0).length;
  document.getElementById("h-etki").textContent=tum?"Bayi istasyonları: il dağılımı":`${ad}: illerdeki bayi payı`;
  document.getElementById("e-lead").textContent=tum
    ?`Her il, bayi istasyonu sayısına göre renklendirildi (toplam ${nf.format(ulke)} istasyon, ${nIl} il). Bir dağıtım şirketi seçince harita, şirketin her ildeki istasyon payını gösterir.`
    :`Her il, ${ad} istasyonlarının ildeki tüm istasyonlara oranına göre renklendirildi. ${ad} ${nIl} ilde ${nf.format(toplam(2))} istasyonla temsil ediliyor; ülkedeki istasyonların ${pct(toplam(2)/(ulke||1))}'i.`;
  const L=document.getElementById("legend");
  L.innerHTML=tum?`<span><i style="background:var(--c0)"></i>yok</span>`+[0,1,2].map(k=>`<span><i style="background:var(--s${k+1})"></i>${k===0?nf.format(bins[0])+"'ten az":k===1?nf.format(bins[0])+"–"+nf.format(bins[1]):nf.format(bins[1])+" ve üzeri"}</span>`).join("")+`<span>· il başına istasyon</span>`
    :`<span><i style="background:var(--c0)"></i>yok</span>`+["%10'dan az","%10–20","%20 ve üzeri"].map((t,k)=>`<span><i style="background:var(--s${k+1})"></i>${t}</span>`).join("")+`<span>· ildeki istasyon payı</span>`;
  ilPanel(tum?"İl sıralaması":`${ad} · iller`,tum?"il başına bayi istasyonu":"şirketin istasyonu · ildeki payı",[...sel].map(([i,o])=>[i,o[2],tum?`akaryakıt ${nf.format(o[0])} · otogaz ${nf.format(o[1])}`:"ildeki istasyonların "+pct(o[2]/((BIT.get(i)||[0,0,1])[2]||1))]),x=>nf.format(x),null);
  // KPI
  { const I=toplam(2), A=toplam(0), O=toplam(1), iki=Math.max(0,A+O-I);
    const SK=new Map(); if(tum) for(const [sid,m] of BIS){ let n=0; for(const v of m.values()) n+=v[2]; if(n>0) SK.set(sid,n); }
    const SR=[...SK].sort((x,y)=>y[1]-x[1]), PAL=["#0F6E8C","#2F6FB5","#C8641C","#3E9A4A","#7553B5","#B08E14"];
    document.getElementById("k-bay").innerHTML=`<div class="kg">`+kompKart("Bayi istasyonları",[{l:"Yalnız akaryakıt",v:I-O,c:URENK.a1[2],s:"benzin / motorin"},{l:"Akaryakıt + otogaz",v:iki,c:"#0F6E8C",s:"iki lisans aynı istasyonda"},{l:"Yalnız otogaz",v:I-A,c:URENK.L[2],s:"LPG otogaz"}],{fmt:x=>nf.format(x),buyuk:nf.format(I),alt:tum?`${nIl} il · akaryakıt lisansı ${nf.format(A)} · otogaz lisansı ${nf.format(O)}`:`ülkenin ${pct(I/(ulke||1))}'i · ${nIl} il`,span:6})
      +(tum?siraKart("En çok istasyonu olan şirketler",SR.map(([sid,n])=>[SIR[sid][1],n]),{fmt:x=>nf.format(x),n:8,sag:`${SR.length} şirket`,span:6,not:"akaryakıt ve otogaz lisansı farklı şirketlerdeyse istasyon iki şirkette sayılır"})
        :kompKart("Ülke içindeki pay",[{l:ad,v:I,c:"#0F6E8C"},{l:"Diğer şirketler",v:Math.max(0,ulke-I),c:"#C9D3D8"}],{fmt:x=>nf.format(x),T:ulke,span:6}))+`</div>`; }
  // Tablo
  const enCok=i=>{const a=[]; for(const [sid,m] of BIS){const o=m.get(i); if(o&&o[2]>0) a.push([sid,o[2]]);} a.sort((p,q)=>q[1]-p[1]); return a.slice(0,3).map(([sid,n])=>`${esc(SIR[sid][1])} ${nf.format(n)}`).join(" · ");};
  const rows=[...sel].filter(([,o])=>o[2]>0).sort((a,b)=>b[1][2]-a[1][2]||IL.get(a[0]).localeCompare(IL.get(b[0]),"tr"));
  const n=v=>v>0?nf.format(v):'<span class="z">–</span>';
  const head=`<tr><th class="l">İl</th><th>Akaryakıt</th><th>Otogaz</th><th>İstasyon</th>${tum?'<th class="l">En çok istasyonu olan şirketler</th>':"<th>İldeki pay</th><th>İl toplamı</th>"}</tr>`;
  const body=rows.map(([i,o])=>{const T=BIT.get(i)||[0,0,0]; return `<tr tabindex="0" data-il="${i}" class="${S.il===i?"on":""}"><td class="l">${esc(IL.get(i))}</td><td>${n(o[0])}</td><td>${n(o[1])}</td><td><b>${nf.format(o[2])}</b></td>${tum?`<td class="l"><span class="muted">${enCok(i)}</span></td>`:`<td>${pct(o[2]/(T[2]||1))}</td><td class="muted">${nf.format(T[2])}</td>`}</tr>`}).join("");
  const foot=rows.length?`<tr class="grp"><td class="l"><b>Toplam</b></td><td><b>${nf.format(toplam(0))}</b></td><td><b>${nf.format(toplam(1))}</b></td><td><b>${nf.format(toplam(2))}</b></td>${tum?"<td></td>":`<td>${pct(toplam(2)/(ulke||1))}</td><td class="muted">${nf.format(ulke)}</td>`}</tr>`:"";
  document.getElementById("t-bay").innerHTML=`<thead>${head}</thead><tbody>${body?body+foot:'<tr><td colspan="6" class="empty">Bu şirketin bayi lisansı yok.</td></tr>'}</tbody>`;
  document.getElementById("h-bay").textContent=tum?"Bayiler – tüm şirketler":`${SIR[S.sid][1]} – bayiler`;
  document.getElementById("s-bay").textContent=`${rows.length} il · ${nf.format(toplam(2))} istasyon`;
  if(S.il!=null){ const tr=document.querySelector(`#t-bay tr[data-il="${S.il}"]`); if(tr) tr.scrollIntoView({block:"nearest"}); }
}

/* ---------- Filtreler ---------- */
let OPT_BAY="", BAY_SID=new Set(), OPT_AKIS="", OPT_MUS="", MUS_SID=new Set(), OPT_ITH="", ITH_SID=new Set(), OPT_TKS="", TKS_SID=new Set();
const fA=document.getElementById("f-alici");
const fS=document.getElementById("f-sirket"), fU=document.getElementById("f-urun"), fI=document.getElementById("f-il"), fT=document.getElementById("f-term");
(function doldur(){
  const tot=SIR.map(()=>0); AF.forEach(f=>tot[f[0]]+=f[6]); LF.forEach(f=>tot[f[0]]+=f[6]); SEP.forEach(r=>{if(r[2]===0) tot[r[0]]+=r[3]*0.001});
  OPT_AKIS='<option value="-1">Tüm şirketler</option>'+SIR.map((s,i)=>[s,i]).filter(([,i])=>tot[i]>0).sort((a,b)=>tot[b[1]]-tot[a[1]]).map(([s,i])=>`<option value="${i}">${esc(s[1])}</option>`).join("");
  // Müşteri sayfası: başka dağıtıcıya satışı olan dağıtıcılar, satılan hacme göre
  const sat=SIR.map(()=>0); AF.forEach(f=>{if(f[11]!==f[0]&&!isTk(f)) sat[f[11]]+=f[6]});
  OPT_MUS='<option value="-1">Tüm dağıtıcılar</option>'+SIR.map((s,i)=>[s,i]).filter(([,i])=>sat[i]>=0.5).sort((a,b)=>sat[b[1]]-sat[a[1]]).map(([s,i])=>`<option value="${i}">${esc(s[1])} · ${ton(sat[i])}</option>`).join("");
  MUS_SID=new Set(SIR.map((s,i)=>i).filter(i=>sat[i]>=0.5));
  const ith=SIR.map(()=>0); AF.forEach(f=>{if((f[10]||0)>0) ith[f[11]]+=f[10]});
  OPT_ITH='<option value="-1">Tüm şirketler</option>'+SIR.map((s,i)=>[s,i]).filter(([,i])=>ith[i]>=0.5).sort((a,b)=>ith[b[1]]-ith[a[1]]).map(([s,i])=>`<option value="${i}">${esc(s[1])} · ${ton(ith[i])}</option>`).join("");
  ITH_SID=new Set(SIR.map((s,i)=>i).filter(i=>ith[i]>=0.5));
  const tks=SIR.map(()=>0); AF.forEach(f=>{if(isTk(f)) tks[f[11]]+=f[6]});
  OPT_TKS='<option value="-1">Tüm satıcılar</option>'+SIR.map((s,i)=>[s,i]).filter(([,i])=>tks[i]>=0.5).sort((a,b)=>tks[b[1]]-tks[a[1]]).map(([s,i])=>`<option value="${i}">${esc(s[1])} · ${ton(tks[i])}</option>`).join("");
  TKS_SID=new Set(SIR.map((s,i)=>i).filter(i=>tks[i]>=0.5));
  const bay=[...BIS].map(([sid,m])=>[sid,[...m.values()].reduce((a,v)=>a+v[2],0)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  OPT_BAY='<option value="-1">Tüm şirketler</option>'+bay.map(([i,n])=>`<option value="${i}">${esc(SIR[i][1])} · ${nf.format(n)} istasyon</option>`).join("");
  BAY_SID=new Set(bay.map(x=>x[0]));
  fI.innerHTML='<option value="">Tüm iller</option>'+[...IL].sort((a,b)=>a[1].localeCompare(b[1],"tr")).map(([i,a])=>`<option value="${i}">${esc(a)}</option>`).join("");
  document.getElementById("meta").textContent="Veri sürümü "+(window.__SURUM__||"");
})();

let MIXD=false;
function mobilHazirla(){ if(MIXD) return; MIXD=true;
  const P=KARTLAR.filter(([u])=>u!=="tum").map(([u,t])=>{let n=0; for(const f of AF) if(prA(f,u)) n+=f[6]; for(const f of LF) if(prL(f,u)) n+=f[6]; return [u,t,n];}).filter(x=>x[2]>=0.5).sort((a,b)=>b[2]-a[2]);
  const T=P.reduce((a,x)=>a+x[2],0)||1, mx=document.getElementById("mix");
  mx.setAttribute("aria-label","Ülke tüketiminde ürün payları: "+P.map(([,t,n])=>t+" "+pct(n/T)).join(", "));
  mx.innerHTML=P.map(([u,t,n])=>`<i style="flex:${n} 0 0;background:${URENK[u][2]}" title="${t} ${ton(n)}"></i>`).join("");
  mx.insertAdjacentHTML("afterend",`<div class="mixl mixd" aria-hidden="true">${P.slice(0,4).map(([u,t,n])=>`<span><i style="background:${URENK[u][2]}"></i>${t} <b>${pct(n/T)}</b></span>`).join("")}<span>ülke tüketimi ${ton(T)}</span></div>`);
  if(matchMedia("(max-width:600px)").matches) for(const ul of document.querySelectorAll("ul.notes")){ const d=document.createElement("details"); d.className="nt"; d.innerHTML=`<summary>Yöntem notları (${ul.children.length})</summary>`; ul.replaceWith(d); d.appendChild(ul); }
}
/* ---------- LPG · dağıtıcılar arası ticaret (kullanıcı 16.10.2026 14:42) ---------- */
const LT=D.lted||[];   // [alıcı (SIR), tedarikçi tipi, satıcı adı, terminal (rafineri), ton]
const LSAT=new Map(), LMUS=new Map();
for(const r of LT) if(r[1]==="Dağıtıcı"&&r[2]){ LSAT.set(r[2],(LSAT.get(r[2])||0)+r[4]); LMUS.set(r[0],(LMUS.get(r[0])||0)+r[4]); }
const LFS=D.lfs||[];   // db_108: [alıcı, terminal, satıcı (SIR), ton, il, km] – fiziksel dağıtıcı alımı
const LPT=new Map(); for(const r of LT) if(r[1]==="Dağıtıcı"&&r[2]&&r[3]>=0){ const k=r[2]+"|"+r[0]; const m=LPT.get(k)||LPT.set(k,new Map()).get(k); m.set(r[3],(m.get(r[3])||0)+r[4]); }   // (satıcı adı | alıcı) → terminal → ton (ticari)
const fLS=document.getElementById("f-lsat"), fLM=document.getElementById("f-lmus");
fLS.addEventListener("change",()=>{S.lsat=fLS.value; S.hepsiL=false; render()});
fLM.addEventListener("change",()=>{S.lmus=+fLM.value; S.hepsiL=false; render()});
document.getElementById("clear-l").addEventListener("click",()=>{S.lsat=""; S.lmus=-1; S.hepsiL=false; render()});
function lpgTicaret(){
  const okS=r=>r[1]==="Dağıtıcı"&&r[2]&&(!S.lsat||r[2]===S.lsat), okM=r=>S.lmus<0||r[0]===S.lmus;
  // seçenekler birbirine göre daralır
  const so=new Map(), mo=new Map();
  for(const r of LT){ if(r[1]!=="Dağıtıcı"||!r[2]) continue; if(okM(r)) so.set(r[2],(so.get(r[2])||0)+r[4]); if(okS(r)) mo.set(r[0],(mo.get(r[0])||0)+r[4]); }
  if(S.lsat&&!(so.get(S.lsat)>=0.5)) S.lsat=""; if(S.lmus>=0&&!(mo.get(S.lmus)>=0.5)) S.lmus=-1;
  const sO=[...so].sort((a,b)=>b[1]-a[1]), mO=[...mo].sort((a,b)=>b[1]-a[1]);
  fLS.innerHTML=`<option value="">Tüm satıcılar (${sO.length})</option>`+sO.map(([n,v])=>`<option value="${esc(n)}">${esc(n)} · ${ton(v)}</option>`).join(""); fLS.value=S.lsat;
  fLM.innerHTML=`<option value="-1">Tüm müşteriler (${mO.length})</option>`+mO.map(([a,v])=>`<option value="${a}">${esc(SIR[a][1])} · ${ton(v)}</option>`).join(""); fLM.value=String(S.lmus);
  const R=LT.filter(r=>okS(r)&&okM(r)), T=R.reduce((a,r)=>a+r[4],0), TUM=[...LSAT.values()].reduce((a,b)=>a+b,0);
  const nS=new Set(R.map(r=>r[2])).size, alc=new Set(R.map(r=>r[0]));
  // alıcı tarafı: ticari alım (dağıtıcı + rafineri) ve bayi / tüketiciye giden kısmı (akış)
  const ALC=S.lmus>=0?new Set([S.lmus]):new Set(LMUS.keys());
  let pD=0,pR=0; for(const r of LT) if(ALC.has(r[0])){ if(r[1]==="Dağıtıcı") pD+=r[4]; else pR+=r[4]; }
  let fK=0,fD=0,fR=0; for(const f of LF) if(ALC.has(f[0])){ if(f[4]===0||f[4]===3) fK+=f[6]; else if(f[4]===1) fD+=f[6]; else fR+=f[6]; }
  const yen=Math.max(0,pD+pR-fD-fR);
  const k=[];
  k.push(`<div class="kpi"><span>Dağıtıcılar arası satış</span><b>${ton(T)}</b><span>${nS} satıcı → ${alc.size} müşteri${S.lsat||S.lmus>=0?" · piyasanın "+pct(T/TUM):""}</span></div>`);
  if(!S.lsat){
    k.push(`<div class="kpi"><span>${S.lmus>=0?esc(SIR[S.lmus][1])+" – alımın kullanımı":"Alımın kullanımı"}</span><b>${ton(pD+pR)}</b><span>dağıtıcıdan ${ton(pD)} · rafineriden ${ton(pR)}</span>
      <div class="lseg" aria-hidden="true"><i style="flex:${fD+fR} 0 0;background:var(--lpg)"></i><i style="flex:${yen} 0 0;background:#E8B48A"></i></div>
      <span>bayi ve tüketiciye ${ton(fD+fR)} · yeniden satış (toptan) ${ton(yen)}</span></div>`);
    if(S.lmus>=0) k.push(`<div class="kpi"><span>Kendi ithalatı ve stok</span><b>${ton(fK)}</b><span>bayi ve tüketici satışındaki payı ${pct(fK/((fK+fD+fR)||1))}</span></div>`);
  } else {
    const top=[...new Map(R.reduce((m,r)=>m.set(r[0],(m.get(r[0])||0)+r[4]),new Map()))].sort((a,b)=>b[1]-a[1]).slice(0,3);
    k.push(`<div class="kpi"><span>En büyük müşteriler</span><b>${top.length?esc(SIR[top[0][0]][1]):"–"}</b><span>${top.map(([a,v])=>`${esc(SIR[a][1])} ${pct(v/T)}`).join(" · ")}</span></div>`);
  }
  document.getElementById("k-lpgm").innerHTML=k.join("");
  document.getElementById("h-lpgm").textContent=(S.lsat?`${S.lsat} – müşteriler`:"LPG – dağıtıcılar arası ticaret")+(S.lmus>=0?` → ${SIR[S.lmus][1]}`:"");
  document.getElementById("s-lpgm").textContent=`${nS} satıcı · ${alc.size} müşteri · ${ton(T)}`;
  document.getElementById("l-lpgm").textContent="Dağıtıcıların birbirine yıllık LPG satışı (otogaz, tüplü ve dökme toplamı). Satıcı satırının altında müşterileri ve satıcının satışındaki payları yer alır. Müşteri seçince müşterinin LPG'sini hangi terminallerden yüklediği de görünür.";
  // satıcı → müşteri tablosu
  const g=new Map(); for(const r of R){ const o=g.get(r[2])||g.set(r[2],{v:0,m:new Map()}).get(r[2]); o.v+=r[4]; o.m.set(r[0],(o.m.get(r[0])||0)+r[4]); }
  const gs=[...g].sort((a,b)=>b[1].v-a[1].v), LIM=S.lsat||S.lmus>=0||S.hepsiL?1e9:6, mx=Math.max(...[...g.values()].flatMap(o=>[...o.m.values()]),1);
  const head=`<tr><th class="l">Satıcı / müşteri</th><th>Miktar</th><th>Satıcı içinde</th><th>Müşterinin dağıtıcı alımında</th></tr>`;
  let body="";
  for(const [n,o] of gs){
    body+=`<tr class="tg grp lsat"><td class="l"><b>${esc(n)}</b><br><span class="muted">${o.m.size} müşteri</span></td><td><b>${ton(o.v)}</b></td><td><span class="muted">piyasanın ${pct(o.v/TUM)}</span></td><td></td></tr>`;
    const ms=[...o.m].sort((a,b)=>b[1]-a[1]);
    const ayr=S.lsat||S.lmus>=0;
    for(const [a,v] of ms.slice(0,LIM)){
      const tm=[...(LPT.get(n+"|"+a)||new Map())].filter(([,x])=>x>=0.5).sort((x,y)=>y[1]-x[1]);
      body+=`<tr class="sub" tabindex="0" data-lmus="${a}"><td class="l ind">${esc(SIR[a][1])}${!ayr&&tm.length?`<br><span class="muted">${tm.length} terminal · ${esc(TERM[tm[0][0]][1])}${tm.length>1?" +"+(tm.length-1):""}</span>`:""}</td><td><span class="pbar" style="width:${Math.max(2,Math.round(44*v/mx))}px"></span>${cell(v)}</td><td>${pct(v/o.v)}</td><td>${pct(v/(LMUS.get(a)||1))}</td></tr>`;
      if(ayr) for(const [t,x] of tm) body+=`<tr class="sub"><td class="l ind2"><span class="muted">${(esc(TERM[t][1])+LIS(t,1))} · ${esc(HUB[TERM[t][2]].ad)}</span></td><td><span class="muted">${cell(x)}</span></td><td><span class="muted">${pct(x/v)}</span></td><td></td></tr>`;
    }
    if(ms.length>LIM){ const rest=ms.slice(LIM), rv=rest.reduce((x,y)=>x+y[1],0); body+=`<tr class="sub"><td class="l ind muted">+${rest.length} müşteri daha</td><td><span class="muted">${ton(rv)}</span></td><td><span class="muted">${pct(rv/o.v)}</span></td><td></td></tr>`; }
  }
  const more=!(S.lsat||S.lmus>=0)?`<tr><td colspan="4" class="empty"><button type="button" class="clear" id="hepsiL">${S.hepsiL?"Satıcı başına ilk 6 müşteriyi göster":"Tüm müşterileri göster"}</button></td></tr>`:"";
  document.getElementById("t-lpgm").innerHTML=`<thead>${head}</thead><tbody>${body?body+more:`<tr><td colspan="4" class="empty">Bu seçimde dağıtıcılar arası LPG satışı yok.</td></tr>`}</tbody>`;
  // müşterinin yükleme terminalleri (fiziksel akış)
  const sec=document.getElementById("sec-lpgt"); sec.hidden=S.lmus<0;
  if(S.lmus>=0){
    const t=new Map(); for(const f of LF) if(f[0]===S.lmus){ const o=t.get(f[1])||t.set(f[1],{k:0,d:0,r:0,il:new Set(),tk:0}).get(f[1]); if(f[4]===0||f[4]===3) o.k+=f[6]; else if(f[4]===1) o.d+=f[6]; else o.r+=f[6]; o.il.add(f[3]); o.tk+=f[6]*f[7]; }
    const ts=[...t].map(([i,o])=>[i,o,o.k+o.d+o.r]).filter(x=>x[2]>0.5).sort((a,b)=>b[2]-a[2]), TT=ts.reduce((a,x)=>a+x[2],0);
    const satT=i=>{ const m=new Map(); for(const r of LFS) if(r[0]===S.lmus&&r[1]===i&&(!S.lsat||(r[2]>=0&&SIR[r[2]][1]===S.lsat))) m.set(r[2],(m.get(r[2])||0)+r[3]); const a=[...m].sort((x,y)=>y[1]-x[1]); return a.length?a.slice(0,3).map(([s_,v])=>`${esc(s_>=0?SIR[s_][1]:"?")} ${ton(v)}`).join(" · ")+(a.length>3?` · +${a.length-3}`:""):"–"; };
    document.getElementById("h-lpgt").textContent=`${SIR[S.lmus][1]} – LPG yükleme terminalleri`;
    document.getElementById("s-lpgt").textContent=`${ts.length} terminal · ${ton(TT)} bayi ve tüketiciye`;
    document.getElementById("t-lpgt").innerHTML=`<thead><tr><th class="l">Terminal</th><th>Kendi ithalatı / stok</th><th>Dağıtıcı alımı</th><th>Rafineri alımı</th><th>Toplam</th><th>Pay</th><th>İl</th><th>Ort. km</th><th class="l">Dağıtıcı alımında satıcılar</th></tr></thead><tbody>`+
      (ts.length?ts.map(([i,o,v])=>`<tr><td class="l"><b>${(esc(TERM[i][1])+LIS(i,1))}</b> <span class="muted">· ${esc(HUB[TERM[i][2]].ad)}</span></td><td>${cell(o.k)}</td><td>${cell(o.d)}</td><td>${cell(o.r)}</td><td><b>${ton(v)}</b></td><td>${pct(v/TT)}</td><td>${o.il.size}</td><td>${nf.format(o.tk/v)}</td><td class="l"><span class="muted">${satT(i)}</span></td></tr>`).join(""):`<tr><td colspan="9" class="empty">Bu şirketin bayi / tüketici satışı yok (yalnız toptan).</td></tr>`)+`</tbody>`;
  }
}
document.getElementById("t-lpgm").addEventListener("click",e=>{ if(e.target.id==="hepsiL"){S.hepsiL=!S.hepsiL; render(); return;} const tr=e.target.closest("[data-lmus]"); if(tr){S.lmus=+tr.dataset.lmus; render();} });
/* ---------- LPG · ithalat (kullanıcı 16.10.2026 14:50) ---------- */
const LITH=D.lith||[], LULKE=D.lulke||[], LAY=D.lay||[], LYIL=D.lyil||[];   // LITH: [şirket, terminal, gümrük grubu, ton]
const fLI=document.getElementById("f-lith"), fLG=document.getElementById("f-lgum");
fLI.addEventListener("change",()=>{S.lith=+fLI.value; render()});
fLG.addEventListener("change",()=>{S.lgum=+fLG.value; render()});
document.getElementById("clear-li").addEventListener("click",()=>{S.lith=-1; S.lgum=-1; render()});
const kisa=t=>t>=1e6?nf2.format(t/1e6)+" Mt":nf.format(t/1e3)+" kt";
function lpgIthalat(){
  const okI=r=>S.lith<0||r[0]===S.lith, okG=r=>S.lgum<0||r[1]===S.lgum;   // terminal filtresi (kullanıcı 21.10.2026: gümrük ayrımına gerek yok)
  const io=new Map(), go=new Map();
  for(const r of LITH){ if(okG(r)) io.set(r[0],(io.get(r[0])||0)+r[3]); if(okI(r)) go.set(r[1],(go.get(r[1])||0)+r[3]); }
  if(S.lith>=0&&!(io.get(S.lith)>=0.5)) S.lith=-1; if(S.lgum>=0&&!(go.get(S.lgum)>=0.5)) S.lgum=-1;
  fLI.innerHTML=`<option value="-1">Tüm ithalatçılar (${io.size})</option>`+[...io].sort((a,b)=>b[1]-a[1]).map(([a,v])=>`<option value="${a}">${esc(SIR[a][1])} · ${ton(v)}</option>`).join(""); fLI.value=String(S.lith);
  fLG.innerHTML=`<option value="-1">Tüm terminaller (${go.size})</option>`+[...go].sort((a,b)=>b[1]-a[1]).map(([t,v])=>`<option value="${t}">${esc(TERM[t][1])} · ${esc(HUB[TERM[t][2]].ad)} · ${ton(v)}</option>`).join(""); fLG.value=String(S.lgum);
  const R=LITH.filter(r=>okI(r)&&okG(r)), T=R.reduce((a,r)=>a+r[3],0), TUM=LITH.reduce((a,r)=>a+r[3],0);
  // kendi ithalatıyla bayi / tüketici satışı (şirket × terminal)
  const KND=new Map(); for(const f of LF) if(f[4]===0){ const k=f[0]+"|"+f[1]; KND.set(k,(KND.get(k)||0)+f[6]); }
  let kendi=0; const seen=new Set(); for(const r of R){ const k=r[0]+"|"+r[1]; if(!seen.has(k)){ seen.add(k); kendi+=Math.min(KND.get(k)||0, R.filter(x=>x[0]===r[0]&&x[1]===r[1]).reduce((a,x)=>a+x[3],0)); } }
  const Y=LYIL.find(r=>r[0]===String(YIL))||[], fil=S.lith>=0||S.lgum>=0;   // yalnız baz yıl (kullanıcı 20.10.2026)
  const ayMax=LAY.reduce((m,r)=>r[2]>m[2]?r:m,LAY[0]||["",0,0]);
  const k=[];
  k.push(`<div class="kpi"><span>${fil?"Seçimin ithalatı":"LPG ithalatı · "+YIL}</span><b>${ton(T)}</b><span>${fil?"ülke ithalatının "+pct(T/TUM):`aylık ort. ${ton((Y[2]||0)/12)} · en yüksek ${esc(ayMax[0])} ${ton(ayMax[2])}`}</span></div>`);
  if(!fil) k.push(`<div class="kpi"><span>Arzdaki payı</span><b>${pct(Y[2]/(Y[1]+Y[2]))}</b><span>üretim ${ton(Y[1])} · ithalat ${ton(Y[2])}</span></div>`);
  k.push(`<div class="kpi"><span>İthalatçı · terminal</span><b>${new Set(R.map(r=>r[0])).size} · ${new Set(R.map(r=>r[1])).size}</b><span>terminal başına ort. ${nf1.format(new Set(R.map(r=>r[0]+'|'+r[1])).size/(new Set(R.map(r=>r[1])).size||1))} ithalatçı</span></div>`);
  k.push(`<div class="kpi"><span>Kendi bayisine / tüketiciye</span><b>${ton(kendi)}</b><span>ithalatın ${pct(kendi/(T||1))} · kalan ${ton(Math.max(0,T-kendi))} başka dağıtıcıya, ihracata ya da stoğa</span>
    <div class="lseg" aria-hidden="true"><i style="flex:${kendi} 0 0;background:var(--lpg)"></i><i style="flex:${Math.max(0,T-kendi)} 0 0;background:#E8B48A"></i></div></div>`);
  if(!fil) k.push(`<div class="kpi"><span>İhracat · ${YIL}</span><b>${ton(Y[3]||0)}</b><span>arz içindeki payı ${pct((Y[3]||0)/((Y[1]+Y[2])||1))} · yurt içi satış ${ton(Y[4]||0)}</span></div>`);
  document.getElementById("k-lpgi").innerHTML=k.join("");
  document.getElementById("h-lpgi").textContent="LPG ithalatı"+(S.lith>=0?" – "+SIR[S.lith][1]:"")+(S.lgum>=0?" · "+TERM[S.lgum][1]+" · "+HUB[TERM[S.lgum][2]].ad:"");
  document.getElementById("s-lpgi").textContent=`${ton(T)}${fil?" · ülkenin "+pct(T/TUM):""}`;
  document.getElementById("l-lpgi").textContent="Türkiye LPG arzının çoğu ithalattır. Kartlar ve tablo ithalatçı ile terminal filtresine göre değişir ("+YIL+").";
  // tablo: terminal → ithalatçı (kullanıcı 21.10.2026: gümrük müdürlüğü ayrımına gerek yok)
  const G=new Map(); for(const r of R){ const t=G.get(r[1])||G.set(r[1],{v:0,s:new Map()}).get(r[1]); t.v+=r[3]; t.s.set(r[0],(t.s.get(r[0])||0)+r[3]); }
  const head=`<tr><th class="l">Terminal / ithalatçı</th><th>İthalat</th><th>Pay</th><th>Kendi bayisine / tüketiciye</th><th>Başka dağıtıcıya, ihracat, stok</th></tr>`;
  let body="";
  for(const [t,o] of [...G].sort((a,b)=>b[1].v-a[1].v)){
    const ss=[...o.s].sort((a,b)=>b[1]-a[1]), tk=ss.reduce((q,[a,v])=>q+Math.min(KND.get(a+"|"+t)||0,v),0);
    body+=`<tr class="tg grp lsat"><td class="l"><b>${esc(TERM[t][1])}</b>${LIS(t,1)}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)} · ${ss.length} ithalatçı</span></td><td><b>${ton(o.v)}</b></td><td>${pct(o.v/(T||1))}</td><td>${cell(tk)}</td><td>${cell(o.v-tk)}</td></tr>`;
    for(const [a,v] of ss){ const kd=Math.min(KND.get(a+"|"+t)||0,v); body+=`<tr class="sub"><td class="l ind">${esc(SIR[a][1])}</td><td>${cell(v)}</td><td>${pct(v/(T||1))}</td><td>${cell(kd)}</td><td>${cell(v-kd)}</td></tr>`; }
  }
  document.getElementById("t-lpgi").innerHTML=`<thead>${head}</thead><tbody>${body||`<tr><td colspan="5" class="empty">Bu seçimde ithalat yok.</td></tr>`}</tbody>`;
  document.getElementById("s-lpgi-t").textContent=`${G.size} terminal · ${new Set(R.map(r=>r[0])).size} ithalatçı`;
}
/* ---------- Terminaller (kullanıcı 18.10.2026 12:12; 12:36: filtrede terminal adı, tabloda terminalde operasyon yapan şirketler) ---------- */
const SIR_AD=new Set(SIR.map(x=>x[1])), TMETA=D.tmeta||[], fAS=document.getElementById("f-atr-s"), fAT=document.getElementById("f-atr-t"), fLTS=document.getElementById("f-ltr-s"), fLTT=document.getElementById("f-ltr-t");
fAS.addEventListener("change",()=>{S.atrTm=+fAS.value; render()}); fAT.addEventListener("change",()=>{S.atrSr=+fAT.value; render()});
fLTS.addEventListener("change",()=>{S.ltrTm=+fLTS.value; render()}); fLTT.addEventListener("change",()=>{S.ltrSr=+fLTT.value; render()});
// Genel çoklu seçim (Terminaller sayfaları, kullanıcı 18.10.2026 13:37): boş dizi = tümü
function msKur(id,al,koy){ const k=document.getElementById(id), b=k.querySelector(".ms-b"), p=k.querySelector(".ms-p");
  const ac=v=>{ p.hidden=!v; b.setAttribute("aria-expanded",String(v)); if(v){ const c=p.querySelector("input"); if(c) c.focus(); } };
  b.setAttribute("aria-labelledby","l-"+id); b.addEventListener("click",()=>ac(p.hidden));
  p.addEventListener("change",e=>{ const x=e.target; if(!x.matches("input")) return; const v=+x.value;
    if(v<0) koy([]); else { const t=new Set(al()); x.checked?t.add(v):t.delete(v); koy([...t].sort((a,b)=>a-b)); }
    render(); const f=p.querySelector(`input[value="${v}"]`); if(f) f.focus(); });
  document.addEventListener("click",e=>{ if(!p.hidden&&!k.contains(e.target)) ac(false); });
  k.addEventListener("keydown",e=>{ if(e.key==="Escape"&&!p.hidden){ ac(false); b.focus(); } }); }
function msDoldur(id,items,sec){ const k=document.getElementById(id), p=k.querySelector(".ms-p"), S2=new Set(sec), T=items.reduce((a,x)=>a+x[3],0);
  p.innerHTML=`<label class="ms-o tum"><input type="checkbox" value="-1"${S2.size?"":" checked"}><span>Tüm ürünler</span><em>${ton(T)}</em></label>`+items.map(([v,l,c,t])=>`<label class="ms-o"><input type="checkbox" value="${v}"${S2.has(v)?" checked":""}><i style="background:${c}"></i><span>${esc(l)}</span><em>${ton(t)}</em></label>`).join("");
  const ad=items.filter(x=>S2.has(x[0])).map(x=>x[1]); k.querySelector(".ms-v").textContent=!S2.size?"Tüm ürünler":S2.size<=2?ad.join(", "):`${S2.size} ürün seçili`; }
msKur("ms-atr",()=>S.atrU,v=>{S.atrU=v}); msKur("ms-ltr",()=>S.ltrU,v=>{S.ltrU=v});
const LPGU=["Otogaz","Tüplü","Dökme"], LPGU_R=["#D9711F","#B55A12","#F2AE6F"];
document.getElementById("clear-atr").addEventListener("click",()=>{S.atrTm=-1; S.atrSr=-1; S.atrU=[]; render()});
document.getElementById("clear-ltr").addEventListener("click",()=>{S.ltrTm=-1; S.ltrSr=-1; S.ltrU=[]; render()});
const tesisGrp=t=>{ const x=(TMETA[t]||[])[6]||""; return x==="Rafineri"?"Rafineri sahası":/Havacılık/.test(x)?"Havacılık yakıt deposu":/^Bağımsız/.test(x)?"Bağımsız depo":/iç terminal/.test(x)?"İç terminal":/liman terminali/.test(x)?"Liman terminali":/LPG/.test(x)?"LPG tesisi":"Dağıtıcı terminali"; };
const TESIS_RENK={"Dağıtıcı terminali":"#0F6E8C","Rafineri sahası":"#8A6238","Havacılık yakıt deposu":"#7553B5","Liman terminali":"#1F6FB2","İç terminal":"#3E9A4A","Bağımsız depo":"#B08E14","LPG tesisi":"#C8641C"};
const SIR_PAL=["#0F6E8C","#2F6FB5","#C8641C","#3E9A4A","#7553B5","#B08E14"];
const islAd=t=>{ const m=TMETA[t]||[]; return m[7]||(m[6]==="Rafineri"?TERM[t][1].split(" ")[0]:""); };
const dolBar=d=>d==null?'<span class="z">–</span>':`<span class="tb-d" title="Yükleme / yıllık kapasite (kapasite × devir)"><span class="kc-bar"><i style="width:${Math.min(100,d*100).toFixed(1)}%;background:${d>=0.9?"#C0392B":d>=0.7?"#D9821F":"var(--accent)"}"></i></span><em>${pct(d)}</em></span>`;
const nSir=c=>[...c.values()].filter(x=>x.v>=0.5).length;
const trmOpt=(el,R,sec,bos)=>{ el.innerHTML=`<option value="-1">${bos} (${R.length})</option>`+R.map(r=>`<option value="${r.t}">${esc(TERM[r.t][1])} · ${esc(HUB[TERM[r.t][2]].ad)}${r.v>=0.5?" · "+ton(r.v):""}</option>`).join(""); el.value=String(sec); };
const sirKart=(baslik,o,T)=>{ const a=[...o].sort((x,y)=>y[1].v-x[1].v), P=a.slice(0,6).map(([s,x],k)=>({l:SIR[s][1],v:x.v,c:SIR_PAL[k]})); if(a.length>6) P.push({l:`Diğer ${a.length-6} şirket`,v:a.slice(6).reduce((q,x)=>q+x[1].v,0),c:"#B8C4CB"}); return kompKart(baslik,P,{T,sag:`${a.length} şirket`,span:5}); };
// Ürün kaynak zinciri (kullanıcı 18.10.2026 12:43): kaynak (rafineri / ithalat) → satıcı dağıtıcı → şirket · taşıma modu
const zinAk=f=>{ const K=KAY[f[4]]||["","?",""], kendi=K[3]===f[0];
  const src=String(K[2]).startsWith("Dağıtıcı")?(kendi?"Kendi ithalatı":K[1]+" ithalatı"):K[1];
  const sat=f[11]>=0&&f[11]!==f[0]?SIR[f[11]][1]:null, md=tasMod(MOD[f[5]]), z=ZIN[f[5]];
  // zincir (kullanıcı 18.10.2026 15:48): "Socar ← Petrol Ofisi tahsisi" → kaynak → Petrol Ofisi → Socar (ara halkalar sırayla)
  const zp=z?String(z).split(" ← ").map(s=>s.replace(/ tahsisi$/,"").trim()):[], ara=zp.slice(1).reverse().filter(a=>a!==K[1]&&a!==sat);
  const satG=sat&&!(String(K[2]).startsWith("Dağıtıcı")&&SIR[f[11]][1]===K[1]);
  return `${src}${ara.map(a=>` → <span class="zn">${esc(a)}</span>`).join("")}${satG?" → "+sat:""} · <span class="muted">${esc(md)}</span>`; };
// Ürün → kaynak → mod (kullanıcı 18.10.2026 14:03: hangi ürün hangi kaynaktan hangi modda): her ürün başlığı altında tüm yollar tonajıyla
const zinUrun=(zu,ad,renk)=>[...(zu||new Map())].map(([u,m])=>[u,m,[...m.values()].reduce((a,b)=>a+b,0)]).filter(x=>x[2]>=0.5).sort((a,b)=>b[2]-a[2])
  .map(([u,m,T])=>`<span class="zu"><i style="background:${renk(u)}"></i>${esc(ad(u))} <b>${ton(T)}</b></span>`+[...m].filter(x=>x[1]>=0.5).sort((x,y)=>y[1]-x[1]).map(([z,v])=>`<span class="zc zi">${z} <em>${ton(v)}${m.size>1?" · "+pct(v/T):""}</em></span>`).join("")).join("");
// Tedarikçi (kullanıcı 18.10.2026 14:22): ürünü şirkete satan / veren taraf – başka dağıtıcı, rafineri şirketi, kendi ithalatı, açılış stoku
const tedAk=f=>{ if(f[11]>=0&&f[11]!==f[0]) return SIR[f[11]][1]; const K=KAY[f[4]]||["","?",""], ad=String(K[1]);
  if(String(K[2]).startsWith("Dağıtıcı")) return K[3]===f[0]?"Kendi ithalatı":ad;
  if(ad==="İthalat") return "Kendi ithalatı";
  return ad.startsWith("Tüpraş")?"Tüpraş":ad.startsWith("Star")?"Star Rafineri":/stok/i.test(ad)?"Açılış stoku":ad; };
const tedHTML=(m,T)=>{ const a=[...(m||new Map())].filter(x=>x[1]>=0.5).sort((x,y)=>y[1]-x[1]); const r=a.slice(5).reduce((q,x)=>q+x[1],0); return a.slice(0,5).map(([n,v])=>`<span class="zc"><b>${esc(n)}</b> <em>${ton(v)}${a.length>1?" · "+pct(v/(T||1)):""}</em></span>`).join("")+(a.length>5?`<span class="zc" title="${esc(a.slice(5).map(([n,v])=>n+" "+ton(v)).join(", "))}">+${a.length-5} tedarikçi <em>${ton(r)} · ${pct(r/(T||1))}</em></span>`:"")||'<span class="z">–</span>'; };
// Tedarikçi → alıcı ağacı (kullanıcı 18.10.2026 14:34: alıcıları tedarikçilerin altında): terminal × tedarikçi × alıcı × ürün × zincir
const agacEkle=(o,sup,buy,u,z,v,it,km,il)=>{ const sp=(o.sp||=new Map()), S1=sp.get(sup)||sp.set(sup,{u:[0,0,0],uu:new Map(),v:0,it:0,km:0,il:new Set(),b:new Map()}).get(sup);
  const ui=u===0?0:u===1?1:2; S1.u[ui]+=v; S1.uu.set(u,(S1.uu.get(u)||0)+v); S1.v+=v; S1.it+=it; S1.km+=km*v; if(il!=null) S1.il.add(il);
  const B=S1.b.get(buy)||S1.b.set(buy,{u:[0,0,0],v:0,it:0,km:0,il:new Set(),zu:new Map()}).get(buy); B.u[ui]+=v; B.v+=v; B.it+=it; B.km+=km*v; if(il!=null) B.il.add(il);
  const m=B.zu.get(u)||B.zu.set(u,new Map()).get(u); m.set(z,(m.get(z)||0)+v); };
const urunOz=(uu,ad,renk)=>`<div class="uoz">`+[...uu].filter(x=>x[1]>=0.5).sort((a,b)=>b[1]-a[1]).map(([u,v])=>`<span class="zu"><i style="background:${renk(u)}"></i>${esc(ad(u))} <b>${ton(v)}</b></span>`).join("")+`</div>`;
const zinHTML=(m,T)=>{ const a=[...m].sort((x,y)=>y[1]-x[1]).filter(x=>x[1]>=0.5); return a.slice(0,3).map(([z,v])=>`<span class="zc">${z}${a.length>1?` <em>${pct(v/(T||1))}</em>`:""}</span>`).join("")+(a.length>3?`<span class="zc muted">+${a.length-3} yol</span>`:""); };
const sirOpt=(el,M,sec)=>{ const a=[...M].filter(x=>x[1]>=0.5).sort((x,y)=>y[1]-x[1]); el.innerHTML=`<option value="-1">Tüm dağıtım şirketleri (${a.length})</option>`+a.map(([s,v])=>`<option value="${s}">${esc(SIR[s][1])} · ${ton(v)}</option>`).join(""); el.value=String(sec); };
function akTerminaller(){
  const G=new Map(), SM=new Map(), UT=new Map(); for(const f of AF) UT.set(f[3],(UT.get(f[3])||0)+f[6]);
  S.atrU=S.atrU.filter(u=>UT.get(u)>=0.5); const US=new Set(S.atrU);
  msDoldur("ms-atr",[...UT].filter(x=>x[1]>=0.5).sort((a,b)=>a[0]-b[0]).map(([u,v])=>[u,TURAD[u]||"?",(URENK["a"+u]||URENK.tum)[2],v]),S.atrU);
  for(const f of AF){ if(US.size&&!US.has(f[3])) continue; SM.set(f[0],(SM.get(f[0])||0)+f[6]);
    const o=G.get(f[1])||G.set(f[1],{u:[0,0,0],it:0,km:0,il:new Set(),c:new Map()}).get(f[1]), ui=f[3]===0?0:f[3]===1?1:2;
    o.u[ui]+=f[6]; o.it+=f[10]||0; o.km+=(f[7]||0)*f[6]; o.il.add(f[2]);
    const c=o.c.get(f[0])||o.c.set(f[0],{u:[0,0,0],v:0,it:0,km:0,il:new Set(),z:new Map()}).get(f[0]); c.u[ui]+=f[6]; c.v+=f[6]; c.it+=f[10]||0; c.km+=(f[7]||0)*f[6]; c.il.add(f[2]);
    const zk=zinAk(f); agacEkle(o,tedAk(f),f[0],f[3],zk,f[6],f[10]||0,f[7]||0,f[2]); c.z.set(zk,(c.z.get(zk)||0)+f[6]); { const td=(c.td||=new Map()), n=tedAk(f); td.set(n,(td.get(n)||0)+f[6]); } const zu=(c.zu||=new Map()), m=zu.get(f[3])||zu.set(f[3],new Map()).get(f[3]); m.set(zk,(m.get(zk)||0)+f[6]); }
  if(!US.size) TERM.forEach((x,t)=>{ if(x[3]&&!G.has(t)&&(TMETA[t]||[])[2]>0) G.set(t,{u:[0,0,0],it:0,km:0,il:new Set(),c:new Map()}); });
  if(S.atrSr>=0&&!(SM.get(S.atrSr)>=0.5)) S.atrSr=-1; sirOpt(fAT,SM,S.atrSr);
  const sr=S.atrSr, cv=o=>sr>=0?((o.c.get(sr)||{}).v||0):o.u[0]+o.u[1]+o.u[2];
  const ALL=[...G].map(([t,o])=>({t,o,v:o.u[0]+o.u[1]+o.u[2],w:cv(o)})).filter(r=>sr<0||r.w>=0.5).sort((a,b)=>b.w-a.w||TERM[a.t][1].localeCompare(TERM[b.t][1],"tr"));
  if(S.atrTm>=0&&!ALL.some(r=>r.t===S.atrTm)) S.atrTm=-1;
  trmOpt(fAS,ALL.map(r=>({t:r.t,v:r.w})),S.atrTm,"Tüm terminaller");
  const R=S.atrTm>=0?ALL.filter(r=>r.t===S.atrTm):ALL, T=R.reduce((a,r)=>a+r.w,0), nAkt=R.filter(r=>r.w>=0.5).length, tek=S.atrTm>=0?R[0]:null, sad=sr>=0?SIR[sr][1]:null;
  document.getElementById("h-atr").textContent=(tek?TERM[tek.t][1]:"Akaryakıt terminalleri")+(sad?` · ${sad}`:"")+(US.size?` · ${S.atrU.map(u=>TURAD[u]).join(" + ")}`:"");
  document.getElementById("s-atr").textContent=tek?`${HUB[TERM[tek.t][2]].ad} · ${nSir(tek.o.c)} şirket · ${ton(tek.v)}${sad?` · ${sad} ${ton(tek.w)}`:""}`:`${nAkt} terminal${R.length>nAkt?` (+${R.length-nAkt} yüklemesiz)`:""} · ${sad?sad+" yüklemesi ":""}${ton(T)}`;
  let k=`<div class="kg">`;
  if(tek){ const m=TMETA[tek.t]||[], TV=tek.v;
    k+=sirKart("Operasyon yapan şirketler",tek.o.c,TV)
      +kompKart("Ürün",[{l:"Benzin",v:tek.o.u[0],c:URENK.a0[2]},{l:"Motorin",v:tek.o.u[1],c:URENK.a1[2]},{l:"Diğer",v:tek.o.u[2],c:URENK.a3[2],s:"havacılık, denizcilik, fuel oil…"}],{buyuk:ton(TV),alt:`ithal payı ${pct(tek.o.it/(TV||1))} · ${tek.o.il.size} il`,span:4})
      +`<div class="kc" style="--sp:3"><div class="kc-h"><span>Künye</span></div><div class="kc-sl" style="gap:5px;font-size:13px"><div>${LIS(tek.t,0)}</div><div class="muted">${esc(m[6]||"")}${m[1]?" · "+esc(m[1]):""}</div><div>İşletmeci: <b>${esc(islAd(tek.t)||"–")}</b></div><div>Kapasite: <b>${m[2]?nf.format(m[2])+" m³":"–"}</b></div><div>Doluluk: ${dolBar(m[8])}</div><div>Bayiye ort.: <b>${TV>=0.5?nf.format(Math.round(tek.o.km/TV))+" km":"–"}</b></div></div></div>`;
  } else {
    const TG=new Map(); for(const r of R) TG.set(tesisGrp(r.t),(TG.get(tesisGrp(r.t))||0)+r.w);
    k+=kompKart("Yükleme · tesis tipi",[...TG].sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v,c:TESIS_RENK[l]||"#5E7384",s:`${R.filter(r=>tesisGrp(r.t)===l&&r.w>=0.5).length} terminal`})),{buyuk:ton(T),alt:`${nAkt} terminal${sad?" · "+esc(sad):""}`,span:4})
      +siraKart("En çok yükleme",R.map(r=>[TERM[r.t][1],r.w]),{n:8,sag:sad?esc(sad):"benzin + motorin + diğer",span:4});
    if(sr>=0){ const ZM=new Map(); for(const r of R){ const c=r.o.c.get(sr); if(c) for(const [z,v] of c.z){ const zz=z.replace(/ · <span class="muted">.*$/,""); ZM.set(zz,(ZM.get(zz)||0)+v);} }
      k+=siraKart("Ürün kaynakları",[...ZM].map(([z,v])=>[z.replace(/<[^>]+>/g,""),v]),{n:8,c:"#7553B5",sag:"kaynak → satıcı",span:4}); }
    else { const DL=R.filter(r=>(TMETA[r.t]||[])[8]!=null).map(r=>[TERM[r.t][1],TMETA[r.t][8]*100]);
      k+=DL.length?siraKart("Kapasite kullanımı",DL,{n:8,fmt:x=>"%"+nf1.format(x),c:"#D9821F",sag:"yükleme / yıllık kapasite",span:4}):""; } }
  document.getElementById("k-atr").innerHTML=k+`</div>`;
  const head=`<tr><th class="l">Terminal · lisans / tedarikçi / alıcı</th><th class="l">Tesis · işletmeci / ürün kaynak zinciri</th><th>Kapasite</th><th>Benzin</th><th>Motorin</th><th>Diğer</th><th>Toplam</th><th>Pay</th><th>İthal</th><th class="l">Doluluk</th><th>İl</th><th>Bayiye km</th></tr>`;
  const out=[], UAD=u=>TURAD[u]||"?", URK=u=>(URENK["a"+u]||URENK.tum)[2];
  for(const {t,o,v} of R){ const m=TMETA[t]||[];
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(TERM[t][1])}</b>${LIS(t,0)}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)} · ${(o.sp||new Map()).size} tedarikçi · ${nSir(o.c)} alıcı</span></td><td class="l"><span class="muted">${esc(m[6]||"")}${m[1]?" · "+esc(m[1]):""}${islAd(t)?"<br>"+esc(islAd(t)):""}</span></td><td>${m[2]?nf.format(m[2])+" m³":'<span class="z">–</span>'}</td><td>${cell(o.u[0])}</td><td>${cell(o.u[1])}</td><td>${cell(o.u[2])}</td><td><b>${cell(v)}</b></td><td>${v>=0.5&&!tek&&sr<0?pct(v/(T||1)):v>=0.5?"%100":""}</td><td>${o.it>=0.5?pct(o.it/v):'<span class="z">–</span>'}</td><td class="l">${dolBar(m[8])}</td><td>${o.il.size||'<span class="z">–</span>'}</td><td>${v>=0.5?nf.format(Math.round(o.km/v)):'<span class="z">–</span>'}</td></tr>`);
    for(const [sn,P] of [...(o.sp||new Map())].sort((a,b)=>b[1].v-a[1].v)){ if(P.v<0.5) continue; const BB=[...P.b].filter(([b,x])=>x.v>=0.5&&(sr<0||b===sr)).sort((a,b)=>b[1].v-a[1].v); if(!BB.length) continue;
      out.push(`<tr class="sub tsup"><td class="l ind"><span class="sup-e">tedarikçi</span><b>${esc(sn)}</b><br><span class="muted">${P.b.size} alıcı</span></td><td class="l zin">${urunOz(P.uu,UAD,URK)}</td><td></td><td>${cell(P.u[0])}</td><td>${cell(P.u[1])}</td><td>${cell(P.u[2])}</td><td><b>${ton(P.v)}</b></td><td><span class="muted">${pct(P.v/(v||1))}</span></td><td>${P.it>=0.5?pct(P.it/P.v):'<span class="z">–</span>'}</td><td></td><td>${P.il.size}</td><td>${nf.format(Math.round(P.km/P.v))}</td></tr>`);
      for(const [b,c] of BB) out.push(`<tr class="sub"><td class="l ind2"><span class="muted">→</span> ${esc(SIR[b][1])}</td><td class="l zin" colspan="2">${zinUrun(c.zu,UAD,URK)}</td><td>${cell(c.u[0])}</td><td>${cell(c.u[1])}</td><td>${cell(c.u[2])}</td><td>${ton(c.v)}</td><td><span class="muted">${pct(c.v/(P.v||1))}</span></td><td>${c.it>=0.5?pct(c.it/c.v):'<span class="z">–</span>'}</td><td></td><td>${c.il.size}</td><td>${nf.format(Math.round(c.km/c.v))}</td></tr>`); } }
  document.getElementById("t-atr").innerHTML=`<thead>${head}</thead><tbody>${out.join("")||'<tr><td colspan="12" class="empty">Bu seçimde terminal yok.</td></tr>'}</tbody>`;
}
function lpgTerminaller(){
  const G=new Map(), IT=new Map(), SM=new Map(), DS=new Map(); for(const r of LITH){ const k=r[1]+"|"+r[0]; IT.set(k,(IT.get(k)||0)+r[3]); }
  for(const r of LFS){ const k=r[1]+"|"+r[0]; const m=DS.get(k)||DS.set(k,new Map()).get(k); m.set(r[2],(m.get(r[2])||0)+r[3]); }   // alıcı × terminal → satıcılar
  const TTAD=["Kendi ithalatı","Dağıtıcıdan","Rafineriden","Açılış stoku"];
  const UT=new Map(); for(const f of LF) UT.set(f[5],(UT.get(f[5])||0)+f[6]);
  S.ltrU=S.ltrU.filter(u=>UT.get(u)>=0.5); const US=new Set(S.ltrU);
  msDoldur("ms-ltr",[...UT].filter(x=>x[1]>=0.5).sort((a,b)=>a[0]-b[0]).map(([u,v])=>[u,LPGU[u]||"?",LPGU_R[u]||"#C8641C",v]),S.ltrU);
  for(const f of LF){ if(US.size&&!US.has(f[5])) continue; SM.set(f[0],(SM.get(f[0])||0)+f[6]); const o=G.get(f[1])||G.set(f[1],{v:0,km:0,il:new Set(),c:new Map()}).get(f[1]); o.v+=f[6]; o.km+=(f[7]||0)*f[6]; o.il.add(f[3]);
    const c=o.c.get(f[0])||o.c.set(f[0],{v:0,km:0,il:new Set(),z:new Map()}).get(f[0]); c.v+=f[6]; c.km+=(f[7]||0)*f[6]; c.il.add(f[3]); c.z.set(f[4],(c.z.get(f[4])||0)+f[6]);
    { const rf=(TMETA[f[1]]||[])[6]==="Rafineri", ta=TERM[f[1]][1];
      if(f[4]===0) agacEkle(o,"Kendi ithalatı",f[0],f[5],"Kendi ithalatı · <span class=\"muted\">Deniz Yolu (ithalat)</span>",f[6],0,f[7]||0,f[3]);
      else if(f[4]===3) agacEkle(o,"Açılış stoku",f[0],f[5],'Açılış stoku · <span class="muted">Stoktan satış</span>',f[6],0,f[7]||0,f[3]);
      else if(f[4]===2) agacEkle(o,ta.startsWith("Tüpraş")?"Tüpraş":ta.startsWith("Star")?"Star Rafineri":"Rafineri",f[0],f[5],(rf?esc(ta):"Rafineri")+' · <span class="muted">'+(rf?"Rafineri sahasından yükleme":"Rafineriden sevk")+'</span>',f[6],0,f[7]||0,f[3]);
      else { const sm=[...(DS.get(f[1]+"|"+f[0])||new Map())], TT=sm.reduce((q,x)=>q+x[1],0);
        if(!TT) agacEkle(o,"Dağıtıcı",f[0],f[5],'Dağıtıcıdan · <span class="muted">Terminal içi devir</span>',f[6],0,f[7]||0,f[3]);
        else for(const [x,w] of sm) agacEkle(o,SIR[x][1],f[0],f[5],esc(SIR[x][1])+' · <span class="muted">Terminal içi devir</span>',f[6]*w/TT,0,f[7]||0,f[3]); } } const zu=(c.zu||=new Map()), m=zu.get(f[5])||zu.set(f[5],new Map()).get(f[5]); m.set(f[4],(m.get(f[4])||0)+f[6]); }
  TERM.forEach((x,t)=>{ const m=TMETA[t]||[]; if(!G.has(t)&&(m[11]>0||(x[4]&&m[3]>0))) G.set(t,{v:0,km:0,il:new Set(),c:new Map()}); });
  for(const k of IT.keys()){ const [t,s]=k.split("|").map(Number), o=G.get(t); SM.set(s,(SM.get(s)||0)); if(o&&!o.c.has(s)) o.c.set(s,{v:0,km:0,il:new Set(),z:new Map()}); }
  const nSirL=(t,c)=>[...c].filter(([s,x])=>x.v>=0.5||(IT.get(t+"|"+s)||0)>=0.5).length;
  const dev=t=>{ const m=TMETA[t]||[], o=G.get(t); return m[3]>0&&o?o.v/(m[3]*0.54):null; };
  const tsn=t=>{ const m=TMETA[t]||[]; return m[6]==="Rafineri"?"Rafineri":(/^Bağımsız|tarifeli/.test(m[6]||"")||(m[4]==="Open / third-party"&&!SIR_AD.has(m[7])))?"Bağımsız":"Dağıtıcı terminali"; };
  const tip=t=>{ const m=TMETA[t]||[]; return m[4]==="Open / third-party"?"açık (üçüncü taraf)":/Captive/.test(m[4])?"kendi kullanımı (captive)":""; };
  const kaynakAd=(t,s,tt)=>{ let d=TTAD[tt]||"?";
    if(tt===1){ const sm=[...(DS.get(t+"|"+s)||new Map())].sort((x,y)=>y[1]-x[1]); if(sm.length) d+=": "+sm.slice(0,3).map(([x])=>esc(SIR[x][1])).join(", ")+(sm.length>3?` +${sm.length-3}`:""); }
    if(tt===2&&(TMETA[t]||[])[6]==="Rafineri") d+=" ("+esc(TERM[t][1])+")";
    const md=tt===0?"Deniz Yolu (ithalat)":tt===1?"Terminal içi devir":(TMETA[t]||[])[6]==="Rafineri"?"Rafineri sahasından yükleme":"Rafineriden sevk";
    return d+' · <span class="muted">'+md+'</span>'; };
  const tedL=(t,s,c)=>{ const m=new Map(), add=(n,v)=>m.set(n,(m.get(n)||0)+v);
    for(const [tt,v] of c.z){ if(tt===0) add("Kendi ithalatı",v); else if(tt===2){ const a=TERM[t][1]; add(a.startsWith("Tüpraş")?"Tüpraş":a.startsWith("Star")?"Star Rafineri":"Rafineri",v); }
      else { const sm=[...(DS.get(t+"|"+s)||new Map())], T=sm.reduce((q,x)=>q+x[1],0); if(!T) add("Dağıtıcı",v); else for(const [x,w] of sm) add(SIR[x][1],v*w/T); } }
    return m; };
  const zinLU=(t,s,c)=>{ const it=IT.get(t+"|"+s)||0, zu=new Map([...(c.zu||new Map())].map(([u,m])=>[u,new Map([...m].map(([tt,v])=>[kaynakAd(t,s,tt),v]))]));
    let h=zinUrun(zu,u=>"LPG "+(LPGU[u]||"?").toLocaleLowerCase("tr-TR"),u=>LPGU_R[u]||"#C8641C");
    if(it>=0.5) h+=`<span class="zc muted">bu terminale ithalat ${ton(it)}${c.v<0.5?" · yükleme başka terminalde ya da başka dağıtıcıya":""}</span>`;
    return h; };
  const zinL=(t,s,c)=>{ const a=[...c.z].filter(x=>x[1]>=0.5).sort((x,y)=>y[1]-x[1]); const it=IT.get(t+"|"+s)||0;
    const L=a.map(([tt,v])=>{ let d=TTAD[tt]||"?";
      if(tt===1){ const sm=[...(DS.get(t+"|"+s)||new Map())].sort((x,y)=>y[1]-x[1]); if(sm.length) d+=": "+sm.slice(0,2).map(([x])=>esc(SIR[x][1])).join(", ")+(sm.length>2?` +${sm.length-2}`:""); }
      if(tt===2) d+=(TMETA[t]||[])[6]==="Rafineri"?" ("+esc(TERM[t][1])+")":"";
      if(tt===0&&it>=0.5) d+=" · bu terminale ithalat "+ton(it);
      return `<span class="zc">${d}${a.length>1?` <em>${pct(v/(c.v||1))}</em>`:""}</span>`; });
    if(!a.length&&it>=0.5) L.push(`<span class="zc">yalnız ithalat ${ton(it)} · yükleme başka terminalde ya da başka dağıtıcıya</span>`);
    return L.join(""); };
  if(S.ltrSr>=0&&!SM.has(S.ltrSr)) S.ltrSr=-1; sirOpt(fLTT,new Map([...SM].map(([s,v])=>[s,Math.max(v,0.5)])),S.ltrSr);
  const sr=S.ltrSr, cw=(t,o)=>sr>=0?((o.c.get(sr)||{}).v||0)+(o.c.has(sr)?1e-6:0):o.v;
  const ALL=[...G].map(([t,o])=>({t,o,v:o.v,w:cw(t,o)})).filter(r=>sr<0||r.w>0||(IT.get(r.t+"|"+sr)||0)>=0.5).sort((a,b)=>b.w-a.w||((TMETA[b.t]||[])[11]-(TMETA[a.t]||[])[11]));
  if(S.ltrTm>=0&&!ALL.some(r=>r.t===S.ltrTm)) S.ltrTm=-1;
  trmOpt(fLTS,ALL.map(r=>({t:r.t,v:r.w})),S.ltrTm,"Tüm terminaller");
  const R=S.ltrTm>=0?ALL.filter(r=>r.t===S.ltrTm):ALL, T=R.reduce((a,r)=>a+r.w,0), TI=R.reduce((a,r)=>a+(sr>=0?(IT.get(r.t+"|"+sr)||0):((TMETA[r.t]||[])[11]||0)),0), nAkt=R.filter(r=>r.w>=0.5).length, tek=S.ltrTm>=0?R[0]:null, sad=sr>=0?SIR[sr][1]:null;
  document.getElementById("h-ltr").textContent=(tek?TERM[tek.t][1]:"LPG terminalleri")+(sad?` · ${sad}`:"")+(US.size?` · ${S.ltrU.map(u=>LPGU[u]).join(" + ")}`:"");
  document.getElementById("s-ltr").textContent=tek?`${HUB[TERM[tek.t][2]].ad} · ${nSirL(tek.t,tek.o.c)} şirket · yükleme ${ton(tek.v)} · ithalat ${ton((TMETA[tek.t]||[])[11]||0)}`:`${nAkt} yükleme terminali · ${sad?sad+" ":""}yükleme ${ton(T)} · ithalat ${ton(TI)}`;
  let k=`<div class="kg">`;
  if(tek){ const m=TMETA[tek.t]||[], dv=dev(tek.t), ITS=new Map(); for(const [kk,v] of IT){ const [t,s]=kk.split("|").map(Number); if(t===tek.t) ITS.set(s,{v}); }
    k+=sirKart("Operasyon yapan şirketler · yükleme",new Map([...tek.o.c].filter(([,c])=>c.v>=0.5)),tek.v)
      +(ITS.size?sirKart("İthalat yapan şirketler",ITS,(m[11]||0)).replace("--sp:5","--sp:4"):`<div class="kc" style="--sp:4"><div class="kc-h"><span>İthalat</span></div><p class="kc-not">Bu terminale ithalat yok.</p></div>`)
      +`<div class="kc" style="--sp:3"><div class="kc-h"><span>Künye</span></div><div class="kc-sl" style="gap:5px;font-size:13px"><div>${LIS(tek.t,1)}</div><div class="muted">${tsn(tek.t)}${tip(tek.t)?" · "+tip(tek.t):""}${m[5]?" · "+esc(m[5]):""}</div><div>İşletmeci: <b>${esc(m[7]||islAd(tek.t)||"–")}</b></div><div>Kapasite: <b>${m[3]?nf.format(m[3])+" m³":"–"}</b></div><div>Yıllık devir: <b>${dv!=null&&tek.v>=0.5?nf1.format(dv):"–"}</b></div><div>Bayiye ort.: <b>${tek.v>=0.5?nf.format(Math.round(tek.o.km/tek.v))+" km":"–"}</b> · ${tek.o.il.size} il</div></div></div>`;
  } else {
    const TR=new Map(); for(const r of R) TR.set(tsn(r.t),(TR.get(tsn(r.t))||0)+r.w);
    const TPR={"Dağıtıcı terminali":"#C8641C","Bağımsız":"#0F6E8C","Rafineri":"#8A6238"};
    k+=kompKart("Yükleme · tesis tipi",[...TR].sort((a,b)=>b[1]-a[1]).map(([l,v])=>({l,v,c:TPR[l]||"#8E9AA2",s:`${R.filter(r=>tsn(r.t)===l&&r.w>=0.5).length} terminal`})),{buyuk:ton(T),alt:`${nAkt} terminal${sad?" · "+esc(sad):""}`,span:4});
    if(sr>=0){ const ZM=new Map(); for(const r of R){ const c=r.o.c.get(sr); if(c) for(const [tt,v] of c.z) ZM.set(TTAD[tt],(ZM.get(TTAD[tt])||0)+v); }
      k+=kompKart("Ürün kaynağı",[...ZM].map(([l,v],i)=>({l,v,c:["#C8641C","#0F6E8C","#8A6238"][TTAD.indexOf(l)]})),{T,span:4})
        +siraKart("En çok yükleme",R.map(r=>[TERM[r.t][1],r.w]),{n:8,c:"var(--lpg)",sag:esc(sad),span:4}); }
    else k+=siraKart("İthalat",R.map(r=>[TERM[r.t][1],(TMETA[r.t]||[])[11]||0]),{n:8,c:"var(--lpg)",sag:"terminale giren ithalat",span:4})
      +siraKart("Yıllık devir",R.filter(r=>dev(r.t)!=null).map(r=>[TERM[r.t][1],dev(r.t)]),{n:8,fmt:x=>nf1.format(x)+" devir",c:"#D9821F",sag:"yükleme / (kapasite × 0,54 t/m³)",span:4}); }
  document.getElementById("k-ltr").innerHTML=k+`</div>`;
  const head=`<tr><th class="l">Terminal · lisans / tedarikçi / alıcı</th><th class="l">Tesis · rol · işletmeci / ürün kaynak zinciri</th><th>Kapasite</th><th>İthalat</th><th>Yükleme</th><th>Pay</th><th>Devir / yıl</th><th>İl</th><th>Bayiye km</th></tr>`;
  const out=[], LAD=u=>"LPG "+(LPGU[u]||"?").toLocaleLowerCase("tr-TR"), LRK=u=>LPGU_R[u]||"#C8641C";
  for(const {t,o,v} of R){ const m=TMETA[t]||[], dv=dev(t);
    // yalnız ithalat yapan (bu terminalden yüklemesi olmayan) şirketler "Kendi ithalatı" altında
    for(const [s2,c] of o.c){ const it=IT.get(t+"|"+s2)||0; if(it>=0.5){ const sp=(o.sp||=new Map()), K=sp.get("Kendi ithalatı")||sp.set("Kendi ithalatı",{u:[0,0,0],uu:new Map(),v:0,it:0,km:0,il:new Set(),b:new Map()}).get("Kendi ithalatı"); K.it+=it; const B=K.b.get(s2)||K.b.set(s2,{u:[0,0,0],v:0,it:0,km:0,il:new Set(),zu:new Map()}).get(s2); B.it=it; } }
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(TERM[t][1])}</b>${LIS(t,1)}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)} · ${(o.sp||new Map()).size} tedarikçi · ${nSirL(t,o.c)} alıcı</span></td><td class="l"><span class="muted"><b style="font-weight:600;color:var(--ink-2)">${tsn(t)}</b>${tip(t)?" · "+tip(t):""}${m[5]?"<br>"+esc(m[5]):""}${m[7]?"<br>"+esc(m[7]):""}</span></td><td>${m[3]?nf.format(m[3])+" m³":'<span class="z">–</span>'}</td><td>${cell(m[11]||0)}</td><td><b>${cell(v)}</b></td><td>${v>=0.5?(tek||sr>=0?"%100":pct(v/(T||1))):""}</td><td>${dv!=null&&v>=0.5?`<span class="${dv>30?"dv-y":""}">${nf1.format(dv)}</span>`:'<span class="z">–</span>'}</td><td>${o.il.size||'<span class="z">–</span>'}</td><td>${v>=0.5?nf.format(Math.round(o.km/v)):'<span class="z">–</span>'}</td></tr>`);
    for(const [sn,P] of [...(o.sp||new Map())].sort((a,b)=>b[1].v-a[1].v||b[1].it-a[1].it)){ const BB=[...P.b].filter(([b,x])=>(x.v>=0.5||x.it>=0.5)&&(sr<0||b===sr)).sort((a,b)=>b[1].v-a[1].v||b[1].it-a[1].it); if(!BB.length) continue;
      out.push(`<tr class="sub tsup"><td class="l ind"><span class="sup-e">tedarikçi</span><b>${esc(sn)}</b><br><span class="muted">${BB.length} alıcı</span></td><td class="l zin">${urunOz(P.uu,LAD,LRK)}</td><td></td><td>${cell(P.it)}</td><td><b>${cell(P.v)}</b></td><td><span class="muted">${P.v>=0.5?pct(P.v/(v||1)):""}</span></td><td></td><td>${P.il.size||'<span class="z">–</span>'}</td><td>${P.v>=0.5?nf.format(Math.round(P.km/P.v)):'<span class="z">–</span>'}</td></tr>`);
      for(const [b,c] of BB) out.push(`<tr class="sub"><td class="l ind2"><span class="muted">→</span> ${esc(SIR[b][1])}</td><td class="l zin" colspan="2">${c.v>=0.5?zinUrun(c.zu,LAD,LRK):'<span class="zc muted">yalnız ithalat · yükleme başka terminalde ya da başka dağıtıcıya</span>'}</td><td>${cell(c.it)}</td><td>${cell(c.v)}</td><td><span class="muted">${c.v>=0.5&&P.v>=0.5?pct(c.v/P.v):""}</span></td><td></td><td>${c.il.size||'<span class="z">–</span>'}</td><td>${c.v>=0.5?nf.format(Math.round(c.km/c.v)):'<span class="z">–</span>'}</td></tr>`); } }
  document.getElementById("t-ltr").innerHTML=`<thead>${head}</thead><tbody>${out.join("")||'<tr><td colspan="9" class="empty">Bu seçimde terminal yok.</td></tr>'}</tbody>`;
  // depolar (kullanıcı 20.10.2026 19:17 "depolar eksik"): aktarma (tanker yüklemesi) ve ara depo geçişi
  { const DM=new Map(); const g=(k,ad,il)=>DM.get(k)||DM.set(k,{ad,il,ak:0,ar:0,kap:0}).get(k);
    const LD=D.dep||[], LDI=new Map(LD.map((d,i)=>[d[0],i])), tt=x=>String(x||"").toLocaleLowerCase("tr-TR").replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase("tr-TR"));
    const US2=new Set(S.ltrU);
    for(const f of LF){ if(US2.size&&!US2.has(f[5])) continue; if(S.ltrSr>=0&&f[0]!==S.ltrSr) continue;
      if(f[2]>=0){ const d=LD[f[2]]; g(d[0],`${d[1]} ${tt(d[3])}`,d[2]).ar+=f[6]; }
      if(f[12]&&f[11]>=0){ const y=(D.lyt||[])[f[11]]; if(y){ const o=g(y[0],y[1],y[2]); o.ak+=f[6]; o.kapY=y[4]||0; } } }
    for(const [k,o] of DM){ const d=LD[LDI.get(k)]; o.kap=o.kapY||(d?d[4]/250:0); }
    const R=[...DM.values()].filter(o=>o.ak+o.ar>=0.5).sort((a,b)=>(b.ak+b.ar)-(a.ak+a.ar));
    const el=document.getElementById("t-ltr-dep"); if(el){
      document.getElementById("s-ltr-dep").textContent=`${R.length} depo · aktarma ${ton(R.reduce((a,o)=>a+o.ak,0))} · ara depo ${ton(R.reduce((a,o)=>a+o.ar,0))}`;
      el.innerHTML=`<thead><tr><th class="l">Depo</th><th class="l">İl</th><th>Kapasite</th><th>Aktarma (tanker yüklemesi)</th><th>Ara depo geçişi</th><th>Toplam</th><th>Devir / yıl</th></tr></thead><tbody>`+
        (R.length?R.map(o=>`<tr><td class="l"><b>${esc(o.ad)}</b></td><td class="l">${esc(IL.get(o.il)||"")}</td><td>${o.kap?ton(o.kap):"–"}</td><td>${cell(o.ak)}</td><td>${cell(o.ar)}</td><td><b>${ton(o.ak+o.ar)}</b></td><td>${o.kap?nf1.format((o.ak+o.ar)/o.kap):"–"}</td></tr>`).join(""):`<tr><td colspan="7" class="empty">Bu seçimde depo kullanımı yok.</td></tr>`)+`</tbody>`; } }
}
/* ---------- LPG · akaryakıt sayfalarının karşılıkları (kullanıcı 20.10.2026 18:08): Rafineriler, Tahsis kaynak / terminal bazlı, Taşıma, Bayiler ---------- */
const LSINM=new Map((D.lsin||[]).map(r=>[r[0],r])), LAGI=D.lagi||[];   // LPG dağıtıcı sınıfı (ölçek, iş modeli segmenti) · akaryakıt ağı × LPG tedarikçisi
const lsinK=s=>{ const r=LSINM.get(s); return r?(r[1]?r[1].split(" ")[0]+" sınıfı":"toptan / ithalat"):""; }, lsinSeg=s=>{ const r=LSINM.get(s); return r?String(r[2]).replace(/^\d+\s*/,""):""; };
const LURET=D.luret||[], LIHR=D.lihr||[], LTAS=D.ltas||[], LBAY=D.lbay||[], LDEP=D.dep||[], LYT=D.lyt||[];   // LYT: aktarma (yükleme) depoları [kod, ad, il, ton]
const LSRC=f=>f[4]===0?0:f[4]===2?1:f[4]===1?2:3;          // LF tedarik türü → kaynak sırası
const LSRC_AD=["Kendi ithalatı","Rafineriden","Dağıtıcıdan","Açılış stoku"], LSRC_R=["#2A5591","#0F6E8C","#B7791F","#8A97A3"], LSRC_P=["i","r","d","s"];
const RAFT=new Set(LURET.map(r=>r[0]));
const lsel=(id,opts,val,tum)=>{ const el=document.getElementById(id); el.innerHTML=`<option value="-1">${tum}</option>`+opts.map(([v,a])=>`<option value="${v}">${esc(a)}</option>`).join(""); el.value=String(val); };
const sirOpts=m=>[...m].filter(x=>x[1]>=0.5).sort((a,b)=>b[1]-a[1])   // tonaja göre (kullanıcı 20.10.2026 21:30)
.map(([i,v])=>[i,`${SIR[i][1]} · ${ton(v)}`]);
const urun3=()=>[0,0,0];
// fiziksel dağıtıcı alımında satıcı payları: alıcı × terminal → [[satıcı, pay]]
const LFS_PAY=(()=>{ const m=new Map(); for(const r of LFS){ const k=r[0]+"|"+r[1]; (m.get(k)||m.set(k,[]).get(k)).push([r[2],r[3]]); }
  for(const [k,a] of m){ const T=a.reduce((q,x)=>q+x[1],0)||1; m.set(k,a.map(([s,v])=>[s,v/T])); } return m; })();
Object.assign(S,{lrS:-1,lrR:-1,lkS:-1,ltS:-1,lsS:-1,lsU:-1,lsR:"",lbS:-1,lbIl:null});

/* ortak üst kartlar: toplam çıkış (ürün) + kaynak dağılımı */
function lpgUstKart(R,ad){
  const U=urun3(), K=[0,0,0,0], tr=[new Set(),new Set(),new Set(),new Set()]; let n=new Set();
  for(const f of R){ U[f[5]]+=f[6]; const k=LSRC(f); K[k]+=f[6]; tr[k].add(f[1]); }
  const sat=new Set(); for(const f of R) if(f[4]===1) for(const [s] of (LFS_PAY.get(f[0]+"|"+f[1])||[])) sat.add(s);
  const T=U[0]+U[1]+U[2];
  return `<div class="kg">`+kompKart("Toplam çıkış",[0,1,2].map(u=>({l:"LPG "+LPGU[u].toLocaleLowerCase("tr-TR"),v:U[u],c:LPGU_R[u]})),{buyuk:ton(T),alt:ad,span:5})
    +kompKart("Kaynak dağılımı",[0,1,2,3].map(k=>({l:LSRC_AD[k],v:K[k],c:LSRC_R[k],s:k===2?`${sat.size} satıcı dağıtıcı · ${tr[k].size} terminal`:`${tr[k].size} ${k===1?"rafineri":"terminal"}`})),{sag:"bayi ve tüketiciye yüklenen LPG'nin kaynağı",span:7})+`</div>`;
}

/* ---------------- LPG · Rafineriler ---------------- */
function lpgRafineriler(){
  const LTr=LT.filter(r=>r[1]==="Rafineri"&&RAFT.has(r[3]));
  const alc=new Map(); for(const r of LTr) alc.set(r[0],(alc.get(r[0])||0)+r[4]);
  if(S.lrS>=0&&!alc.has(S.lrS)) S.lrS=-1;
  lsel("f-lr-s",sirOpts(alc),S.lrS,`Tüm alıcılar (${alc.size})`);
  lsel("f-lr-r",LURET.slice().sort((a,b)=>b[1]-a[1]).map(([t,v])=>[t,`${TERM[t][1]} · ${HUB[TERM[t][2]].ad} · ${ton(v)}`]),S.lrR,"Tüm rafineriler");
  const okR=t=>S.lrR<0||t===S.lrR, okS=s=>S.lrS<0||s===S.lrS;
  const P=LURET.filter(r=>okR(r[0])), PT=P.reduce((a,r)=>a+r[1],0);
  const E=LIHR.filter(r=>RAFT.has(r[0])&&okR(r[0])).reduce((a,r)=>a+r[2],0);
  const A=LTr.filter(r=>okR(r[3])&&okS(r[0])), AT=A.reduce((a,r)=>a+r[4],0), ATall=LTr.filter(r=>okR(r[3])).reduce((a,r)=>a+r[4],0);
  const F=LF.filter(f=>RAFT.has(f[1])&&okR(f[1])&&okS(f[0])), U=urun3(); for(const f of F) U[f[5]]+=f[6];
  const RR=["#0F6E8C","#3A8FB0","#7DB6CC","#5E7384"];
  const ad=(S.lrR>=0?TERM[S.lrR][1]:"Tüm rafineriler")+(S.lrS>=0?" – "+SIR[S.lrS][1]:"");
  document.getElementById("h-lraf").textContent=ad+" – LPG";
  document.getElementById("s-lraf").textContent=`${P.length} rafineri · üretim ${ton(PT)}`;
  document.getElementById("l-lraf").textContent="Rafinerilerin "+YIL+" LPG üretimi ve kullanımı: yurt içinde dağıtıcılara satılan (ilk alıcı), ihraç edilen ve rafineri sahasından bayiye / tüketiciye yüklenen LPG. Alıcı seçince o şirketin rafineri alımları görünür.";
  const k=[`<div class="kg">`,
    kompKart("Rafineri LPG üretimi",P.sort((a,b)=>b[1]-a[1]).map((r,i)=>({l:TERM[r[0]][1],v:r[1],c:RR[i%4]})),{buyuk:ton(PT),alt:YIL+" · EPDK",span:5}),
    kompKart("Üretimin kullanımı",[{l:"Yurt içi dağıtıcılara",v:ATall,c:"#0F6E8C",s:`${alc.size} alıcı (ilk alıcı)`},{l:"İhracat",v:E,c:"#7553B5",s:"tesis bazlı tahmin"},{l:"Stok ve rafineri içi",v:Math.max(0,PT-ATall-E),c:"#B7C3CC",s:"üretim − satış − ihracat"}],{T:PT,span:7}),
    kompKart(S.lrS>=0?SIR[S.lrS][1]+" · rafineriden yükleme":"Rafineri sahasından yükleme",[0,1,2].map(u=>({l:"LPG "+LPGU[u].toLocaleLowerCase("tr-TR"),v:U[u],c:LPGU_R[u]})),{buyuk:ton(U[0]+U[1]+U[2]),alt:"bayi ve tüketiciye, ürüne göre",span:5}),
    siraKart(S.lrS>=0?"Rafineriler":"Alıcılar (rafineri alımı)",S.lrS>=0?(()=>{const m=new Map(); for(const r of A) m.set(TERM[r[3]][1],(m.get(TERM[r[3]][1])||0)+r[4]); return [...m];})():[...(()=>{const m=new Map(); for(const r of A) m.set(SIR[r[0]][1],(m.get(SIR[r[0]][1])||0)+r[4]); return m;})()],{span:7,n:6,c:"#0F6E8C",sag:ton(AT)}),`</div>`];
  document.getElementById("k-lraf").innerHTML=k.join("");
  { const Y=LYIL.find(r=>r[0]===String(YIL))||[], p=Y[1]||0, i=Y[2]||0, e=Y[3]||0, sa=Y[4]||0, U3=[0,1,2].map(u=>LF.reduce((a,f)=>a+(f[5]===u?f[6]:0),0)), UT=U3[0]+U3[1]+U3[2]||1;
    document.getElementById("u-lraf").innerHTML=ubalK([[`Üretim · ${YIL}`,p,`${LURET.length} rafineri · arzın ${pct(p/((p+i)||1))}`],[`İthalat · ${YIL}`,i,`arzın ${pct(i/((p+i)||1))}`],[`İhracat · ${YIL}`,e,`arzın ${pct(e/((p+i)||1))}`],
      [`Yurt içi satış · ${YIL}`,sa,`otogaz ${pct(U3[0]/UT)} · tüplü ${pct(U3[1]/UT)} · dökme ${pct(U3[2]/UT)}`]]); }
  // tablo: rafineri → alıcı
  const out=[], head=`<tr><th class="l">Rafineri / alıcı</th><th>Rafineriden alım</th><th>Kendi bayisine / tüketiciye</th><th>Başka dağıtıcıya (toptan)</th><th>Pay</th><th>İl</th><th>Ort. km</th></tr>`;
  for(const [t,pv] of P){
    const ab=new Map(); for(const r of A) if(r[3]===t) ab.set(r[0],(ab.get(r[0])||0)+r[4]);
    const kb=new Map(); for(const f of F) if(f[1]===t&&f[4]===2){ const o=kb.get(f[0])||kb.set(f[0],{v:0,km:0,il:new Set()}).get(f[0]); o.v+=f[6]; o.km+=f[6]*f[7]; o.il.add(f[3]); }
    const gT=[...ab.values()].reduce((a,b)=>a+b,0), gK=[...kb.values()].reduce((a,o)=>a+o.v,0), ex=LIHR.filter(r=>r[0]===t).reduce((a,r)=>a+r[2],0);
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(TERM[t][1])}</b>${LIS(t,1)}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)} · üretim ${ton(pv)} · ihracat ${ton(ex)}</span></td><td><b>${ton(gT)}</b></td><td>${cell(gK)}</td><td>${cell(Math.max(0,gT-gK))}</td><td>${pct(PT?pv/PT:0)}</td><td></td><td></td></tr>`);
    for(const [s,v] of [...ab].sort((a,b)=>b[1]-a[1])){ const o=kb.get(s)||{v:0,km:0,il:new Set()};
      out.push(`<tr class="sub"><td class="l ind">${esc(SIR[s][1])}</td><td>${ton(v)}</td><td>${cell(o.v)}</td><td>${cell(Math.max(0,v-o.v))}</td><td>${pct(gT?v/gT:0)}</td><td>${o.il.size||"–"}</td><td>${o.v?nf.format(o.km/o.v):"–"}</td></tr>`); }
  }
  document.getElementById("t-lraf").innerHTML=`<thead>${head}</thead><tbody>${out.join("")||'<tr><td colspan="7" class="empty">Bu seçimde rafineri alımı yok.</td></tr>'}</tbody>`;
}
for(const [id,k] of [["f-lr-s","lrS"],["f-lr-r","lrR"]]) document.getElementById(id).addEventListener("change",e=>{S[k]=+e.target.value; render();});
document.getElementById("clear-lr").addEventListener("click",()=>{S.lrS=-1; S.lrR=-1; render();});

/* ---------------- LPG · tedarik tahsisi kaynak bazlı ---------------- */
function lpgKaynak(){
  const sv=new Map(); for(const f of LF) sv.set(f[0],(sv.get(f[0])||0)+f[6]);
  if(S.lkS>=0&&!sv.has(S.lkS)) S.lkS=-1;
  lsel("f-lk-s",sirOpts(sv),S.lkS,"Tüm şirketler");
  const R=LF.filter(f=>S.lkS<0||f[0]===S.lkS), ad=S.lkS>=0?SIR[S.lkS][1]:"tüm şirketler";
  document.getElementById("h-lkay").textContent="LPG kaynak dağılımı – "+ad;
  document.getElementById("l-lkay").textContent="Bayiye ve tüketiciye yüklenen LPG'nin kaynağa göre dağılımı: kendi ithalatı, rafineriden alım, başka dağıtıcıdan alım (satıcıya göre) ve açılış stoku. Alımı yapan şirketi seçerek tek şirkete inin.";
  // kaynak grupları: anahtar → {tip, ad, alıcılar}
  const G=new Map(); const g=(k,tp,a)=>G.get(k)||G.set(k,{tp,ad:a,v:0,u:urun3(),al:new Map()}).get(k);
  const ekle=(o,s,t,u,v)=>{ o.v+=v; o.u[u]+=v; const a=o.al.get(s)||o.al.set(s,{v:0,u:urun3(),t:new Set()}).get(s); a.v+=v; a.u[u]+=v; a.t.add(t); };
  for(const f of R){ const k=LSRC(f);
    if(k===0) ekle(g("i","i","Kendi ithalatı"),f[0],f[1],f[5],f[6]);
    else if(k===1) ekle(g("r"+f[1],"r",TERM[f[1]][1]),f[0],f[1],f[5],f[6]);
    else if(k===3) ekle(g("s","s","Açılış stoku"),f[0],f[1],f[5],f[6]);
    else { const sp=LFS_PAY.get(f[0]+"|"+f[1]); if(!sp) ekle(g("d?","d","Dağıtıcı (belirsiz)"),f[0],f[1],f[5],f[6]); else for(const [s,w] of sp) ekle(g("d"+s,"d",s>=0?SIR[s][1]:"?"),f[0],f[1],f[5],f[6]*w); } }
  const T=R.reduce((a,f)=>a+f[6],0), GL=[...G.values()].sort((a,b)=>b.v-a.v);
  document.getElementById("s-lkay").textContent=`${GL.length} kaynak · ${ton(T)}`;
  const raf=GL.filter(o=>o.tp==="r"), dag=GL.filter(o=>o.tp==="d");
  document.getElementById("k-lkay").innerHTML=lpgUstKart(R,S.lkS>=0?"bayi ve tüketiciye":"otogaz + tüplü + dökme")
    +`<div class="kg" style="margin-top:10px">`+siraKart("Rafineri kaynakları",raf.map(o=>[o.ad,o.v]),{span:6,c:"#0F6E8C",sag:ton(raf.reduce((a,o)=>a+o.v,0))})
    +siraKart("Satıcı dağıtıcılar",dag.map(o=>[o.ad,o.v]),{span:6,c:"#B7791F",sag:ton(dag.reduce((a,o)=>a+o.v,0))})+`</div>`;
  const out=[], N=S.lkS>=0?99:8;
  for(const o of GL){ if(o.v<0.5) continue;
    out.push(`<tr class="grp tg"><td class="l"><span class="pill ${o.tp}">${["Kendi ithalatı","Rafineri","Dağıtıcı","Stok"][["i","r","d","s"].indexOf(o.tp)]}</span><b>${esc(o.ad)}</b></td>${o.u.map(x=>`<td>${cell(x)}</td>`).join("")}<td><b>${ton(o.v)}</b></td><td>${pct(T?o.v/T:0)}</td><td>${o.al.size}</td></tr>`);
    const AL=[...o.al].sort((a,b)=>b[1].v-a[1].v);
    for(const [s,a] of AL.slice(0,N)) out.push(`<tr class="sub"><td class="l ind">${esc(SIR[s][1])} <span class="muted">· ${a.t.size} terminal</span></td>${a.u.map(x=>`<td>${cell(x)}</td>`).join("")}<td>${ton(a.v)}</td><td>${pct(o.v?a.v/o.v:0)}</td><td></td></tr>`);
    if(AL.length>N) out.push(`<tr class="sub"><td class="l ind muted">+${AL.length-N} alıcı daha</td><td></td><td></td><td></td><td>${ton(AL.slice(N).reduce((q,x)=>q+x[1].v,0))}</td><td></td><td></td></tr>`);
  }
  document.getElementById("t-lkay").innerHTML=`<thead><tr><th class="l">Kaynak / alıcı</th><th>Otogaz</th><th>Tüplü</th><th>Dökme</th><th>Toplam</th><th>Pay</th><th>Alıcı</th></tr></thead><tbody>${out.join("")||'<tr><td colspan="7" class="empty">Bu seçimde akış yok.</td></tr>'}</tbody>`;
}
document.getElementById("f-lk-s").addEventListener("change",e=>{S.lkS=+e.target.value; render();});
document.getElementById("clear-lk").addEventListener("click",()=>{S.lkS=-1; render();});

/* ---------------- LPG · tedarik tahsisi terminal bazlı ---------------- */
function lpgTahsis(){
  const sv=new Map(); for(const f of LF) sv.set(f[0],(sv.get(f[0])||0)+f[6]);
  if(S.ltS>=0&&!sv.has(S.ltS)) S.ltS=-1;
  lsel("f-lt-s",sirOpts(sv),S.ltS,"Tüm şirketler");
  const R=LF.filter(f=>S.ltS<0||f[0]===S.ltS), T=R.reduce((a,f)=>a+f[6],0);
  const G=new Map(); for(const f of R){ const k=f[0]+"|"+f[1]; const o=G.get(k)||G.set(k,{s:f[0],t:f[1],v:0,u:urun3(),il:new Set(),km:0,dep:0,src:new Map()}).get(k);
    o.v+=f[6]; o.u[f[5]]+=f[6]; o.il.add(f[3]); o.km+=f[6]*f[7]; if(f[2]>=0) o.dep+=f[6];
    const kk=LSRC(f), add=(key,ad,v)=>{ const x=o.src.get(key)||o.src.set(key,{k:kk,ad,v:0,u:urun3(),km:0}).get(key); x.v+=v; x.u[f[5]]+=v; x.km+=v*f[7]; };
    if(kk===2){ const sp=LFS_PAY.get(k); if(sp) for(const [s,w] of sp) add("d"+s,s>=0?SIR[s][1]:"?",f[6]*w); else add("d?","Dağıtıcı",f[6]); }
    else add("k"+kk,kk===1?TERM[f[1]][1]:LSRC_AD[kk],f[6]); }
  const GL=[...G.values()].sort((a,b)=>b.v-a.v), N=S.ltS>=0?999:60;
  document.getElementById("h-ltah").textContent="LPG tedarik tahsisi – "+(S.ltS>=0?SIR[S.ltS][1]:"tüm şirketler");
  document.getElementById("s-ltah").textContent=`${new Set(GL.map(o=>o.t)).size} terminal · ${GL.length} şirket × terminal`;
  document.getElementById("l-ltah").textContent="Alımı yapan şirketi seçin. Her şirket × terminal satırının altında kaynak kırılımı yer alır: kendi ithalatı, rafineriden, satıcı dağıtıcıdan ya da açılış stokundan.";
  document.getElementById("k-ltah").innerHTML=lpgUstKart(R,S.ltS>=0?"bayi ve tüketiciye":"otogaz + tüplü + dökme");
  const um=u=>[0,1,2].filter(i=>u[i]>=0.5).map(i=>`<span class="lu"><i style="background:${LPGU_R[i]}"></i>${LPGU[i]} ${ton(u[i])}</span>`).join("");
  const out=[];
  for(const o of GL.slice(0,N)){
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(SIR[o.s][1])}</b>${lsinK(o.s)?`<br><span class="muted">${lsinK(o.s)} · ${esc(lsinSeg(o.s))}</span>`:""}</td><td class="l"><b>${esc(TERM[o.t][1])}</b>${LIS(o.t,1)}<br><span class="muted">${esc(HUB[TERM[o.t][2]].ad)}</span></td><td class="l">${um(o.u)}</td><td class="l">${o.dep>=0.5?`Depo üzerinden ${pct(o.dep/o.v)}<br>`:""}${o.v-o.dep>=0.5?`Doğrudan ${pct((o.v-o.dep)/o.v)}`:""}</td><td><b>${ton(o.v)}</b></td><td>${pct(T?o.v/T:0)}</td><td>${o.il.size}</td><td>${nf.format(o.km/o.v)} km</td></tr>`);
    for(const x of [...o.src.values()].sort((a,b)=>b.v-a.v)) if(x.v>=0.5)
      out.push(`<tr class="sub"><td></td><td class="l ind"><span class="pill ${LSRC_P[x.k]}">${["Kendi ithalatı","Rafineri","Dağıtıcı","Stok"][x.k]}</span>${esc(x.ad)}</td><td class="l">${um(x.u)}</td><td></td><td>${ton(x.v)}</td><td>${pct(o.v?x.v/o.v:0)}</td><td></td><td>${nf.format(x.km/x.v)} km</td></tr>`);
  }
  if(GL.length>N) out.push(`<tr><td colspan="8" class="empty">+${GL.length-N} şirket × terminal satırı daha (${ton(GL.slice(N).reduce((a,o)=>a+o.v,0))}); bir şirket seçin.</td></tr>`);
  document.getElementById("t-ltah").innerHTML=`<thead><tr><th class="l">Alıcı</th><th class="l">Terminal / kaynak</th><th class="l">Ürün</th><th class="l">Rota</th><th>Miktar</th><th>Pay</th><th>İl</th><th>Ort. km</th></tr></thead><tbody>${out.join("")||'<tr><td colspan="8" class="empty">Bu seçimde akış yok.</td></tr>'}</tbody>`;
}
document.getElementById("f-lt-s").addEventListener("change",e=>{S.ltS=+e.target.value; render();});
document.getElementById("clear-lt").addEventListener("click",()=>{S.ltS=-1; render();});

/* ---------------- LPG · taşıma ---------------- */
const LTAS_AD={"ROAD|PRIMER":["Karayolu · primer","terminal / rafineri → ara depo ya da büyük müşteri","#D9711F"],"ROAD|SEKONDER":["Karayolu · sekonder","depo → bayi / tüketici","#F2AE6F"],"PIPELINE|PRIMER":["Boru hattı","iskele / rafineri → depo (küme içi)","#0F6E8C"],"COASTAL_SEA|PRIMER":["Kabotaj (deniz)","yurt içi gemi seferi (gözlenen)","#2A5591"]};
function lpgTasima(){
  const sv=new Map(); for(const f of LF) if((S.lsU<0||f[5]===S.lsU)&&(!S.lsR||(S.lsR==="p")===(f[2]>=0))) sv.set(f[0],(sv.get(f[0])||0)+f[6]);
  if(S.lsS>=0&&!sv.has(S.lsS)) S.lsS=-1;
  lsel("f-ls-s",sirOpts(sv),S.lsS,"Tüm şirketler");
  lsel("f-ls-u",[0,1,2].map(u=>[u,"LPG "+LPGU[u].toLocaleLowerCase("tr-TR")]),S.lsU,"Tüm ürünler");
  document.getElementById("f-ls-r").value=S.lsR;
  const R=LF.filter(f=>(S.lsS<0||f[0]===S.lsS)&&(S.lsU<0||f[5]===S.lsU)&&(!S.lsR||(S.lsR==="p")===(f[2]>=0)));
  const T=R.reduce((a,f)=>a+f[6],0), TK=R.reduce((a,f)=>a+f[6]*f[7],0);
  const ad=(S.lsS>=0?SIR[S.lsS][1]:"Tüm şirketler")+(S.lsU>=0?" · "+LPGU[S.lsU].toLocaleLowerCase("tr-TR"):"");
  document.getElementById("h-ltas").textContent=ad+" – LPG taşıma";
  document.getElementById("s-ltas").textContent=`${ton(T)} · ort. ${nf.format(TK/(T||1))} km`;
  document.getElementById("l-ltas").textContent="LPG arz tesisinden (ithalat terminali ya da rafineri) çoğu zaman aynı ilçedeki şirket deposuna boru hattıyla aktarılır, tankere oradan yüklenir ve bayiye ya da tüketiciye karayoluyla gider; bir kısmı bir ara depoya uğrar. Üst kartlar piyasa genelinin çok modlu navlun modelidir (LPG veritabanı), şirket ve ürün filtresinden etkilenmez.";
  // piyasa geneli modlar
  const TA=LTAS.reduce((a,r)=>a+r[4],0), TT_=LTAS.reduce((a,r)=>a+r[2],0);
  const mk=LTAS.slice().sort((a,b)=>b[2]-a[2]).map(r=>{ const m=LTAS_AD[r[0]+"|"+r[1]]||[r[0]+" · "+r[1],"","#8A97A3"];
    return `<div class="kpi ltk" style="border-top:3px solid ${m[2]}"><span>${esc(m[0])}</span><b>${ton(r[2])}</b><span>${esc(m[1])}</span><span>ort. ${nf.format(r[3]/(r[2]||1))} km · ${nf.format(r[4]/(r[2]||1))} USD/t${r[5]?` · ${nf.format(r[5])} sefer`:""}</span></div>`; }).join("");
  document.getElementById("k-ltas-m").innerHTML=LTAS.length?mk+`<div class="kpi ltk" style="border-top:3px solid var(--ink)"><span>Toplam navlun · ${YIL}</span><b>${nf2.format(TA/1e6)} M USD</b><span>${nf.format(TA/(LF.reduce((a,f)=>a+f[6],0)||1))} USD / satılan ton</span><span>${ton(TT_)} taşıma (bacak toplamı)</span></div>`:'<p class="muted">Piyasa geneli taşıma özeti için LPG veritabanı gerekir.</p>';
  // şirket akışı kartları
  const dir=R.filter(f=>f[2]<0).reduce((a,f)=>a+f[6],0), dep=T-dir, B=[[0,100],[100,250],[250,500],[500,1e9]], BV=B.map(([a,b])=>R.filter(f=>f[7]>=a&&f[7]<b).reduce((q,f)=>q+f[6],0));
  const DM=new Map(); for(const f of R) if(f[2]>=0){ const d=LDEP[f[2]]; const k=d?`${d[1]} ${String(d[3]||"").toLocaleLowerCase("tr-TR").replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase("tr-TR"))} (${IL.get(d[2])||""})`:"?"; DM.set(k,(DM.get(k)||0)+f[6]); }
  const pk=R.reduce((a,f)=>a+f[6]*(f[9]||0),0), sk=R.reduce((a,f)=>a+f[6]*(f[10]||0),0);
  // depoya aktarma (lpg_tr.db v1.1 güncel): arz tesisinden aynı ilçedeki şirket deposuna boru hattı / karayolu
  const AK=[0,0,0], AKD=new Map(); for(const f of R){ const m=f[12]||0; AK[m]+=f[6]; if(m&&f[11]>=0){ const y=LYT[f[11]], k=y?`${y[1]} (${IL.get(y[2])||""})`:"?"; AKD.set(k,(AKD.get(k)||0)+f[6]); } }
  const akKm=R.filter(f=>f[12]).reduce((a,f)=>a+f[6]*(f[13]||0),0);
  document.getElementById("k-ltas").innerHTML=`<div class="kg">`
    +kompKart("Rota",[{l:"Doğrudan",v:dir,c:"#D9711F",s:"terminalden bayiye / tüketiciye"},{l:"Ara depo üzerinden",v:dep,c:"#8A4512",s:`${DM.size} depo · primer ort. ${nf.format(pk/(dep||1))} km`}],{buyuk:ton(T),alt:`ton-km ${nf.format(TK/1e6)} milyon`,span:4})
    +(LYT.length?kompKart("Depoya aktarma",[{l:"Boru hattıyla",v:AK[1],c:"#0F6E8C",s:"lisanslı hatla aynı ilçedeki depoya"},{l:"Karayoluyla",v:AK[2],c:"#B7791F",s:`kısa aktarma · ort. ${nf.format(akKm/((AK[1]+AK[2])||1))} km`},{l:"Aktarmasız",v:AK[0],c:"#C9D3D8",s:"arz tesisinden doğrudan tanker"}],{sag:"tanker yüklemesinden önce",span:4}):"")
    +kompKart("Mesafe dağılımı",B.map(([a,b],i)=>({l:b>1e8?`${a} km ve üzeri`:`${a}–${b} km`,v:BV[i],c:["#FBE0C8","#F2AE6F","#D9711F","#8A4512"][i]})),{sag:"terminal → il, ton ağırlıklı",span:4})
    +siraKart("Aktarma depoları (tanker yüklemesi)",[...AKD],{span:LYT.length?6:4,c:"#0F6E8C",n:6,sag:ton(AK[1]+AK[2])})+siraKart("Ara depolar",[...DM],{span:LYT.length?6:4,c:"#8A4512",n:6,sag:ton(dep)})+`</div>`;
  // tablo: terminal → şirket
  const G=new Map(); for(const f of R){ const o=G.get(f[1])||G.set(f[1],{v:0,tk:0,pk:0,sk:0,dep:0,ak:0,il:new Set(),c:new Map()}).get(f[1]); if(f[12]) o.ak+=f[6];
    o.v+=f[6]; o.tk+=f[6]*f[7]; o.pk+=f[6]*(f[9]||0); o.sk+=f[6]*(f[10]||0); if(f[2]>=0) o.dep+=f[6]; o.il.add(f[3]);
    const c=o.c.get(f[0])||o.c.set(f[0],{v:0,tk:0,dep:0,ak:0,il:new Set()}).get(f[0]); if(f[12]) c.ak+=f[6]; c.v+=f[6]; c.tk+=f[6]*f[7]; if(f[2]>=0) c.dep+=f[6]; c.il.add(f[3]); }
  const out=[];
  for(const [t,o] of [...G].sort((a,b)=>b[1].v-a[1].v)){
    out.push(`<tr class="grp tg"><td class="l"><b>${esc(TERM[t][1])}</b>${LIS(t,1)} <span class="muted">· ${esc(HUB[TERM[t][2]].ad)}</span></td><td><b>${ton(o.v)}</b></td><td>${pct(T?o.v/T:0)}</td><td>${pct(o.ak/o.v)}</td><td>${pct(o.dep/o.v)}</td><td>${o.il.size}</td><td>${nf.format(o.tk/o.v)}</td><td>${o.dep>=0.5?nf.format(o.pk/o.dep):"–"}</td><td>${nf.format(o.tk/1e6)}</td></tr>`);
    const C=[...o.c].sort((a,b)=>b[1].v-a[1].v), N=S.lsS>=0?99:5;
    for(const [s,c] of C.slice(0,N)) out.push(`<tr class="sub"><td class="l ind">${esc(SIR[s][1])}</td><td>${ton(c.v)}</td><td>${pct(o.v?c.v/o.v:0)}</td><td>${pct(c.ak/c.v)}</td><td>${pct(c.dep/c.v)}</td><td>${c.il.size}</td><td>${nf.format(c.tk/c.v)}</td><td></td><td>${nf.format(c.tk/1e6)}</td></tr>`);
    if(C.length>N) out.push(`<tr class="sub"><td class="l ind muted">+${C.length-N} şirket daha</td><td>${ton(C.slice(N).reduce((q,x)=>q+x[1].v,0))}</td><td colspan="7"></td></tr>`);
  }
  document.getElementById("t-ltas").innerHTML=`<thead><tr><th class="l">Arz tesisi / şirket</th><th>Miktar</th><th>Pay</th><th>Depoya aktarma</th><th>Ara depo üzerinden</th><th>İl</th><th>Ort. km</th><th>Primer km</th><th>Ton-km (M)</th></tr></thead><tbody>${out.join("")||'<tr><td colspan="9" class="empty">Bu seçimde akış yok.</td></tr>'}</tbody>`;
  lpgZincir(R);
}
const LILC=new Map(); for(const [s_,i,c,v,la,lo] of (D.lilc||[])){ const k=s_+"|"+i; (LILC.get(k)||LILC.set(k,[]).get(k)).push([c,v,la,lo]); }
const LZPM=new Map(); for(const [s_,i,u_,k,x,p] of (D.lzp||[])){ const kk=`${s_}|${i}|${u_}|${k}`; (LZPM.get(kk)||LZPM.set(kk,[]).get(kk)).push([x,p]); }
const ILLL=new Map(D.il.map(r=>[r[0],[r[2],r[3]]])), TKOD=new Map(TERM.map((t,i)=>[t[0],i])), DKOD=new Map(LDEP.map((d,i)=>[d[0],i]));
const LZC=["#0F6E8C","#C2410C","#7A3E9D","#2F855A","#B7791F","#BE185D","#1D4ED8","#0E7490","#9A3412","#4D7C0F"];
for(const v of LILC.values()) v.sort((a,b)=>b[1]-a[1]);
function lpgZincir(R){
  const el=document.getElementById("ltas-zincir"); if(!el) return;
  if(S.lsS<0){ el.innerHTML=`<h3 class="lsub">Tedarik zinciri</h3><p class="muted lz-bos">Bir şirket seçin: hangi ithalat terminalinden ya da rafineriden hangi ana ve ara depolara ne kadar LPG taşıdığı ve depoların hangi il ve ilçeleri beslediği burada görünür.</p>`; return; }
  const tc=x=>String(x||"").toLocaleLowerCase("tr-TR").replace(/(^|\s)\S/g,m=>m.toLocaleUpperCase("tr-TR"));
  const RF=t=>(TMETA[t]||[])[6]==="Rafineri", lisL=t=>RF(t)?"":LIS(t,1);
  const arzAd=(t,b)=>`${b?"<b>":""}${esc(TERM[t][1])}${b?"</b>":""}${lisL(t)} <span class="muted">· ${esc(HUB[TERM[t][2]].ad)}</span>`;
  const anaAd=(k,b)=>{ const y=LYT[k]; return y?`${b?"<b>":""}${esc(y[1])}${b?"</b>":""} <span class="muted">· ${esc(IL.get(y[2])||"")}</span>`:"?"; };
  const araAd=(k,b)=>{ const d=LDEP[k]; return d?`${b?"<b>":""}${esc(d[1])} ${esc(tc(d[3]))}${b?"</b>":""} <span class="muted">· ${esc(IL.get(d[2])||"")}</span>`:"?"; };
  const MOD=["","boru hattı","karayolu"], T=R.reduce((a,f)=>a+f[6],0)||1;
  // 1) arz tesisi → ana depo → ara depo
  const A=new Map();
  for(const f of R){ const o=A.get(f[1])||A.set(f[1],{v:0,il:new Set(),k:new Map()}).get(f[1]); o.v+=f[6]; o.il.add(f[3]);
    const ana=f[12]&&f[11]>=0?f[11]:-1, key=ana+"|"+f[2]; const x=o.k.get(key)||o.k.set(key,{ana,ara:f[2],m:f[12]||0,v:0,il:new Set()}).get(key); x.v+=f[6]; x.il.add(f[3]); }
  let h1="";
  for(const [t,o] of [...A].sort((a,b)=>b[1].v-a[1].v)){
    h1+=`<tr class="grp tg"><td class="l" colspan="2"><span class="lz-tip">${RF(t)?"rafineri":"ithalat terminali"}</span><b>${esc(TERM[t][1])}</b>${lisL(t)}<br><span class="muted">${esc(HUB[TERM[t][2]].ad)}</span></td><td><b>${ton(o.v)}</b></td><td>${pct(o.v/T)}</td><td>${o.il.size}</td></tr>`;
    for(const x of [...o.k.values()].sort((a,b)=>b.v-a.v))
      h1+=`<tr class="sub"><td class="l ind">${x.ana>=0?anaAd(x.ana)+`<br><span class="muted">${MOD[x.m]} aktarması</span>`:`<span class="muted">arz tesisinden tanker</span>`}</td><td class="l">${x.ara>=0?araAd(x.ara):`<span class="muted">ara depo yok · doğrudan bayi / tüketici</span>`}</td><td>${ton(x.v)}</td><td>${pct(x.v/o.v)}</td><td>${x.il.size}</td></tr>`;
  }
  // 2) son yükleme noktası (ara depo > ana depo > arz tesisi) → il → ilçe (lpg_tr.db v1.4 ilçe payları; yoksa otogaz istasyon payı)
  const LK=D.lilk||[];
  const dag=(f,k)=>{ const P=LZPM.get(`${f[0]}|${f[3]}|${f[5]}|${k}`); if(P) return P.map(([x,p])=>[x,LK[x][1],LK[x][2],LK[x][3],f[6]*p]);
    if(LK.length||f[5]!==0) return null; const L=LILC.get(f[0]+"|"+f[3]); if(!L) return null; const LT=L.reduce((a,r)=>a+r[1],0); return LT?L.map(([c,v,la,lo])=>["L"+f[3]+c,c,la,lo,f[6]*v/LT]):null; };
  const B=new Map();
  for(const f of R){ const k=f[2]>=0?"r"+f[2]:(f[12]&&f[11]>=0?"a"+f[11]:"t"+f[1]);
    const o=B.get(k)||B.set(k,{v:0,il:new Map()}).get(k); o.v+=f[6]; const i=o.il.get(f[3])||o.il.set(f[3],{v:0,g:0,u:[0,0,0],z:new Map()}).get(f[3]); i.v+=f[6];
    const P=dag(f,k); if(!P){ i.g+=f[6]; continue; } i.u[f[5]]+=f[6];
    for(const [x,c,la,lo,q] of P){ const z=i.z.get(x)||i.z.set(x,{c,la,lo,v:0}).get(x); z.v+=q; } }
  const TIP={r:"ara depo",a:"ana depo",t:"arz tesisi"};   // arz tesisi: tanker doğrudan ithalat terminalinden / rafineriden yüklenir
  let h2="", nIlce=new Set();
  for(const [k,o] of [...B].sort((a,b)=>b[1].v-a[1].v)){
    const tp=k[0], id=+k.slice(1), ad=tp==="r"?araAd(id,1):tp==="a"?anaAd(id,1):arzAd(id,1);
    h2+=`<tr class="grp tg"><td class="l"><span class="lz-tip">${tp==="t"&&RF(id)?"rafineri":TIP[tp]}</span>${ad}</td><td><b>${ton(o.v)}</b></td><td>${pct(o.v/T)}</td><td>${o.il.size} il</td><td class="l"></td></tr>`;
    for(const [i,x] of [...o.il].sort((a,b)=>b[1].v-a[1].v)){
      const P=[...x.z.values()].filter(z=>z.v>=0.5).sort((a,b)=>b.v-a.v), N=10; P.forEach(z=>nIlce.add(i+"|"+z.c));
      let ic=P.slice(0,N).map(z=>`<b>${esc(z.c)}</b> ${ton(z.v)}`).join(" · ")+(P.length>N?` · <span class="muted">+${P.length-N} ilçe ${ton(P.slice(N).reduce((a,z)=>a+z.v,0))}</span>`:"");
      if(x.g>=0.5) ic+=(ic?" · ":"")+`<span class="muted">il geneli ${ton(x.g)}${x.u[0]+x.u[1]<0.5?"":" (dökme)"}</span>`;
      const ud=[x.u[0]>=0.5?"otogaz "+ton(x.u[0]):"",x.u[1]>=0.5?"tüplü "+ton(x.u[1]):""].filter(Boolean).join("<br>");
      h2+=`<tr class="sub"><td class="l ind">${esc(IL.get(i)||"?")}</td><td>${ton(x.v)}</td><td>${pct(x.v/o.v)}</td><td>${ud||"–"}</td><td class="l lz-ilc">${ic}</td></tr>`;
    }
  }
  // harita (kullanıcı 21.10.2026 12:15 "harita üzerinde görelim")
  if(S.lzS!==S.lsS){ S.lzS=S.lsS; S.lzF=null; }
  const yer=(tp,id)=>{ if(tp==="t"){ const h=HUB[TERM[id][2]]; return [h.lat,h.lon]; }
    if(tp==="r"){ const d=LDEP[id]; return d&&d[8]!=null?[d[8],d[9]]:ILLL.get(d?d[2]:0); }
    const y=LYT[id]; if(!y) return null; if(TKOD.has(y[0])){ const h=HUB[TERM[TKOD.get(y[0])][2]]; return [h.lat,h.lon]; }
    if(DKOD.has(y[0])){ const d=LDEP[DKOD.get(y[0])]; if(d[8]!=null) return [d[8],d[9]]; } return ILLL.get(y[2]); };
  const PK=[...B].sort((a,b)=>b[1].v-a[1].v).map(([k])=>k), RENK=new Map(PK.map((k,i)=>[k,LZC[i]||"#94A3B8"]));
  if(S.lzF&&!B.has(S.lzF)) S.lzF=null;
  const adK=k=>{ const tp=k[0], id=+k.slice(1); return tp==="r"?(LDEP[id]?LDEP[id][1]+" "+tc(LDEP[id][3]):"?"):tp==="a"?(LYT[id]?LYT[id][1]:"?"):TERM[id][1]; };
  // kenarlar: arz → ana → ara (ton), nokta → ilçe / il
  const E1=new Map(), add=(m,k,v)=>m.set(k,(m.get(k)||0)+v);
  const ILC=new Map(), ILG=new Map(), ILV=new Map();   // ilçe: k|il|ad → {la,lo,v,by:Map}; il geneli: k|il → v
  for(const f of R){ const ana=f[12]&&f[11]>=0?f[11]:-1, son=f[2]>=0?"r"+f[2]:(ana>=0?"a"+ana:"t"+f[1]);
    if(S.lzF&&son!==S.lzF) continue;
    add(ILV,f[3],f[6]);
    if(ana>=0) add(E1,"t"+f[1]+">a"+ana,f[6]);
    if(f[2]>=0) add(E1,(ana>=0?"a"+ana:"t"+f[1])+">r"+f[2],f[6]); }
  for(const [k,o] of B){ if(S.lzF&&k!==S.lzF) continue;
    for(const [i,x] of o.il){ if(x.g>=0.5) add(ILG,k+"|"+i,x.g);
      for(const [kk,z0] of x.z){ if(z0.la==null||z0.v<0.5) continue; const z=ILC.get(kk)||ILC.set(kk,{la:z0.la,lo:z0.lo,c:z0.c,i,v:0,by:new Map()}).get(kk); z.v+=z0.v; add(z.by,k,z0.v); } } }
  const VB=svgM.getAttribute("viewBox"), W=+VB.split(/\s+/)[2], u=W/1000;
  const mxIl=Math.max(1,...ILV.values()), mxE=Math.max(1,...E1.values()), mxZ=Math.max(1,...[...ILC.values()].map(z=>z.v)), mxG=Math.max(1,...ILG.values());
  let m="";
  for(const [n,d] of Object.entries(GEO.p)){ const v=ILV.get(+n)||0, f=v>=0.5?`rgba(217,113,31,${(0.12+0.5*Math.sqrt(v/mxIl)).toFixed(2)})`:"var(--c0)";
    m+=`<path class="il" d="${d}" fill="${f}"><title>${esc(IL.get(+n)||"")}${v>=0.5?": "+ton(v):""}</title></path>`; }
  // nokta → ilçe çizgileri
  let ln="", dt="";
  for(const z of ILC.values()){ const [x2,y2]=pj(z.la,z.lo); const dom=[...z.by].sort((a,b)=>b[1]-a[1])[0][0];
    for(const [k,q] of z.by){ const p0=yer(k[0],+k.slice(1)); if(!p0) continue; const [x1,y1]=pj(p0[0],p0[1]);
      ln+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${RENK.get(k)}" stroke-opacity="${S.lzF?0.55:0.2}" stroke-width="${(0.5*u+1.6*u*Math.sqrt(q/mxZ)).toFixed(2)}"/>`; }
    dt+=`<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(1.3*u+5*u*Math.sqrt(z.v/mxZ)).toFixed(2)}" fill="${RENK.get(dom)}" fill-opacity=".85" stroke="#fff" stroke-width="${(0.4*u).toFixed(2)}"><title>${esc(z.c)} (${esc(IL.get(z.i)||"")}) · ${ton(z.v)}${z.by.size>1?"\n"+[...z.by].sort((a,b)=>b[1]-a[1]).map(([k,q])=>adK(k)+": "+ton(q)).join("\n"):" · "+adK(dom)}</title></circle>`; }
  for(const [kk,g] of ILG){ const [k,i]=kk.split("|"), p0=yer(k[0],+k.slice(1)), c=ILLL.get(+i); if(!p0||!c) continue; const [x1,y1]=pj(p0[0],p0[1]), [x2,y2]=pj(c[0],c[1]);
    ln+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${RENK.get(k)}" stroke-opacity=".3" stroke-dasharray="${2*u} ${2*u}" stroke-width="${(0.7*u).toFixed(2)}"/>`;
    dt+=`<rect x="${(x2-2.6*u).toFixed(1)}" y="${(y2-2.6*u).toFixed(1)}" width="${(5.2*u).toFixed(1)}" height="${(5.2*u).toFixed(1)}" fill="#fff" stroke="${RENK.get(k)}" stroke-width="${(1.2*u).toFixed(2)}"><title>${esc(IL.get(+i)||"")} il geneli (dökme; sanayi tüketicisinin konumu yok) · ${ton(g)} · ${esc(adK(k))}</title></rect>`; }
  // arz → ana → ara kalın çizgiler
  let e1="";
  for(const [kk,v] of E1){ const [a,b]=kk.split(">"), p0=yer(a[0],+a.slice(1)), p1=yer(b[0],+b.slice(1)); if(!p0||!p1) continue; const [x1,y1]=pj(p0[0],p0[1]), [x2,y2]=pj(p1[0],p1[1]); if(Math.hypot(x2-x1,y2-y1)<2*u) continue;
    e1+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${b[0]==="a"?"#0F6E8C":"#5B3A1E"}" stroke-opacity=".8" stroke-linecap="round" stroke-width="${(1.2*u+6*u*Math.sqrt(v/mxE)).toFixed(2)}"><title>${esc(adK(a))} → ${esc(adK(b))}: ${ton(v)}${b[0]==="a"?" (aktarma)":""}</title></line>`; }
  // düğümler: arz tesisleri (kare), ana depo (elmas), ara depo (daire)
  let nd="", lb="";
  const arzlar=new Map(); for(const f of R){ const ana=f[12]&&f[11]>=0?f[11]:-1, son=f[2]>=0?"r"+f[2]:(ana>=0?"a"+ana:"t"+f[1]); if(S.lzF&&son!==S.lzF) continue; add(arzlar,f[1],f[6]); }
  const yerli=new Set();
  for(const [t,v] of arzlar){ const [x,y]=pj(HUB[TERM[t][2]].lat,HUB[TERM[t][2]].lon), r=3.4*u, rf=RF(t), k="t"+t, cl=B.has(k)?RENK.get(k):"#15222C";
    nd+=`<rect class="lzn" data-k="${k}" x="${(x-r).toFixed(1)}" y="${(y-r).toFixed(1)}" width="${(2*r).toFixed(1)}" height="${(2*r).toFixed(1)}" ${rf?`transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})"`:""} fill="${cl}" stroke="#fff" stroke-width="${(0.8*u).toFixed(2)}"><title>${rf?"Rafineri":"İthalat terminali"}: ${esc(TERM[t][1])} · ${esc(HUB[TERM[t][2]].ad)} · ${ton(v)}</title></rect>`;
    const yk=Math.round(x/(12*u))+"|"+Math.round(y/(12*u)); if(!yerli.has(yk)){ yerli.add(yk); lb+=`<text x="${(x+5*u).toFixed(1)}" y="${(y-4*u).toFixed(1)}" style="font-size:${(9*u).toFixed(1)}px">${esc(HUB[TERM[t][2]].ad.split(" (")[0])}</text>`; } }
  for(const k of PK){ if(k[0]==="t") continue; if(S.lzF&&k!==S.lzF&&!(E1.has(k+">"+S.lzF))) { if(S.lzF) continue; } const p0=yer(k[0],+k.slice(1)); if(!p0) continue; const [x,y]=pj(p0[0],p0[1]), r=(k[0]==="r"?3.8:3)*u;
    nd+=k[0]==="r"?`<circle class="lzn" data-k="${k}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${RENK.get(k)}" stroke="#fff" stroke-width="${(1*u).toFixed(2)}"><title>Ara depo: ${esc(adK(k))} · ${ton(B.get(k).v)}</title></circle>`
      :`<rect class="lzn" data-k="${k}" x="${(x-r).toFixed(1)}" y="${(y-r).toFixed(1)}" width="${(2*r).toFixed(1)}" height="${(2*r).toFixed(1)}" transform="rotate(45 ${x.toFixed(1)} ${y.toFixed(1)})" fill="${RENK.get(k)}" stroke="#fff" stroke-width="${(1*u).toFixed(2)}"><title>Ana depo (aktarma): ${esc(adK(k))} · ${ton(B.get(k).v)}</title></rect>`;
    const yk=Math.round(x/(12*u))+"|"+Math.round(y/(12*u)); if(k[0]==="r"&&!yerli.has(yk)){ yerli.add(yk); lb+=`<text x="${(x+5*u).toFixed(1)}" y="${(y+3*u).toFixed(1)}" style="font-size:${(9*u).toFixed(1)}px">${esc(tc(LDEP[+k.slice(1)][3]))}</text>`; } }
  const pan=PK.map(k=>{ const tp=k[0], o=B.get(k); return `<button type="button" data-k="${k}" aria-pressed="${S.lzF===k}"><i style="background:${RENK.get(k)}${tp==="t"?";border-radius:2px":""}"></i><span>${esc(adK(k))}<small>${TIP[tp]==="arz tesisi"?(RF(+k.slice(1))?"rafineri":"ithalat terminali")+" · doğrudan tanker":TIP[tp]} · ${o.il.size} il</small></span><b>${ton(o.v)}</b></button>`; }).join("");
  const harita=`<h3 class="lsub">Tedarik zinciri haritası${S.lzF?" · "+esc(adK(S.lzF)):""}</h3>
    <div class="lz-hg"><div class="mapbox"><svg id="lz-map" viewBox="${VB}" role="img" aria-label="${esc(SIR[S.lsS][1])} LPG tedarik zinciri haritası: arz tesisleri, depolar ve beslenen ilçeler">${m}<g>${ln}</g><g>${e1}</g><g>${dt}</g><g>${nd}</g><g>${lb}</g></svg></div>
    <div class="lz-pan" role="group" aria-label="Yükleme noktaları"><p class="muted" style="font-size:12px;margin:0 0 4px">Son yükleme noktaları · bir noktaya tıklayın, yalnız onun beslediği yerler görünsün.</p>${S.lzF?`<button type="button" data-k=""><i style="background:var(--line)"></i><span>Tümünü göster</span><b></b></button>`:""}${pan}</div></div>
    <div class="lz-leg"><span><svg viewBox="0 0 18 12"><rect x="5" y="2" width="8" height="8" fill="#15222C"/></svg>ithalat terminali</span><span><svg viewBox="0 0 18 12"><rect x="5" y="2" width="8" height="8" fill="#15222C" transform="rotate(45 9 6)"/></svg>rafineri / ana depo (aktarma)</span><span><svg viewBox="0 0 18 12"><circle cx="9" cy="6" r="4.5" fill="#5B3A1E"/></svg>ara depo</span><span><svg viewBox="0 0 18 12"><line x1="1" y1="6" x2="17" y2="6" stroke="#0F6E8C" stroke-width="3"/></svg>aktarma</span><span><svg viewBox="0 0 18 12"><line x1="1" y1="6" x2="17" y2="6" stroke="#5B3A1E" stroke-width="3"/></svg>ara depoya taşıma (kalınlık: ton)</span><span><svg viewBox="0 0 18 12"><circle cx="9" cy="6" r="4" fill="#C2410C"/></svg>ilçe (otogaz + tüplü, <span class="tag">tahmin</span>)</span><span><svg viewBox="0 0 18 12"><rect x="5" y="2" width="8" height="8" fill="#fff" stroke="#C2410C" stroke-width="1.6"/></svg>il geneli (dökme)</span><span>Renk: ürünü yükleyen nokta · il dolgusu: şirketin il hacmi</span></div>`;
  el.innerHTML=harita+`<h3 class="lsub">Tedarik zinciri · arz tesisinden depolara</h3>
    <div class="scroll"><table id="t-lz1"><thead><tr><th class="l">Arz tesisi / ana depo (tanker yükleme)</th><th class="l">Ara depo</th><th>Miktar</th><th>Pay</th><th>Beslenen il</th></tr></thead><tbody>${h1}</tbody></table></div>
    <h3 class="lsub">Depoların beslediği il ve ilçeler</h3>
    <p class="muted" style="font-size:12px;margin:-4px 0 8px">${B.size} yükleme noktası · ${new Set(R.map(f=>f[3])).size} il · ${nIlce.size} ilçe. Pay sütunu: depo satırında şirket toplamına, il satırında deponun toplamına göre.</p>
    <div class="scroll"><table id="t-lz2"><thead><tr><th class="l">Son yükleme noktası / il</th><th>Miktar</th><th>Pay</th><th>İlçeye dağıtılan</th><th class="l">İlçeler <span class="tag">tahmin</span></th></tr></thead><tbody>${h2}</tbody></table></div>`;
  el.querySelectorAll("[data-k]").forEach(e=>e.addEventListener("click",()=>{ const k=e.dataset.k||null; S.lzF=S.lzF===k?null:k; lpgZincir(R); }));
}
for(const [id,k] of [["f-ls-s","lsS"],["f-ls-u","lsU"]]) document.getElementById(id).addEventListener("change",e=>{S[k]=+e.target.value; render();});
document.getElementById("f-ls-r").addEventListener("change",e=>{S.lsR=e.target.value; render();});
document.getElementById("clear-ls").addEventListener("click",()=>{S.lsS=-1; S.lsU=-1; S.lsR=""; render();});

/* ---------------- LPG · bayiler (otogaz bayi lisansları, 2025 sonu dağıtıcısı) ---------------- */
const LB_IL=new Map(), LB_S=new Map(); for(const [i,s,n] of LBAY){ LB_IL.set(i,(LB_IL.get(i)||0)+n); const m=LB_S.get(s)||LB_S.set(s,new Map()).get(s); m.set(i,(m.get(i)||0)+n); }
const LB_OT=new Map(); for(const f of LF) if(f[5]===0){ const k=f[0]+"|"+f[3]; LB_OT.set(k,(LB_OT.get(k)||0)+f[6]); }
const lbYol=new Map();
(()=>{ const svg=document.getElementById("lbay-map"); if(!svg) return; svg.setAttribute("viewBox",svgM.getAttribute("viewBox"));
  for(const [n,d] of Object.entries(GEO.p)){ const e=document.createElementNS(NS,"path"); e.setAttribute("d",d); e.setAttribute("class","il"); e.dataset.il=n; svg.appendChild(e); lbYol.set(+n,e); }
  svg.addEventListener("click",e=>{ const p=e.target.closest("[data-il]"); if(p){ const i=+p.dataset.il; S.lbIl=S.lbIl===i?null:i; render(); } }); })();
function lpgBayiler(){
  const tot=new Map([...LB_S].map(([s,m])=>[s,[...m.values()].reduce((a,b)=>a+b,0)]));
  if(S.lbS>=0&&!tot.has(S.lbS)) S.lbS=-1;
  lsel("f-lb-s",[...tot].sort((a,b)=>b[1]-a[1]).map(([s,n])=>[s,`${SIR[s][1]} · ${nf.format(n)} bayi`]),S.lbS,`Tüm dağıtıcılar (${tot.size})`);
  const tum=S.lbS<0, sel=tum?LB_IL:(LB_S.get(S.lbS)||new Map()), UL=[...LB_IL.values()].reduce((a,b)=>a+b,0), ST=[...sel.values()].reduce((a,b)=>a+b,0);
  let bins=[]; if(tum){ const v=[...LB_IL.values()].filter(x=>x>0).sort((a,b)=>a-b); bins=[1/3,2/3].map(q=>v[Math.floor(q*(v.length-1))]||0); }
  for(const [i,e] of lbYol){ const n=sel.get(i)||0; let f="var(--c0)";
    if(n>0){ if(tum){ let k=1; for(const b of bins) if(n>=b) k++; f=`var(--s${k})`; } else { const p=n/(LB_IL.get(i)||1); let k=1; for(const b of BAY_BIN) if(p>=b) k++; f=`var(--s${k})`; } }
    e.setAttribute("fill",f); e.classList.toggle("sel",S.lbIl===i); }
  const ad=tum?"tüm dağıtıcılar":SIR[S.lbS][1];
  document.getElementById("h-lbay").textContent=tum?"Otogaz bayileri: il dağılımı":`${ad}: illerdeki otogaz bayi payı`;
  document.getElementById("l-lbay").textContent=tum?`Her il, 2025 sonunda faal otogaz bayisi sayısına göre renklendirildi (toplam ${nf.format(UL)} bayi). Bir dağıtıcı seçince harita, dağıtıcının her ildeki bayi payını gösterir.`
    :`${ad} ${sel.size} ilde ${nf.format(ST)} otogaz bayisiyle temsil ediliyor; ülkedeki bayilerin ${pct(ST/(UL||1))}'i. Renk: ildeki bayilerin dağıtıcıya ait payı.`;
  document.getElementById("lbay-leg").innerHTML=tum?`<span><i style="background:var(--c0)"></i>yok</span>`+[0,1,2].map(k=>`<span><i style="background:var(--s${k+1})"></i>${k===0?nf.format(bins[0])+"'ten az":k===1?nf.format(bins[0])+"–"+nf.format(bins[1]):nf.format(bins[1])+" ve üzeri"}</span>`).join("")+`<span>· il başına bayi</span>`
    :`<span><i style="background:var(--c0)"></i>yok</span><span><i style="background:var(--s1)"></i>%10'dan az</span><span><i style="background:var(--s2)"></i>%10–20</span><span><i style="background:var(--s3)"></i>%20 ve üzeri</span><span>· ildeki bayi payı</span>`;
  // il sıralaması
  const otg=(s,i)=>s<0?[...LB_S.keys()].reduce((a,x)=>a+(LB_OT.get(x+"|"+i)||0),0):(LB_OT.get(s+"|"+i)||0);
  const IR=[...sel].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]), M=IR.length?IR[0][1]:1, ilk5=IR.slice(0,5).reduce((a,x)=>a+x[1],0);
  document.getElementById("lbay-il").innerHTML=`<div class="ip-h"><b>İl sıralaması</b><span>${tum?"il başına otogaz bayisi":"dağıtıcının il başına bayisi"}</span></div><div class="ip-oz"><div><b>${IR.length}</b><span>il</span></div><div><b>${pct(ST?ilk5/ST:0)}</b><span>ilk 5 ilin payı</span></div></div>`
    +`<ol class="ip-l">${IR.slice(0,8).map(([i,n],k)=>{ const o=otg(S.lbS,i); return `<li><button type="button" data-il="${i}" class="${S.lbIl===i?"on":""}"><span class="ip-n">${k+1}</span><span class="ip-ad">${esc(IL.get(i))}<small>${tum?"":"ilde "+pct(n/(LB_IL.get(i)||1))+" · "}otogaz ${ton(o)} · ${nf.format(o/n)} t/bayi</small></span><b>${nf.format(n)}</b><span class="ip-b"><i style="width:${(n/M*100).toFixed(1)}%"></i></span></button></li>`; }).join("")}</ol>`
    +(IR.length>8?`<p class="ip-f">+${IR.length-8} il daha · ${nf.format(IR.slice(8).reduce((a,x)=>a+x[1],0))}</p>`:"");
  // tablo
  let head, rows;
  if(tum&&S.lbIl==null){ head=`<tr><th class="l">Dağıtıcı</th><th class="l">Sınıf · iş modeli</th><th>Bayi</th><th>Pay</th><th>İl</th><th>Otogaz satışı</th><th>t / bayi</th></tr>`;
    rows=[...tot].sort((a,b)=>b[1]-a[1]).map(([s,n])=>{ const o=[...LB_S.get(s).keys()].reduce((a,i)=>a+(LB_OT.get(s+"|"+i)||0),0);
      return `<tr><td class="l"><button type="button" class="lnk" data-lbs="${s}">${esc(SIR[s][1])}</button></td><td class="l"><span class="muted">${lsinK(s)}${lsinSeg(s)?" · "+esc(lsinSeg(s)):""}</span></td><td><b>${nf.format(n)}</b></td><td>${pct(n/UL)}</td><td>${LB_S.get(s).size}</td><td>${cell(o)}</td><td>${o?nf.format(o/n):"–"}</td></tr>`; }); }
  else if(S.lbIl!=null){ const i=S.lbIl; head=`<tr><th class="l">${esc(IL.get(i))} · dağıtıcı</th><th>Bayi</th><th>İldeki pay</th><th>Otogaz satışı</th><th>t / bayi</th></tr>`;
    rows=[...LB_S].map(([s,m])=>[s,m.get(i)||0]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).map(([s,n])=>{ const o=LB_OT.get(s+"|"+i)||0;
      return `<tr${s===S.lbS?' class="tg"':""}><td class="l">${esc(SIR[s][1])}</td><td><b>${nf.format(n)}</b></td><td>${pct(n/(LB_IL.get(i)||1))}</td><td>${cell(o)}</td><td>${o?nf.format(o/n):"–"}</td></tr>`; }); }
  else { head=`<tr><th class="l">İl</th><th>Bayi</th><th>İldeki pay</th><th>Otogaz satışı</th><th>t / bayi</th></tr>`;
    rows=IR.map(([i,n])=>{ const o=LB_OT.get(S.lbS+"|"+i)||0; return `<tr><td class="l">${esc(IL.get(i))}</td><td><b>${nf.format(n)}</b></td><td>${pct(n/(LB_IL.get(i)||1))}</td><td>${cell(o)}</td><td>${o?nf.format(o/n):"–"}</td></tr>`; }); }
  document.getElementById("h-lbay-t").textContent=S.lbIl!=null?`${IL.get(S.lbIl)} – dağıtıcılara göre otogaz bayileri`:tum?"Otogaz bayileri – dağıtıcılar":`${ad} – illere göre otogaz bayileri`;
  document.getElementById("s-lbay-t").textContent=S.lbIl!=null?`${nf.format(LB_IL.get(S.lbIl)||0)} bayi`:`${nf.format(ST)} bayi · ${IR.length} il`;
  document.getElementById("t-lbay").innerHTML=`<thead>${head}</thead><tbody>${rows.join("")||'<tr><td colspan="7" class="empty">Otogaz bayi verisi için LPG veritabanı gerekir.</td></tr>'}</tbody>`;
  lpgAkaryakitAgi();
}
function lpgAkaryakitAgi(){
  const el=document.getElementById("t-lagi"); if(!el) return;
  const R=LAGI.filter(r=>(S.lbIl==null||r[2]===S.lbIl)), sel=S.lbS>=0;
  const F=new Map(); for(const r of R){ const o=F.get(r[0])||F.set(r[0],{n:0,t:0,g:0,s:new Map(),ns:0,ts:0}).get(r[0]); o.n+=r[3]; o.t+=r[4]; if(r[5]) o.g+=r[4]; o.s.set(r[1],(o.s.get(r[1])||0)+r[4]); if(r[1]===S.lbS){ o.ns+=r[3]; o.ts+=r[4]; } }
  const T=[...F.values()].reduce((a,o)=>a+o.t,0), TG=[...F.values()].reduce((a,o)=>a+o.g,0), TS=[...F.values()].reduce((a,o)=>a+o.ts,0);
  const yer=S.lbIl!=null?IL.get(S.lbIl):"Türkiye";
  document.getElementById("h-lagi").textContent=sel?`${SIR[S.lbS][1]} – hangi akaryakıt ağlarına otogaz veriyor`:"Akaryakıt istasyon ağlarının LPG tedarikçisi";
  document.getElementById("s-lagi").textContent=`${yer} · ${ton(sel?TS:T)} otogaz`;
  const L=[...F].filter(([,o])=>sel?o.ts>=0.5:o.t>=0.5).sort((a,b)=>sel?b[1].ts-a[1].ts:b[1].t-a[1].t);
  const top=L.slice(0,6), dig=L.slice(6).reduce((a,[,o])=>a+(sel?o.ts:o.t),0), RN=["#2A5591","#0F6E8C","#B7791F","#7553B5","#3E9A4A","#C4486C"];
  document.getElementById("k-lagi").innerHTML=`<div class="kg">`+kompKart(sel?"Otogazın gittiği akaryakıt ağları":"Otogaz satışı · akaryakıt ağına göre",[...top.map(([f,o],i)=>({l:f,v:sel?o.ts:o.t,c:RN[i],s:`${nf.format(sel?o.ns:o.n)} istasyon`})),{l:`Diğer (${Math.max(0,L.length-6)})`,v:dig,c:"#C9D3D8"}],{buyuk:ton(sel?TS:T),alt:yer,span:sel?12:7})
    +(sel?"":kompKart("Tedarik ilişkisi",[{l:"Aynı şirket / grup",v:TG,c:"#0F6E8C",s:"ör. PO → PO, Opet → Aygaz (Koç), Güzel Enerji → Likitgaz (OYAK)"},{l:"Dış tedarikçi",v:T-TG,c:"#D9711F",s:"akaryakıt ağı LPG'yi başka gruptan alıyor"}],{span:5}))+`</div>`;
  el.innerHTML=sel
    ?`<thead><tr><th class="l">Akaryakıt ağı</th><th>İstasyon</th><th>Otogaz</th><th>Pay</th><th>Ağın LPG alımındaki payı</th><th class="l">İlişki</th></tr></thead><tbody>`+(L.map(([f,o])=>`<tr><td class="l"><b>${esc(f)}</b></td><td>${nf.format(o.ns)}</td><td><b>${ton(o.ts)}</b></td><td>${pct(TS?o.ts/TS:0)}</td><td>${pct(o.t?o.ts/o.t:0)}</td><td class="l"><span class="muted">${R.some(r=>r[0]===f&&r[1]===S.lbS&&r[5])?"aynı şirket / grup":"dış tedarik"}</span></td></tr>`).join("")||'<tr><td colspan="6" class="empty">Bu seçimde istasyon yok.</td></tr>')+`</tbody>`
    :`<thead><tr><th class="l">Akaryakıt ağı</th><th>İstasyon</th><th>Otogaz</th><th>Pay</th><th>Aynı grup</th><th class="l">LPG tedarikçileri</th></tr></thead><tbody>`+L.map(([f,o])=>{ const S_=[...o.s].sort((a,b)=>b[1]-a[1]); return `<tr><td class="l"><b>${esc(f)}</b></td><td>${nf.format(o.n)}</td><td><b>${ton(o.t)}</b></td><td>${pct(T?o.t/T:0)}</td><td>${pct(o.t?o.g/o.t:0)}</td><td class="l">${S_.slice(0,3).map(([x,v])=>`<span class="lu"><i style="background:#D9711F"></i>${esc(SIR[x][1])} ${pct(v/o.t)}</span>`).join("")}${S_.length>3?`<span class="muted">+${S_.length-3}</span>`:""}</td></tr>`; }).join("")+`</tbody>`;
}
document.getElementById("f-lb-s").addEventListener("change",e=>{S.lbS=+e.target.value; render();});
document.getElementById("clear-lb").addEventListener("click",()=>{S.lbS=-1; S.lbIl=null; render();});
document.getElementById("lbay-il").addEventListener("click",e=>{ const b=e.target.closest("[data-il]"); if(b){ const i=+b.dataset.il; S.lbIl=S.lbIl===i?null:i; render(); } });
document.getElementById("t-lbay").addEventListener("click",e=>{ const b=e.target.closest("[data-lbs]"); if(b){ S.lbS=+b.dataset.lbs; render(); } });

function render(){
  mobilHazirla();
  const W=document.getElementById("wrap"); W.dataset.sayfa=S.sayfa;
  for(const b of document.querySelectorAll(".tabs button[data-sayfa]")) b.setAttribute("aria-selected",String(b.dataset.sayfa===S.sayfa));
  const grp=grupOf(S.sayfa); if(grp) SON_G[grp]=S.sayfa;
  for(const b of document.querySelectorAll(".tabs button[data-grup]")) b.setAttribute("aria-selected",String(b.dataset.grup===grp));
  for(const n of document.querySelectorAll("nav.tabs.alt")) n.hidden=n.dataset.grup!==grp;
  if(matchMedia("(max-width:600px)").matches) for(const tb of document.querySelectorAll(".tabs")){ const ab=tb.querySelector('[aria-selected="true"]'); if(ab&&tb.offsetParent) tb.scrollTo({left:ab.offsetLeft-(tb.clientWidth-ab.offsetWidth)/2}); }
  document.getElementById("l-sirket").textContent=(TAH()||KAYN())?"Alımı yapan şirket":MUS()?"Satıcı":ITH()?"Şirket (ithalatçı)":TKS()?"Satıcı (ithalatçı)":BAY()?"Dağıtım şirketi":RAFP()?"Alıcı şirket":TASP()?"Şirket (ürün sahibi ya da taşıyan)":"Şirket";
  document.getElementById("l-term").textContent=TKS()?"Yükleme terminali":"Terminal";
  const opt=(TAH()||KAYN()||RAFP())?OPT_TAH:MUS()?OPT_MUS:ITH()?OPT_ITH:TKS()?OPT_TKS:BAY()?OPT_BAY:OPT_AKIS; if(fS.dataset.sayfa!==S.sayfa){fS.innerHTML=opt; fS.dataset.sayfa=S.sayfa;}
  if(MUS()&&S.mm>=0&&!AF.some(f=>f[0]===S.mm&&f[11]!==f[0]&&!isTk(f)&&(S.sid<0||f[11]===S.sid))) S.mm=-1;
  fS.value=String(S.sid); fU.value=S.urun; fI.value=S.il==null?"":String(S.il);
  if(S.sayfa==="lpgmus"){ lpgTicaret(); return; }
  if(S.sayfa==="lpgith"){ lpgIthalat(); return; }
  if(S.sayfa==="lpgtrm"){ lpgTerminaller(); return; }
  if(S.sayfa==="lpgraf"){ lpgRafineriler(); return; }
  if(S.sayfa==="lpgkay"){ lpgKaynak(); return; }
  if(S.sayfa==="lpgtah"){ lpgTahsis(); return; }
  if(S.sayfa==="lpgtas"){ lpgTasima(); return; }
  if(S.sayfa==="lpgbay"){ lpgBayiler(); return; }
  if(S.sayfa==="akterm"){ akTerminaller(); return; }
  if(TAH()){ tahsis(); return; }
  if(KAYN()){ kaynakDag(); return; }
  if(ITH()){ ithalat(); return; }
  if(BAY()){ bayiler(); return; }
  if(RAFP()){ rafineriler(); return; }
  if(TASP()){ tasima(); return; }
  if(TKS()){ const av=new Map(); for(const f of AF) if(isTk(f)&&(S.sid<0||f[11]===S.sid)) av.set(f[0],(av.get(f[0])||0)+f[6]);
    if(S.alc>=0&&!av.has(S.alc)) S.alc=-1;
    fA.innerHTML='<option value="-1">Tüm alıcılar</option>'+[...av].filter(([,v])=>v>=0.5).sort((a,b)=>b[1]-a[1]).map(([i,v])=>`<option value="${i}">${esc(SIR[i][1])} · ${ton(v)}</option>`).join(""); fA.value=String(S.alc); }
  // Terminal filtresi (kullanıcı 08.10.2026): seçili şirket + ürün için akışı olan terminaller, alfabetik
  const tv=new Map(); for(const f of AF) if(sA(f)&&prA(f)) tv.set(f[1],(tv.get(f[1])||0)+f[6]); for(const f of LF) if(sL(f)&&prL(f)) tv.set(f[1],(tv.get(f[1])||0)+f[6]);
  const tl=[...tv].filter(([t,v])=>v>0.5||t===S.term).map(([t])=>t); if(S.term!=null&&!tv.has(S.term)) tl.push(S.term);
  tl.sort((a,b)=>(tv.get(b)||0)-(tv.get(a)||0));   // tonaja göre (kullanıcı 20.10.2026 21:30; önceden alfabetik)
  fT.innerHTML=`<option value="">Tüm terminaller (${tl.length})</option>`+tl.map(t=>`<option value="${t}">${esc(TERM[t][1])} · ${esc(HUB[TERM[t][2]].ad)}${(tv.get(t)||0)>=0.5?" · "+ton(tv.get(t)):""}</option>`).join("");
  fT.value=S.term==null?"":String(S.term);
  harita(); if(MUS()) musteriler(); else if(TKS()) takas(); else {terminaller(); sepet(); iller();}
}
fS.addEventListener("change",()=>{S.sid=+fS.value; S.term=null; render()});
fU.addEventListener("change",()=>{S.urun=fU.value; render()});
fI.addEventListener("change",()=>{S.il=fI.value?+fI.value:null; render()});
fT.addEventListener("change",()=>{S.term=fT.value?+fT.value:null; render()});
fA.addEventListener("change",()=>{S.alc=+fA.value; S.term=null; render()});
document.getElementById("f-mmus").addEventListener("change",e=>{S.mm=+e.target.value; S.term=null; render()});
document.getElementById("clear").addEventListener("click",()=>{Object.assign(S,{sid:-1,urun:"tum",il:null,term:null,alc:-1,raf:null,tmus:-1,mm:-1,tmod:"",tur:[],tasy:""}); render()});
for(const g of document.querySelectorAll(".tabs button[data-grup]")) g.addEventListener("click",()=>{ if(grupOf(S.sayfa)===g.dataset.grup) return; document.getElementById("tab-"+SON_G[g.dataset.grup]).click(); });
for(const b of document.querySelectorAll(".tabs button[data-sayfa]")) b.addEventListener("click",()=>{
  if(S.sayfa===b.dataset.sayfa) return; S.sayfa=b.dataset.sayfa; S.term=null; S.il=null;
  if(MUS()){ if(!MUS_SID.has(S.sid)) S.sid=-1; if(isL()) S.urun="tum"; }
  if((TAH()||KAYN())&&!TAH_SID.has(S.sid)) S.sid=-1;
  if(ITH()&&!ITH_SID.has(S.sid)) S.sid=-1;
  if(TKS()){ if(!TKS_SID.has(S.sid)) S.sid=-1; if(!["tum","a0","a1"].includes(S.urun)) S.urun="tum"; }
  if(!TKS()) S.alc=-1;
  if(!MUS()) S.mm=-1;
  if(!TASP()){ S.tmod=""; S.tur=[]; S.tasy=""; }
  if(BAY()){ if(!BAY_SID.has(S.sid)) S.sid=-1; S.urun="tum"; }
  if(RAFP()&&!TAH_SID.has(S.sid)) S.sid=-1;
  render();
});
document.addEventListener("click",e=>{
  if(e.target.id==="termX"){S.term=null; render(); return}
  if(e.target.id==="hepsi"){S.hepsi=!S.hepsi; terminaller(); return}
  if(e.target.id==="hepsiM"){S.hepsiM=!S.hepsiM; musteriler(); return}
  if(e.target.id==="hepsiT"){S.hepsiT=!S.hepsiT; tahsis(); return}
  const tr=e.target.closest("tr[data-term],tr[data-il]"); if(!tr) return;
  if(tr.dataset.term){const t=+tr.dataset.term; S.term=S.term===t?null:t;} else {const i=+tr.dataset.il; S.il=S.il===i?null:i;}
  render();
});
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.matches("tr[tabindex]")) e.target.click()});
if(location.hash==="#tahsis") S.sayfa="tahsis"; else if(location.hash==="#kaynak") S.sayfa="kaynak"; else if(location.hash==="#ithalat") S.sayfa="ithalat"; else if(location.hash==="#takas") S.sayfa="takas"; else if(location.hash==="#bayi") S.sayfa="bayi"; else if(location.hash==="#rafineri") S.sayfa="rafineri";
render();
