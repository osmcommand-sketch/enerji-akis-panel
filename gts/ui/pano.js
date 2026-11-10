"use strict";
window.GTSPano=function(V){
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const nf=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:0}), nf1=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1}), nf2=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2});
const ton=t=>{ const a=Math.abs(t), s=t<0?"−":""; return a>=1e6?s+nf2.format(a/1e6)+" Mt":a>=1e3?s+nf.format(a/1e3)+" kt":s+nf.format(a)+" t"; };
const usd=x=>{ const a=Math.abs(x), s=x<0?"−":""; return a>=1e6?s+nf1.format(a/1e6)+" M $":s+nf.format(a/1e3)+" bin $"; };
const musd=x=>(x<0?"−":"")+nf1.format(Math.abs(x)/1e6);
const pct=x=>"%"+nf1.format(x*100);
const km=x=>nf.format(x)+" km";
const C={mot:"#2A5591",ben:"#2F855A",gts:"#B8860B",neg:"#B3412E",pos:"#1D7A4A",ink3:"#6F7E89",kur:"#7A3E9D",tup:"#0F6E8C"};
const AY=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
const T0=new Date(V.g0+"T00:00:00Z"), gun=i=>new Date(T0.getTime()+i*864e5), gunS=i=>{ const d=gun(i); return d.getUTCDate()+" "+AY[d.getUTCMonth()]+" "+d.getUTCFullYear(); };
const tk=s=>/^\d{4}-/.test(s)?s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(2,4):s;
const tarihI=s=>Math.round((new Date(s+"T00:00:00Z")-T0)/864e5);
const ND=V.gm.length;
/* benzin projede yoksa (paket 58: Girdiler "Benzin ithalatı" Kapalı) benzin öğeleri gösterilmez */
const BZ=V.gb.reduce((a,r)=>a+r[0],0)>0.5;
const bzs=a=>BZ?a:a.filter(x=>!/benzin/i.test(x.ad||""));
/* yıl filtresi (kullanıcı 01.11.2026): "" = tüm dönem, "2027", "2028" */
/* Pano 2027'ye kilitli (kullanıcı 02.11.2026 11:08); kaldırmak için KILIT="" */
const KILIT="2027"; let YIL=KILIT; if(!KILIT) try{ YIL=localStorage.getItem("gts.yil")||""; }catch{}
const PEN={i0:0,n:ND}; const penAyarla=()=>{ if(!YIL){ PEN.i0=0; PEN.n=ND; return; } let a=-1,b=-1; for(let i=0;i<ND;i++) if(String(gun(i).getUTCFullYear())===YIL){ if(a<0) a=i; b=i; } if(a<0){ YIL=""; PEN.i0=0; PEN.n=ND; } else { PEN.i0=a; PEN.n=b-a+1; } };
const yilOk=s=>!YIL||String(s).slice(0,4)===YIL;

/* ---------- Özet sayfası satırları ---------- */
/* Net kâr TL defter mantığıyla (kullanıcı 03.11.2026 22:31): kambiyo kârı/zararı net kâra girer, karşılığında beyanname → fatura vadesi
   kur hedge sonucu gösterilir; aynı kur hareketini temsil eden "tahsilat kur farkı" (TL alacağın USD karşılığı) net kârdan çıkar.
   Model çıktısı (Ozet / Karlilik) burada düzeltilir; V.tld = yıl → {tah, kmb, hdg, d} (USD; d = net kâra eklenen). */
V.tld=(()=>{ const K=V.kambiyo&&V.kambiyo.yil, KT=V.kartab; if(!K||!Object.keys(K).length||!KT) return null;
  // paket 78+: model net kârı TL defter tanımıyla veriyor (Karlilik KUR FARKI bloğu) → yalnız kalemler okunur, düzeltme yapılmaz
  { const L=KT.rows, bul=re=>L.find(r=>re.test(String(r[0]).trim())), kf=bul(/^KUR FARKI – YASAL DEFTER/);
    if(kf){ const tl=!!bul(/^BRÜT KÂR \(TL\)/), t=tl?null:(bul(/^Bilgi: tahsilat kur farkı/)||bul(/^Tahsilat kur farkı/)), km=bul(/^Kambiyo kârı \/ zararı/), hg=bul(/^Kur hedge sonucu/)||bul(/^Kur hedge – forward/), /* paket 85: TL şablonunda tahsilat kur farkı net kâra girmez */ v=r=>[0,1,2,3].map(j=>j&&r&&typeof r[j]==="number"?r[j]:0);
      const tah=v(t), kmb=v(km), hdg=v(hg); return {tah,kmb,hdg,d:[0,1,2,3].map(j=>tah[j]+kmb[j]+hdg[j]),model:true,tl}; } }
  const L=KT.rows, bul=re=>L.findIndex(r=>re.test(String(r[0]).trim())), it=bul(/^Tahsilat kur farkı/); if(it<0) return null;
  const hAc=(((V.tic||[]).find(r=>/^Kur hedge \(Açık/.test(r[0]))||(V.tic||[]).find(r=>r[4]==='GTS!KambiyoHedge'||/^Kambiyo kur hedge/.test(r[0]))||[])[1]||'Açık')==='Açık';   // tek kur hedge anahtarı (03.11.2026 19:29)
  const tah=[0,1,2,3].map(j=>j&&typeof L[it][j]==="number"?L[it][j]:0), kmb=[0,(K[2027]||{}).kusd||0,(K[2028]||{}).kusd||0], hdg=hAc?[0,(K[2027]||{}).husd||0,(K[2028]||{}).husd||0]:[0,0,0];
  kmb[3]=kmb[1]+kmb[2]; hdg[3]=hdg[1]+hdg[2]; const d=[0,1,2,3].map(j=>tah[j]+kmb[j]+hdg[j]);
  const ekle=(i,dv,isaret)=>{ if(i<0) return; for(const j of [1,2,3]) if(typeof L[i][j]==="number") L[i][j]+=isaret*dv[j]; };
  // Karlilik: tahsilat kur farkı faaliyet giderlerinden çıkar, KUR FARKI bloğu NET KÂR'ın önüne
  ekle(bul(/^Finansman ve kur giderleri/),tah,-1); ekle(bul(/^FAALİYET GİDERLERİ/),tah,-1);
  const eskiNet=L[bul(/^NET KÂR/)].slice(1,4); L.splice(it,1);
  const ni=bul(/^NET KÂR/), ns=L[bul(/^NET SATIŞLAR/)], tn=L[bul(/Gerçekleşen satış – bayi alımı/)];
  L.splice(ni,0,["KUR FARKI – YASAL DEFTER",kmb[1]+hdg[1],kmb[2]+hdg[2],kmb[3]+hdg[3],null,null,"TL defter: beyanname açılış kuru ile kargo fatura vadesi kuru arasındaki fark ve karşılığındaki kur hedge; + kâr"],
    ["  Kambiyo kârı / zararı",kmb[1],kmb[2],kmb[3],null,null,"beyanname kuru − fatura vadesi kuru (COD + ödeme vadesi); USD yıl ortalama kuruyla"],
    ["  Kur hedge sonucu (forward)",hdg[1],hdg[2],hdg[3],null,null,"beyanname günü fatura vadesine forward USD alımı; ödeme beyannameden önceyse korunacak borç yok (0)"]);
  const nk=bul(/^NET KÂR/); ekle(nk,d,1);
  const nm=bul(/^Net kâr marjı/), nt=bul(/^Net kâr \(USD\/t/);
  for(const j of [1,2,3]){ if(nm>=0&&ns&&ns[j]) L[nm][j]=L[nk][j]/ns[j]; if(nt>=0&&tn&&tn[j]) L[nt][j]=L[nk][j]/tn[j]; }
  L.splice(nk+1+(nm>=0?1:0)+(nt>=0?1:0),0,["Bilgi: USD bazlı net kâr (önceki tanım: tahsilat kur farkı dahil, kambiyo hariç)",...eskiNet,null,null,null]);
  // Ozet: net kâr satırları
  const yI0=V.oz.findIndex(r=>r[0]==="Yıllara göre"), ton=[1,2,3].map(j=>{ const m=V.oz.slice(yI0).find(r=>r[0]==="Motorin satışı (t)"), b=V.oz.slice(yI0).find(r=>r[0]==="Benzin satışı (t)"); return (m&&m[j]||0)+(b&&b[j]||0); });
  for(const r of V.oz){ if(/^Toplam: net kâr/.test(r[0])) for(const j of [1,2,3]) if(typeof r[j]==="number") r[j]+=d[j];
    if(/^Toplam \(USD\/t\)$/.test(r[0])) for(const j of [1,2,3]) if(typeof r[j]==="number"&&ton[j-1]) r[j]+=d[j]/ton[j-1]; }
  return {tah,kmb,hdg,d}; })();
const OZ=V.oz, yI=OZ.findIndex(r=>r[0]==="Yıllara göre");
const OZA={"Toplam (USD)":["Toplam: net kâr (USD)","Toplam: şirket sonucu (USD)"],"Bölgesel navlun avantajı (USD)":["Bölgesel navlun avantajı – bayiye kalır (bilgi)","Bölgesel navlun avantajı – bayiye kalır (USD, bilgi)"]};
const oz=(l,yil)=>{ const a=yil?yI:0, b=yil?OZ.length:yI; for(const x of [l,...(OZA[l]||[])]) for(let i=a;i<b;i++) if(OZ[i][0]===x) return OZ[i]; return [l,null,null,null,""]; };
const SIRKET=OZ.some(r=>/şirket sonucu|^Toplam: net kâr/.test(r[0]||""));
const gir=l=>{ const r=V.gir.find(x=>x[0]===l); return r?r[1]:null; };

/* ---------- grafik yardımcıları ---------- */
let W=1000; const gw=el=>{ W=Math.round(Math.max(340,Math.min(1000,(el.clientWidth||1000)))); return W; };
function olcek(a,b,lo,hi){ const k=(hi-lo)/((b-a)||1); return v=>lo+(v-a)*k; }
function guzel(lo,hi,n=5){ const s=(hi-lo)/n, m=Math.pow(10,Math.floor(Math.log10(s||1))), st=[1,2,2.5,5,10].map(x=>x*m).find(x=>x>=s)||s; const a=Math.floor(lo/st)*st, b=Math.ceil(hi/st)*st; const r=[]; for(let v=a;v<=b+st/2;v+=st) r.push(+v.toFixed(10)); return r; }
function ayTik(n,pad,xs,i0=0){ let g=""; const tek=n<=400; for(let i=0;i<n;i++){ const d=gun(i+i0); if(d.getUTCDate()!==1) continue; const x=xs(i), m=d.getUTCMonth(); g+=`<line class="ax" x1="${x}" x2="${x}" y1="${pad.t}" y2="${pad.y0}" stroke-dasharray="${m===0?"":"2 4"}"/>`; if(m%(tek?(W<600?3:1):(W<600?6:3))===0) g+=`<text x="${x+3}" y="${pad.y0+14}">${AY[m]}${m===0?" "+String(d.getUTCFullYear()).slice(2):""}</text>`; } return g; }
/* zaman serisi: seri [{ad,renk,v[],kalin,kesik,alan}], bant [{lo[],hi[],renk}], yatay [{v,ad,renk}] */
function zaman(el,o){
  const i0=PEN.i0, n=PEN.n, kes=a=>a.slice(i0,i0+n); o={...o,seri:o.seri.map(s=>({...s,v:kes(s.v)})),bant:(o.bant||[]).map(b=>({...b,lo:kes(b.lo),hi:kes(b.hi)}))};
  gw(el); const H=Math.round((o.h||200)*(W<700?.85:1)), pad={l:52,r:10,t:8,y0:H-22};
  let lo=Infinity, hi=-Infinity; const ek=a=>{ for(const v of a) if(v!=null&&isFinite(v)){ if(v<lo) lo=v; if(v>hi) hi=v; } };
  for(const s of o.seri) ek(s.v); for(const b of o.bant||[]){ ek(b.lo); ek(b.hi); } for(const y of o.yatay||[]) ek([y.v]);
  if(o.sifir){ lo=Math.min(lo,0); hi=Math.max(hi,0); }
  const tk=guzel(lo,hi,o.tik||5), xs=olcek(0,n-1,pad.l,W-pad.r), ys=olcek(tk[0],tk[tk.length-1],pad.y0,pad.t), f=o.fmt||nf.format;
  let g=tk.map(v=>`<line class="${v===0?"z":"ax"}" x1="${pad.l}" x2="${W-pad.r}" y1="${ys(v).toFixed(1)}" y2="${ys(v).toFixed(1)}"/><text x="${pad.l-6}" y="${(ys(v)+4).toFixed(1)}" text-anchor="end">${f(v)}</text>`).join("")+ayTik(n,pad,xs,i0);
  for(const b of o.bant||[]){ let p=""; for(let i=0;i<n;i++) p+=(i?"L":"M")+xs(i).toFixed(1)+","+ys(b.hi[i]).toFixed(1); for(let i=n-1;i>=0;i--) p+="L"+xs(i).toFixed(1)+","+ys(b.lo[i]).toFixed(1); g+=`<path d="${p}Z" fill="${b.renk}" fill-opacity=".16" stroke="none"/>`; }
  for(const s of o.seri){ let p="", on=false; for(let i=0;i<n;i++){ const v=s.v[i]; if(v==null){ on=false; continue; } p+=(on?"L":"M")+xs(i).toFixed(1)+","+ys(v).toFixed(1); on=true; }
    if(s.alan) g+=`<path d="${p}L${xs(n-1).toFixed(1)},${ys(Math.max(tk[0],0)).toFixed(1)}L${xs(0).toFixed(1)},${ys(Math.max(tk[0],0)).toFixed(1)}Z" fill="${s.renk}" fill-opacity=".12" stroke="none"/>`;
    g+=`<path d="${p}" fill="none" stroke="${s.renk}" stroke-width="${s.kalin||1.6}" ${s.kesik?`stroke-dasharray="${s.kesik}"`:""} stroke-linejoin="round"/>`; }
  for(const y of o.yatay||[]) g+=`<line x1="${pad.l}" x2="${W-pad.r}" y1="${ys(y.v).toFixed(1)}" y2="${ys(y.v).toFixed(1)}" stroke="${y.renk}" stroke-width="1.2" stroke-dasharray="6 4"/><text x="${W-pad.r-4}" y="${(ys(y.v)-5).toFixed(1)}" text-anchor="end" style="fill:${y.renk}">${esc(y.ad)}</text>`;
  g+=`<line class="hl" x1="0" x2="0" y1="${pad.t}" y2="${pad.y0}" stroke="var(--ink)" stroke-width="1" visibility="hidden"/>`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||"")}">${g}<rect x="${pad.l}" y="${pad.t}" width="${W-pad.l-pad.r}" height="${pad.y0-pad.t}" fill="transparent" class="hv"/></svg>`
    +`<div class="lg">${o.seri.filter(s=>s.ad).map(s=>`<span><i style="background:${s.renk}"></i>${esc(s.ad)}</span>`).join("")}${(o.bant||[]).filter(b=>b.ad).map(b=>`<span><i class="b k" style="background:${b.renk}"></i>${esc(b.ad)}</span>`).join("")}</div>`;
  ipucu(el,pad,n,xs,i=>`<b>${gunS(i+i0)}</b>`+o.seri.filter(s=>s.ad&&s.v[i]!=null).map(s=>`<br><i style="background:${s.renk}"></i>${esc(s.ad)}: <b>${f(s.v[i])}</b>`).join("")+(o.bant||[]).filter(b=>b.ad).map(b=>`<br><i style="background:${b.renk};opacity:.4"></i>${esc(b.ad)}: <b>${f(b.lo[i])} – ${f(b.hi[i])}</b>`).join(""));
}
function ipucu(el,pad,n,xs,html){
  const Wc=W, sv=el.querySelector("svg"), hv=sv.querySelector(".hv"), hl=sv.querySelector(".hl"); let tp=el.querySelector(".tip"); if(!tp){ tp=document.createElement("div"); tp.className="tip"; tp.hidden=true; el.appendChild(tp); }
  const yer=e=>{ const r=sv.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*Wc; const i=Math.max(0,Math.min(n-1,Math.round((x-pad.l)/((W-pad.l-pad.r)/(n-1||1))))); return {i,r}; };
  hv.addEventListener("pointermove",e=>{ const {i,r}=yer(e), x=xs(i); if(hl){ hl.setAttribute("x1",x); hl.setAttribute("x2",x); hl.setAttribute("visibility","visible"); } tp.innerHTML=html(i); tp.hidden=false;
    const er=el.getBoundingClientRect(), px=x/Wc*r.width+(r.left-er.left); tp.style.top=(e.clientY-er.top+14)+"px"; const tw=tp.offsetWidth; tp.style.left=Math.max(0,Math.min(er.width-tw,px+12>er.width-tw?px-tw-12:px+12))+"px"; });
  hv.addEventListener("pointerleave",()=>{ tp.hidden=true; if(hl) hl.setAttribute("visibility","hidden"); });
}
/* kategori çubukları (yığın, eksi destekli): kat [], seri [{ad,renk,v[]}] */
function cubuk(el,o){
  gw(el); const H=Math.round((o.h||195)*(W<700?.85:1)), pad={l:56,r:12,t:10,y0:H-24}, n=o.kat.length;
  let lo=0, hi=0; for(let i=0;i<n;i++){ let p=0, m=0; for(const s of o.seri){ const v=s.v[i]||0; if(v>=0) p+=v; else m+=v; } if(o.cizgi){ for(const c of o.cizgi){ const v=c.v[i]; if(v!=null){ hi=Math.max(hi,v); lo=Math.min(lo,v); } } } hi=Math.max(hi,p); lo=Math.min(lo,m); }
  const tk=guzel(lo,hi,5), ys=olcek(tk[0],tk[tk.length-1],pad.y0,pad.t), bw=(W-pad.l-pad.r)/n, f=o.fmt||nf.format, xs=i=>pad.l+bw*(i+.5);
  let g=tk.map(v=>`<line class="${v===0?"z":"ax"}" x1="${pad.l}" x2="${W-pad.r}" y1="${ys(v).toFixed(1)}" y2="${ys(v).toFixed(1)}"/><text x="${pad.l-6}" y="${(ys(v)+4).toFixed(1)}" text-anchor="end">${f(v)}</text>`).join("");
  for(let i=0;i<n;i++){ let p=0, m=0; const x=pad.l+bw*i+bw*.16, w=bw*.68;
    for(const s of o.seri){ const v=s.v[i]||0; if(!v) continue; const a=v>=0?p:m, b=a+v; if(v>=0) p=b; else m=b; g+=`<rect x="${x.toFixed(1)}" y="${ys(Math.max(a,b)).toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(.5,Math.abs(ys(a)-ys(b))).toFixed(1)}" fill="${s.renk}"/>`; }
    if(o.etk&&o.etk(i)) g+=`<text x="${(x+w/2).toFixed(1)}" y="${pad.y0+14}" text-anchor="middle">${esc(o.etk(i))}</text>`; }
  for(const c of o.cizgi||[]){ let p=""; for(let i=0;i<n;i++) if(c.v[i]!=null) p+=(p?"L":"M")+xs(i).toFixed(1)+","+ys(c.v[i]).toFixed(1); g+=`<path d="${p}" fill="none" stroke="${c.renk}" stroke-width="2" stroke-dasharray="${c.kesik||""}"/>`; }
  g+=`<line class="hl" x1="0" x2="0" y1="${pad.t}" y2="${pad.y0}" stroke="var(--ink)" stroke-opacity=".25" stroke-width="${bw.toFixed(1)}" visibility="hidden"/>`;
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||"")}">${g}<rect x="${pad.l}" y="${pad.t}" width="${W-pad.l-pad.r}" height="${pad.y0-pad.t}" fill="transparent" class="hv"/></svg><div class="lg">${o.seri.map(s=>`<span><i class="k" style="background:${s.renk}"></i>${esc(s.ad)}</span>`).join("")}${(o.cizgi||[]).map(c=>`<span><i style="background:${c.renk}"></i>${esc(c.ad)}</span>`).join("")}</div>`;
  const pad2={...pad,l:pad.l+bw/2,r:pad.r+bw/2}; ipucu(el,pad2,n,xs,i=>`<b>${esc(o.kat[i])}</b>`+o.seri.map(s=>`<br><i style="background:${s.renk}"></i>${esc(s.ad)}: <b>${f(s.v[i]||0)}</b>`).join("")+(o.cizgi||[]).map(c=>`<br><i style="background:${c.renk}"></i>${esc(c.ad)}: <b>${c.fmt?c.fmt(c.v[i]):f(c.v[i])}</b>`).join("")+(o.ek?o.ek(i):""));
}
/* aralık grafiği (Monte Carlo): satır [ad, ort, p10, p50, p90, zarar] */
function aralik(el,R,o={}){
  if(!R.length){ el.innerHTML=`<p class="not">Bu seçimde çalıştırma yok.</p>`; return; }
  gw(el); const dar=W<600, rh=dar?48:34, H=R.length*rh+28, pad={l:dar?8:230,r:56,t:6}; let lo=Math.min(0,...R.map(r=>r[2])), hi=Math.max(0,...R.map(r=>r[4]));
  const tk=guzel(lo,hi,6), xs=olcek(tk[0],tk[tk.length-1],pad.l,W-pad.r);
  let g=tk.map(v=>`<line class="${v===0?"z":"ax"}" x1="${xs(v).toFixed(1)}" x2="${xs(v).toFixed(1)}" y1="${pad.t}" y2="${H-22}"/><text x="${xs(v).toFixed(1)}" y="${H-6}" text-anchor="middle">${nf.format(v)}</text>`).join("");
  R.forEach((r,i)=>{ const y=pad.t+i*rh+rh/2+(dar?8:0), c=r[1]>=0?C.pos:C.neg;
    g+=(dar?`<text x="${pad.l}" y="${y-13}" style="fill:var(--ink);font:13px var(--f-body)">${esc(r[0])}</text>`:`<text x="${pad.l-10}" y="${y+4}" text-anchor="end" style="fill:var(--ink);font:13px var(--f-body)">${esc(r[0])}</text>`)
      +`<rect x="${xs(r[2]).toFixed(1)}" y="${y-7}" width="${Math.max(1,xs(r[4])-xs(r[2])).toFixed(1)}" height="14" rx="3" fill="${c}" fill-opacity=".22"/>`
      +`<line x1="${xs(r[3]).toFixed(1)}" x2="${xs(r[3]).toFixed(1)}" y1="${y-8}" y2="${y+8}" stroke="${c}" stroke-width="2"/>`
      +`<circle cx="${xs(r[1]).toFixed(1)}" cy="${y}" r="5" fill="${c}" stroke="#fff" stroke-width="1.5"><title>${esc(r[0])}: ortalama ${nf1.format(r[1])} · P10 ${nf1.format(r[2])} · P50 ${nf1.format(r[3])} · P90 ${nf1.format(r[4])} M $ · zarar olasılığı ${pct(r[5])}</title></circle>`
      +`<text x="${W-pad.r+8}" y="${y+4}" style="fill:${r[5]>=.5?C.neg:"var(--ink-2)"}">${pct(r[5])}</text>`; });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria||"Monte Carlo aralıkları")}">${g}</svg><p class="not">M $ · ortalama ${R.map(r=>`${esc(r[0])} ${nf1.format(r[1])}`).join(" · ")}</p>`;
}

/* ---------- sekmeler (hash) ---------- */
const SEK=["genel","akis","operasyon","kargo","satis","rakip","nakit","ekonomi","hedge","risk","varsayim"], CIZ={};
function goster(v){ if(!SEK.includes(v)) v="genel";
  for(const b of document.querySelectorAll(".tabs [data-v]")) b.setAttribute("aria-selected",String(b.dataset.v===v));
  for(const d of document.querySelectorAll(".v")) d.hidden=d.dataset.v!==v;
  if(!BZ) for(const id of ["o-kur","e-fu","h-eu","h-ku"]){ const e=$(id); if(e) e.closest(".ctl").hidden=true; }
  { const ys=$("yilsec"); if(ys) ys.style.visibility=(v==="akis"||v==="varsayim")?"hidden":"visible"; }
  if(!CIZ[v]){ CIZ[v]=1; ({genel,akis,operasyon,kargo:kargolar,satis:satislar,rakip,nakit,ekonomi,hedge,risk,varsayim})[v](); } }
{ const ys=$("yilsec"); if(ys&&KILIT){ ys.hidden=true; penAyarla(); } else if(ys){ const yz=()=>{ for(const b of ys.querySelectorAll("button")) b.setAttribute("aria-pressed",String(b.dataset.y===YIL)); };
  for(const b of ys.querySelectorAll("button")) b.onclick=()=>{ YIL=b.dataset.y; try{ localStorage.setItem("gts.yil",YIL); }catch{} penAyarla(); yz(); for(const k in CIZ) delete CIZ[k]; goster(location.hash.slice(1)||"genel"); };
  penAyarla(); yz(); } }
for(const b of document.querySelectorAll(".tabs [data-v]")) b.addEventListener("click",()=>{ if(location.hash!=="#"+b.dataset.v) location.hash=b.dataset.v; else goster(b.dataset.v); });
addEventListener("hashchange",()=>goster(location.hash.slice(1)));

/* ---------- SATIŞLAR (kullanıcı 03.11.2026 19:59): müşteri bazında günlük satış ve kârlılık; lot = gemi (antrepo beyannamesi),
   alt lot = o geminin ithalat beyannameleri, satış ↔ alt lot FIFO (res/satis.js). Müşteri payı ve kaynak bazlı prim akış tablosundan. ---------- */
const ST_KES=0.835, ST_BOL=0.845, nf3=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:3,maximumFractionDigits:3}), nf4=new Intl.NumberFormat("tr-TR",{minimumFractionDigits:4,maximumFractionDigits:4});   // kullanıcı 04.11.2026: kargo kesafeti 0,835; alım fiyatı çarpanı 0,845 / 0,835
// CSV: claude.ai yayınında downloads yeteneği (yoksa düğme gizlenir); masaüstünde doğrudan dosya
let ST_DL=null; try{ if(window.claude&&typeof window.claude.use==="function") window.claude.use("downloads").then(d=>{ ST_DL=d||false; const b=$("st-csv"); if(b) b.hidden=!d; }).catch(()=>{ ST_DL=false; const b=$("st-csv"); if(b) b.hidden=true; }); }catch{}
function satislar(){
  const SD=V.satis; if(!SD||!(SD.Motorin||SD.Benzin)){ $("st-tab").innerHTML=`<tbody><tr><td class="l">Bu paketteki modelde satış / beyanname ayrıntısı yok.</td></tr></tbody>`; return; }
  const ur=["Motorin","Benzin"].filter(u=>SD[u]); if(!S.stU||!SD[S.stU]) S.stU=ur[0]; $("st-urun-k").hidden=ur.length<2;
  for(const b of $("st-urun").querySelectorAll("button")){ b.disabled=!SD[b.dataset.u]; b.onclick=()=>{ S.stU=b.dataset.u; S.stLot=""; S.stSf=0; satislar(); }; b.setAttribute("aria-pressed",String(b.dataset.u===S.stU)); }
  const D=SD[S.stU], mot=S.stU==="Motorin", g0=Date.parse(D.g0+"T00:00:00Z"), gd=i=>new Date(g0+i*864e5), yl=i=>gd(i).getUTCFullYear();
  const tS=i=>{ const d=gd(i); return String(d.getUTCDate()).padStart(2,"0")+"."+String(d.getUTCMonth()+1).padStart(2,"0")+"."+d.getUTCFullYear(); }, tI=s=>s?s.slice(8,10)+"."+s.slice(5,7)+"."+s.slice(0,4):"–";
  const ayK=i=>{ const d=gd(i); return d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0"); }, ayA=k=>AY[+k.slice(5)-1]+" "+k.slice(0,4);
  // müşteriler: akış tablosundaki dağıtıcı payı (asgari alım eşiğinin altındakiler hariç) ve kaynak bazlı satış primi
  // paket 80+: modelin Musteri_Gunluk sayfası (gün × dağıtıcı) → gerçek günlük dağılım; yoksa akış payı + kaynak primi
  const MG=D.mus&&D.mg?D.mg:null;
  const Mu=MG?(()=>{ const T=D.mus.map(()=>0); let tt=0; for(const a of MG) if(a) for(const [j,t] of a){ T[j]+=t; tt+=t; }
    return D.mus.map((x,j)=>({s:j,ad:x[1],w:tt?T[j]/tt:0,prim:x[2]||0,dp:0})).sort((a,b)=>b.w-a.w); })():(()=>{ const A=V.akis, P=SD.prim||{}; if(!A||!A.ky) return [{s:-1,ad:"Tüm müşteriler",w:1,prim:P.ort||0}];
    const HT=hedefTon(), sen=(V.minAlim&&V.minAlim.sen)||(HT.yil&&HT.yil<=1125000?"BAZ_075":"HEDEF_150"); let oi=A.oz.findIndex(r=>r[0]===sen&&r[1]==="GERCEKCI_200"); if(oi<0) oi=A.oz.findIndex(r=>r[0]===sen&&r[1]==="REF");
    const EX=new Set((V.minAlim&&V.minAlim.sir)||[]), m=new Map(), uk=mot?1:0;
    for(const r of A.ky){ if(r[0]!==oi||r[3]!==uk||r[1]<0||EX.has(r[1])) continue; const o=m.get(r[1])||m.set(r[1],[0,0]).get(r[1]), p=P[kayKod(r)]; o[0]+=r[6]; o[1]+=r[6]*(typeof p==="number"?p:(P.ort||0)); }
    const top=[...m.values()].reduce((a,o)=>a+o[0],0); if(!top) return [{s:-1,ad:"Tüm müşteriler",w:1,prim:P.ort||0}];
    const L=[...m.entries()].map(([s,o])=>({s,ad:V.sir[s]||("Dağıtıcı "+s),w:o[0]/top,prim:o[1]/o[0]})).sort((a,b)=>b.w-a.w);
    const po=L.reduce((a,x)=>a+x.w*x.prim,0); for(const x of L) x.dp=(x.prim-po)/D.yog; return L; })();
  for(const x of Mu) if(x.dp==null) x.dp=0;
  const LM=new Map(D.lot.map(l=>[l[0],l])), lotAd=n=>n===0?"Açılış stoğu":"K"+n+" · "+(LM.get(n)?LM.get(n)[1]||"":""), altAd=a=>"İB-"+String(a[3]).padStart(3,"0")+(a[6]?" (2. parça)":"");
  // alt lot başına satılan ton, ilk / son satış günü
  const AS=D.alt.map(()=>[0,null,null]); for(const [i,j,q] of D.sat){ const o=AS[j]; o[0]+=q; if(o[1]==null) o[1]=i; o[2]=i; }
  // seçenekler
  const yOk=i=>!YIL||String(yl(i))===YIL, ayl=[...new Set(D.sat.filter(s=>yOk(s[0])).map(s=>ayK(s[0])))];
  if(S.stMu==null) S.stMu=""; if(S.stLot==null) S.stLot=""; if(S.stAy==null||(S.stAy&&!ayl.includes(S.stAy))) S.stAy=""; if(!S.stGor) S.stGor="gun"; if(S.stSf==null) S.stSf=0;
  const lotlar=[...new Set(D.sat.filter(s=>yOk(s[0])).map(s=>D.alt[s[1]][0]))];
  $("st-mus").innerHTML=`<option value="">Tüm müşteriler (${Mu.length})</option>`+Mu.map(x=>`<option value="${x.s}">${esc(x.ad)} · %${nf1.format(x.w*100)}</option>`).join(""); $("st-mus").value=S.stMu;
  $("st-lot").innerHTML=`<option value="">Tüm lotlar (${lotlar.length})</option>`+lotlar.map(n=>{ const l=LM.get(n)||[]; return `<option value="${n}">${n===0?"Açılış stoğu":"Kargo "+n+" · "+esc(l[1]||"")+" · antrepo "+tI(l[4])}</option>`; }).join(""); if(S.stLot!==""&&!lotlar.includes(+S.stLot)) S.stLot=""; $("st-lot").value=S.stLot;
  $("st-ay").innerHTML=`<option value="">Tüm aylar</option>`+ayl.map(k=>`<option value="${k}">${ayA(k)}</option>`).join(""); $("st-ay").value=S.stAy;
  $("st-mus").onchange=e=>{ S.stMu=e.target.value; S.stSf=0; satislar(); }; $("st-lot").onchange=e=>{ S.stLot=e.target.value; S.stSf=0; satislar(); }; $("st-ay").onchange=e=>{ S.stAy=e.target.value; S.stSf=0; satislar(); };
  for(const b of $("st-gor").querySelectorAll("button")){ b.setAttribute("aria-pressed",String(b.dataset.g===S.stGor)); b.onclick=()=>{ S.stGor=b.dataset.g; S.stSf=0; S.stSr=null; satislar(); }; }
  // satır üretimi: satış parçası × müşteri; kalemler USD
  const MS=S.stMu===""?Mu:Mu.filter(x=>String(x.s)===S.stMu), MuI=new Map(Mu.map(x=>[x.s,x])), satir=[];
  /* Hesap şablonu (kullanıcı 04.11.2026 12:29 CSV; 18:07 düzeltme – paket 85 modeliyle aynı):
     Alım fiyatı TL/t = (CIF Med fiyatlama ort. [2 ondalık] + alım primi) × ithalat beyannamesi kuru × 0,845 / gerçek yoğunluk (Platts referansı 0,845; eskalasyon)
     SMM TL = satılan ton × alım fiyatı · Satış: m³ = ton / 0,835, satış fiyatı TL/m³ = satış günü Tüpraş [2 ondalık] + müşteri primi, gelir TL = m³ × satış fiyatı
     Brüt kâr TL = gelir − SMM · Brüt kâr $ = Brüt TL / beyanname kuru · Net kâr $ = Brüt $ + ürün hedge + finansman + faiz + faaliyet giderleri (elleçleme, fire dahil) + kambiyo + forward */
  const NK=D.nak, GT=[]; if(NK) for(const [i,,q] of D.sat) GT[i]=(GT[i]||0)+q;   // paket 101+: günlük nakit akışı kalemleri satış tonuyla parçalara
  const kal=(i,a,l,q,pTL,sP)=>{ const y=yl(i), YY=SD.yil[y]||{faal:0}, kb=a[7]||D.kur[a[1]]||D.kur[i]||0, m3=q/ST_KES, y2=v=>Math.round(v*100)/100, cif=y2(l.length>16?l[11]:l[6]), apr=l.length>16?l[12]:0, yg=l.length>17&&l[17]?l[17]:ST_KES;
    const afy=(cif+apr)*kb*ST_BOL/yg, stp=y2(D.tupM3&&D.tupM3[i]!=null?D.tupM3[i]:(pTL||0)*D.yog), sfy=stp+(sP||0);
    const o={q,m3,cifq:q*cif,aprq:q*apr,ygq:q*yg,kbq:q*kb,afyq:q*afy,afmq:m3*afy*yg,stpq:m3*stp,sprq:m3*(sP||0),sfyq:m3*sfy,gtl:m3*sfy,stl:q*afy,hn:q*l[8],fin:NK?-NK.fin[i]*(GT[i]?q/GT[i]:0):-q*l[7],faal:-q*YY.faal,faiz:q*(YY.faiz||0),kmb:q*a[4]+(NK?NK.kmb[i]*(GT[i]?q/GT[i]:0):0),fwd:q*a[5],tlg:NK?NK.tlg[i]*(GT[i]?q/GT[i]:0):0};
    o.btl=o.gtl-o.stl; o.bus=kb?o.btl/kb:0; o.nk=o.bus+o.hn+o.fin+o.faiz+o.faal+o.kmb+o.fwd+o.tlg; return o; };
  for(const [i,j,q] of D.sat){ if(!yOk(i)) continue; const a=D.alt[j]; if(S.stLot!==""&&a[0]!==+S.stLot) continue; if(S.stAy&&ayK(i)!==S.stAy) continue; const l=LM.get(a[0]); if(!l||D.gTL[i]==null||!D.kur[i]) continue;
    if(MG){ const g=MG[i]; if(!g) continue; const tt=g.reduce((s,x)=>s+x[1],0); if(!tt) continue;
      for(const [c,t,tl] of g){ const m=MuI.get(c); if(!m||(S.stMu!==""&&String(c)!==S.stMu)) continue; const o=kal(i,a,l,q*t/tt,tl/t,D.mus[c][2]); o.i=i; o.j=j; o.lot=a[0]; o.m=m; satir.push(o); } continue; }
    for(const m of MS){ const o=kal(i,a,l,q*m.w,D.gTL[i]+m.dp,m.prim); o.i=i; o.j=j; o.lot=a[0]; o.m=m; satir.push(o); } }
  const K=["q","m3","cifq","aprq","ygq","kbq","afyq","afmq","stpq","sprq","sfyq","gtl","stl","btl","bus","hn","fin","faiz","faal","kmb","fwd","tlg","nk"], top=()=>Object.fromEntries(K.map(k=>[k,0])), ek=(t,o)=>{ for(const k of K) t[k]+=o[k]; };
  const T=top(); for(const o of satir) ek(T,o);
  // özet kutuları
  const ut=(v,t)=>t?(v<0?"−":"")+nf2.format(Math.abs(v/t)):"–", md=v=>(v<0?"−":"")+nf1.format(Math.abs(v)/1e6);
  const kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  const mtl=v=>(v<0?"−":"")+nf1.format(Math.abs(v)/1e6), pm=(v,m)=>m?(v<0?"−":"")+nf.format(Math.abs(v/m)):"–";
  $("st-kpi").innerHTML=kt("Satış",nf.format(T.m3)+" m³",`${nf.format(T.q)} t · ${new Set(satir.map(o=>o.i)).size} gün · ${new Set(satir.map(o=>o.j)).size} ithalat beyannamesi · ${new Set(satir.map(o=>o.lot)).size} lot`)
    +kt("Satış geliri",mtl(T.gtl)+" M TL",`ortalama satış ${pm(T.sfyq,T.m3)} TL/m³ · alım ${pm(T.afmq,T.m3)} TL/m³`)
    +kt("Brüt kâr",mtl(T.btl)+" M TL",`${md(T.bus)} M $ · beyanname kuruyla`,T.btl<0?"neg":"pos")
    +kt("Net kâr",md(T.nk)+" M $",`${ut(T.nk,T.q)} $/t · hedge, finansman, gider, kur farkı dahil`,T.nk<0?"neg":"pos");
  $("st-sub").textContent=`${S.stU} · ${YIL||"2027–2028"} · ${MG?`müşteri satışları modelden (Musteri_Gunluk) · ${Mu.length} dağıtıcı`:"müşteri payları "+(V.minAlim&&V.minAlim.n?`asgari alım eşiğini geçen ${Mu.length} dağıtıcı`:`${Mu.length} dağıtıcı`)} · satışlar ithalat beyannamelerinden FIFO`;
  // gruplama
  const GOR={gun:{ad:"Günlük satırlar",anah:o=>o.i+"|"+o.m.s+"|"+o.j},musteri:{ad:"Müşteri özeti",anah:o=>o.m.s},lot:{ad:"Lot özeti",anah:o=>o.lot},alt:{ad:"Alt lot (ithalat beyannamesi) özeti",anah:o=>o.j},ay:{ad:"Aylık özet",anah:o=>ayK(o.i)}}[S.stGor];
  let R; if(S.stGor==="gun") R=satir; else { const M=new Map(); for(const o of satir){ const k=GOR.anah(o); let t=M.get(k); if(!t){ t=Object.assign(top(),{i:o.i,i2:o.i,j:o.j,lot:o.lot,m:o.m,n:0,gn:new Set()}); M.set(k,t); } ek(t,o); t.i2=o.i; t.n++; t.gn.add(o.i); } R=[...M.values()]; }
  const sr=S.stSr;
  const kolB={gun:[["Tarih",o=>tS(o.i)],["Müşteri",o=>esc(o.m.ad)],["Lot",o=>`<button type="button" class="st-lk" data-lot="${o.lot}">${esc(lotAd(o.lot))}</button>`],["Alt lot",o=>`<span title="Beyanname ${tS(D.alt[o.j][1])} · ${nf.format(D.alt[o.j][2])} t">${altAd(D.alt[o.j])}</span>`]],
    musteri:[["Müşteri",o=>esc(o.m.ad)],["Pay",o=>"%"+nf1.format(o.m.w*100)],["Prim TL/m³",o=>nf.format(o.m.prim)]],
    lot:[["Lot",o=>`<button type="button" class="st-lk" data-lot="${o.lot}">${esc(lotAd(o.lot))}</button>`],["Antrepo beyannamesi",o=>tI((LM.get(o.lot)||[])[4])],["Satış dönemi",o=>tS(o.i)+" – "+tS(o.i2)]],
    alt:[["Alt lot",o=>altAd(D.alt[o.j])],["Beyanname tarihi",o=>tS(D.alt[o.j][1])],["Lot",o=>`<button type="button" class="st-lk" data-lot="${o.lot}">${esc(lotAd(o.lot))}</button>`]],
    ay:[["Ay",o=>ayA(ayK(o.i))],["Gün",o=>nf.format(o.gn.size)]]}[S.stGor];
  // sütunlar: [anahtar, başlık, sınıf, biçim, değer]; $/t sütunları ton ağırlıklı (toplam / ton)
  const dl=v=>(v<0?"−":"")+nf.format(Math.abs(v)), pt=v=>(v<0?"−":"")+nf2.format(Math.abs(v)), wm=k=>o=>o.m3?o[k]/o.m3:0, wt=k=>o=>o.q?o[k]/o.q:0;   // satış birim fiyatları m³, alım birim fiyatları ton ağırlıklı
  const kolS=[["q","Miktar (ton)","",pt,o=>o.q],["m3","Miktar (m³)","",pt,o=>o.m3],
    ["cif","CIF Med ($/t)","ga",pt,wt("cifq")],["apr","Alım primi ($/t)","ga",pt,wt("aprq")],["kes","Yoğunluk (t/m³)","ga",v=>nf3.format(v),wt("ygq")],["kb","Beyanname kuru","ga",v=>nf4.format(v),wt("kbq")],["afy","Alım fiyatı (TL/t)","ga",pt,wt("afyq")],["afm","Alım fiyatı (TL/m³)","ga ara",pt,wm("afmq")],
    ["stp","Tüpraş (TL/m³)","gs",pt,wm("stpq")],["spr","Satış primi (TL/m³)","gs",pt,wm("sprq")],["sfy","Satış fiyatı (TL/m³)","gs ara",pt,wm("sfyq")],
    ["gtl","Satış geliri (TL)","g1",pt,o=>o.gtl],["stl","Satılan malın maliyeti (TL)","g1",pt,o=>o.stl],["btl","Brüt kâr (TL)","g1 ara",pt,o=>o.btl],["bus","Brüt kâr ($)","g1 ara",pt,o=>o.bus],
    ["hn","Ürün hedge","g2",pt,o=>o.hn],["fin","Stok ve alacak finansmanı","g2",pt,o=>o.fin],["faiz","Faiz geliri (ÖTV/KDV nakdi)","g2",pt,o=>o.faiz],["faal","Faaliyet giderleri","g2",pt,o=>o.faal],
    ["kmb","Kambiyo","g3",pt,o=>o.kmb],["fwd","Forward","g3",pt,o=>o.fwd],...(NK?[["tlg","TL tahsilat getirisi","g3",pt,o=>o.tlg]]:[]),["nk","Net kâr ($)","son",pt,o=>o.nk],["nt","Net $/t","son",pt,o=>o.q?o.nk/o.q:0]];
  const KV=Object.fromEntries(kolS.map(c=>[c[0],c[4]])), hc=(k,v)=>k==="btl"||k==="bus"||k==="nk"||k==="nt"?(v<0?" n":" p"):"";
  if(sr&&KV[sr.k]) R=[...R].sort((a,b)=>sr.y*(KV[sr.k](a)-KV[sr.k](b)));
  const PS=150, sf=Math.max(0,Math.min(S.stSf,Math.ceil(R.length/PS)-1)); S.stSf=sf; const RP=R.slice(sf*PS,sf*PS+PS);
  const th=`<thead><tr class="st-gr"><th class="l" colspan="${kolB.length}"></th><th colspan="2">Miktar</th><th colspan="6" class="ga">Alım fiyatı</th><th colspan="3" class="gs">Satış fiyatı</th><th colspan="4" class="g1">Brüt kâr</th><th colspan="4" class="g2">Hedge, finansman, faiz, gider ($)</th><th colspan="2" class="g3">Kur farkı ($)</th><th colspan="2" class="son">Sonuç</th></tr>`
    +`<tr>${kolB.map(([l])=>`<th class="l">${l}</th>`).join("")}${kolS.map(([k,l,c])=>`<th class="${c} st-so" data-k="${k}"${sr&&sr.k===k?` aria-sort="${sr.y<0?"descending":"ascending"}"`:""}>${l}${sr&&sr.k===k?(sr.y<0?" ↓":" ↑"):""}</th>`).join("")}</tr></thead>`;
  const tr=(o,cls)=>`<tr${cls?` class="${cls}"`:""}>${kolB.map(([,f],x)=>`<td class="l">${cls==="top"?(x?"":"<b>Toplam</b>"):f(o)}</td>`).join("")}${kolS.map(([k,,c,f,vf])=>{ const v=vf(o); return `<td class="${(c||"").replace("ara","").trim()}${/ara/.test(c||"")?" st-ara":""}${hc(k,v)}">${f(v)}</td>`; }).join("")}</tr>`;
  $("st-th").textContent=GOR.ad; $("st-tsub").textContent=`${nf.format(R.length)} satır · TL ve $${S.stGor==="gun"&&S.stMu===""?" · her gün × müşteri × alt lot":""}`;
  $("st-tab").innerHTML=th+`<tbody>${RP.map(o=>tr(o)).join("")||`<tr><td class="l" colspan="${kolB.length+kolS.length}">Seçime uyan satış yok.</td></tr>`}</tbody>${R.length?`<tfoot>${tr(T,"top")}</tfoot>`:""}`;   // kullanıcı 04.11.2026 10:52: toplam altta
  for(const h of $("st-tab").querySelectorAll("th.st-so")) h.onclick=()=>{ const k=h.dataset.k; S.stSr=S.stSr&&S.stSr.k===k?(S.stSr.y<0?{k,y:1}:null):{k,y:-1}; S.stSf=0; satislar(); };
  for(const b of $("st-tab").querySelectorAll("button.st-lk")) b.onclick=()=>{ S.stLot=b.dataset.lot; S.stSf=0; satislar(); };
  const ns=Math.ceil(R.length/PS); $("st-sayfa").innerHTML=ns>1?`<button type="button" class="btn kg-ok" id="st-p0" aria-label="Önceki sayfa"${sf?"":" disabled"}>‹</button><span>${sf+1} / ${ns}</span><button type="button" class="btn kg-ok" id="st-p1" aria-label="Sonraki sayfa"${sf<ns-1?"":" disabled"}>›</button><span class="muted">${PS} satır / sayfa</span>`:"";
  if(ns>1){ $("st-p0").onclick=()=>{ S.stSf--; satislar(); }; $("st-p1").onclick=()=>{ S.stSf++; satislar(); }; }
  $("st-not").innerHTML=`<b>Hesap (model ile aynı tanım):</b> Alım fiyatı TL/t = (CIF Med fiyatlama ortalaması, 2 ondalık + alım primi) × ithalat beyannamesi kuru × 0,845 / gerçek yoğunluk (0,845 Platts CIF Med referans yoğunluğu; kargo yoğunluğu modelde girdi, varsayılan 0,835). Alım fiyatı TL/m³ = TL/t × gerçek yoğunluk (= (CIF + prim) × kur × 0,845; satış fiyatıyla karşılaştırma için). Satılan malın maliyeti = satılan ton × alım fiyatı TL/t. Satış: m³ = ton / 0,835; satış fiyatı TL/m³ = satış günü Tüpraş vergisiz (2 ondalık) + müşterinin satış primi (Mersin üçüncü taraf ${nf.format((SD.prim||{}).M||0)}, Tüpraş Mersin / Batman / Kırıkkale ${nf.format((SD.prim||{}).D||0)} TL/m³); gelir = m³ × satış fiyatı. Brüt kâr $ = brüt kâr TL / beyanname kuru. Net kâr $ = brüt kâr $ + ürün hedge (lottan) + stok ve alacak finansmanı (lottan) + faiz geliri ve faaliyet giderleri (elleçleme, fire dahil; yıl ortalaması) + kambiyo ve forward (alt lottan). Tutarlar kâra katkıdır: + kazanç, − gider. ${MG?"Müşteri bazında günlük satış ve gelir modelin Musteri_Gunluk sayfasından (dağıtıcının alım ritmi: günlük / 2 günde bir / haftalık – Dagiticilar H–I); o günün satışı ithalat beyannamelerine FIFO ile dağıldıktan sonra müşterilere günlük alımları oranında bölünür.":"Model günlük satışı müşteri bazında vermez; her günün satışı dağıtıcıların akış tablosundaki payıyla bölünür."}`;
  // CSV (filtredeki tüm satırlar)
  $("st-csv").onclick=()=>{ const n2=v=>(Math.round(v*100)/100).toString().replace(".",","), bs=kolB.map(([l])=>l), ks=kolS.map(([,l])=>l);
    const tx=h=>String(h).replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/;/g,",");
    const n4=v=>(Math.round(v*1e4)/1e4).toString().replace(".",","), sat=R.map(o=>[...kolB.map(([,f])=>tx(f(o))),...kolS.map(c=>(["kes","kb"].includes(c[0])?n4:n2)(c[4](o)))].join(";"));
    const b=new Blob(["\ufeff"+[[...bs,...ks].join(";"),...sat].join("\r\n")],{type:"text/csv;charset=utf-8"}), ad=`gts_satislar_${S.stU.toLowerCase()}_${S.stGor}${YIL?"_"+YIL:""}.csv`;
    if(ST_DL){ ST_DL.save({filename:ad,data:b}).catch(e=>{ if(e&&e.code!=="declined") $("st-tsub").textContent="CSV kaydedilemedi ("+(e.code||"hata")+")"; }); return; }   // claude.ai yayınında: indirme izni
    const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=ad; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500); };
  $("st-csv").hidden=ST_DL===false;
  // lot → alt lot ağacı
  { const sec=S.stLot!==""?+S.stLot:null; let h;
    if(sec==null){ const NK=new Map(); for(const o of satir) NK.set(o.lot,(NK.get(o.lot)||0)+o.nk);
      h=`<thead><tr><th class="l">Lot (gemi)</th><th class="l">Antrepo beyannamesi</th><th>Ton</th><th>İthalat beyannamesi</th><th>Satılan t</th><th>Net kâr $</th></tr></thead><tbody>`+lotlar.map(n=>{ const l=LM.get(n)||[], A=D.alt.map((a,j)=>[a,j]).filter(([a])=>a[0]===n), st=A.reduce((s,[,j])=>s+AS[j][0],0), v=NK.get(n)||0;
        return `<tr data-lot="${n}" tabindex="0"><td class="l">${esc(lotAd(n))}</td><td class="l">${tI(l[4])}</td><td>${nf.format(l[2]||0)}</td><td>${A.length} adet · ${nf.format(A.reduce((s,[a])=>s+a[2],0))} t</td><td>${nf.format(st)}</td><td class="${v<0?"n":"p"}">${dl(v)}</td></tr>`; }).join("")+`</tbody>`;
      $("st-lsub").textContent=`${lotlar.length} lot · satıra tıklayınca lot seçilir`; }
    else { const l=LM.get(sec)||[], A=D.alt.map((a,j)=>[a,j]).filter(([a])=>a[0]===sec);
      h=`<thead><tr><th class="l">Alt lot</th><th class="l">Beyanname</th><th>Ton</th><th>Satılan t</th><th>Kalan t</th><th class="l">Satış dönemi</th><th>Kambiyo $/t</th><th>Forward $/t</th></tr></thead><tbody>`
        +`<tr class="top"><td class="l"><b>${esc(lotAd(sec))}</b></td><td class="l">antrepo ${tI(l[4])}</td><td><b>${nf.format(l[2]||0)}</b></td><td colspan="5" class="l muted">B/L ${nf.format(l[3]||0)} t · varış ${tI(l[5])} · COD ${tI(l[10])} · alış ${nf2.format(l[6]||0)} $/t</td></tr>`
        +A.map(([a,j])=>{ const s=AS[j]; return `<tr><td class="l">${altAd(a)}</td><td class="l">${tS(a[1])}</td><td>${nf.format(a[2])}</td><td>${nf.format(s[0])}</td><td>${nf.format(Math.max(0,a[2]-s[0]))}</td><td class="l">${s[1]!=null?tS(s[1])+(s[2]!==s[1]?" – "+tS(s[2]):""):"–"}</td><td class="${a[4]<0?"n":a[4]>0?"p":""}">${ut(a[4],1)}</td><td class="${a[5]<0?"n":a[5]>0?"p":""}">${ut(a[5],1)}</td></tr>`; }).join("")+`</tbody>`;
      $("st-lsub").innerHTML=`${A.length} ithalat beyannamesi · <button type="button" class="st-lk" id="st-lot0">tüm lotlar</button>`; }
    $("st-lotlar").innerHTML=h; for(const r of $("st-lotlar").querySelectorAll("tr[data-lot]")){ const f=()=>{ S.stLot=r.dataset.lot; S.stSf=0; satislar(); }; r.onclick=f; r.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); f(); } }; }
    if($("st-lot0")) $("st-lot0").onclick=()=>{ S.stLot=""; S.stSf=0; satislar(); }; }
  // model ile mutabakat (yıl, filtresiz, tüm müşteriler)
  { const MT=SD.mut||{}, ys=YIL?[+YIL]:[2027,2028], t={}; for(const y of ys) t[y]=top();
    for(const [i,j,q] of D.sat){ const y=yl(i); if(!t[y]) continue; const a=D.alt[j], l=LM.get(a[0]); if(!l||D.gTL[i]==null||!D.kur[i]) continue; const g=MG&&MG[i]; let sp=(SD.prim||{}).ort; if(g){ let tt=0,tp=0; for(const [c,tq] of g){ tt+=tq; tp+=tq*(D.mus[c][2]||0); } if(tt) sp=tp/tt; } ek(t[y],kal(i,a,l,q,D.gTL[i],sp)); }   // paket 88: müşteri primi günlük ağırlıklı (Musteri_Gunluk) – KPI ile aynı
    const mv=(k,y)=>(MT[k]||[0,0])[y===2027?0:1], sm=f=>ys.reduce((a,y)=>a+f(y),0);
    const sat=MT.tl?[["Satış geliri (M TL)",y=>t[y].gtl,y=>mv("gtl",y)],["Satılan malın maliyeti (M TL)",y=>-t[y].stl,y=>-mv("stl",y)],["Brüt kâr (M TL)",y=>t[y].btl,y=>mv("btl",y),1],["Brüt kâr ($)",y=>t[y].bus,y=>mv("bus",y),1],["Ürün hedge",y=>t[y].hn,y=>-mv("hedge",y)],["Faaliyet giderleri, finansman, faiz",y=>t[y].fin+t[y].faiz+t[y].faal,y=>-mv("faal",y)],[NK?"Kur farkı (kambiyo + forward + TL getirisi)":"Kur farkı (kambiyo + forward)",y=>t[y].kmb+t[y].fwd+t[y].tlg,y=>mv("kur",y)],["Net kâr ($)",y=>t[y].nk,y=>mv("nk",y),1]]
      :[["Brüt kâr ($)",y=>t[y].bus,null,1],["Net kâr ($)",y=>t[y].nk,y=>mv("nk",y),1]];
    $("st-mut").innerHTML=`<thead><tr><th class="l">${ys.join(" + ")}</th><th>Rapor</th><th>Model</th><th>Fark</th></tr></thead><tbody>`+sat.map(([l,r,m,b])=>{ const a=sm(r), c=m?sm(m):null, d=c==null?null:a-c; return `<tr${b?' class="top"':""}><td class="l">${b?"<b>"+l+"</b>":l}</td><td>${md(a)}</td><td>${c==null?"–":md(c)}</td><td class="${d==null||Math.abs(d)<5e4?"muted":d<0?"n":"p"}">${d==null?"":md(d)}</td></tr>`; }).join("")+`</tbody>`;
    $("st-mnot").textContent=MT.tl&&NK?"Model aynı tanımı kullanıyor: SMM beyanname parçalarına FIFO ile (kargo sınırını aşan beyanname iki parça), stok ve alacak finansmanı, USD kredi kur farkı ve TL tahsilat getirisi satış günü nakit akışından (gün içinde satış tonuyla dağıtılır). Yıllık giderler ton başına ortalamayla dağıtılır.":MT.tl?"Model aynı tanımı kullanıyor (paket 85). Kalan fark: model her satış gününü tek bir ithalat beyannamesine (satışın orta noktası) bağlar, rapor satışı beyanname parçalarına FIFO ile böler; lot geçiş günlerinde alım fiyatı ve kur biraz farklı düşer. Yıllık giderler ton başına ortalamayla dağıtılır.":"Bu raporun brüt kârı kullanıcı hesap şablonuyla (TL/m³ fiyatlar, alımda CIF + prim × kur × 0,845/0,835, m³ = ton/0,835) hesaplanır; modelin brüt kârı satış penceresi ortalama fiyatı ve alış maliyetinin tamamıyla (navlun farkı, ikinci liman, elleçleme, fire dahil) $ cinsindendir. Model satırları karşılaştırma içindir; ürün hedge, giderler ve kur farkı iki hesapta aynı kaynaktan gelir."; }
}
/* ---------- RAKİP ANALİZİ (kullanıcı 09.11.2026 10:04): GTS etki alanında hangi dağıtıcı, hangi tedarikçiden (ithalatçı / rafineri), hangi maliyetle motorin alıyor.
   Kaynak: SCN_GTS_RAKIP_MALIYET_V2 (PDM analizi – resmî değil). Maliyet TL/m³, vergisiz; yükleme noktasında ve bölgeye teslim (+ Leg2 navlun). ---------- */
function rakip(){
  const RK=V.rakip; if(!RK||!RK.satir||!RK.satir.length){ $("rk-tab").innerHTML=`<tbody><tr><td class="l">Bu pakette rakip maliyet analizi (SCN_GTS_RAKIP_MALIYET_V2) yok.</td></tr></tbody>`; return; }
  const I=Object.fromEntries(RK.kol.map((k,i)=>[k,i])), g0=(r,k)=>r[I[k]],
    // kullanıcı 09.11.2026 21:31 ("2"): ithalatçısı belirsiz "İthalat (genel)" akışı dağıtıcının kendi ithalatıyla birleştirilir (maliyet kuralı aynı)
    g=(r,k)=>k==="Kaynak"&&r[I.Tip]==="İthal"&&r[I.Kaynak]==="İthalat"&&!/^GTS/.test(r[I.Sirket])?r[I.Sirket]:r[I[k]];
  const yillar=[...new Set(RK.satir.map(r=>g(r,"Yil")))].sort(); if(!S.rkY||!yillar.includes(S.rkY)) S.rkY=yillar.includes(+YIL)?+YIL:yillar[0];
  if(!S.rkT) S.rkT="tum"; if(!S.rkO) S.rkO="yuk"; if(S.rkS==null) S.rkS=""; if(!S.rkG) S.rkG="kaynak";
  const tes=S.rkO==="tes", mk=r=>tes?g(r,"Bolgeye_teslim_TL_m3"):g(r,"Alim_maliyeti_TL_m3"), fk=r=>tes?g(r,"GTS_farki_teslim_TL_m3"):g(r,"GTS_farki_TL_m3");
  const Y=RK.satir.filter(r=>g(r,"Yil")===S.rkY), GR=Y.filter(r=>/^GTS/.test(g(r,"Sirket"))), R0=Y.filter(r=>!/^GTS/.test(g(r,"Sirket")));
  const gts=Y.length?mk(Y[0])-fk(Y[0]):null;   // GTS referansı: maliyet − GTS farkı (tüm satırlarda aynı)
  // dağıtıcı listesi
  const SH=new Map(); for(const r of R0){ const s=g(r,"Sirket"), o=SH.get(s)||SH.set(s,{t:0,ti:0}).get(s); o.t+=g(r,"Hacim_t"); if(g(r,"Tip")==="İthal") o.ti+=g(r,"Hacim_t"); }
  const sirk=[...SH.entries()].sort((a,b)=>b[1].t-a[1].t); if(S.rkS&&!SH.has(S.rkS)) S.rkS="";
  $("rk-sir").innerHTML=`<option value="">Tüm dağıtıcılar (${sirk.length})</option>`+sirk.map(([s,o])=>`<option value="${esc(s)}">${esc(s)} · ${nf.format(o.t/1e3)} kt</option>`).join(""); $("rk-sir").value=S.rkS;
  $("rk-sir").onchange=e=>{ S.rkS=e.target.value; rakip(); };
  const seg=(id,k,f)=>{ for(const b of $(id).querySelectorAll("button")){ b.setAttribute("aria-pressed",String(String(b.dataset[k])===String(S[f]))); b.onclick=()=>{ S[f]=k==="y"?+b.dataset.y:b.dataset[k]; rakip(); }; } };
  $("rk-yil").innerHTML=yillar.map(y=>`<button type="button" data-y="${y}">${y}</button>`).join(""); seg("rk-yil","y","rkY"); seg("rk-tip","t","rkT"); seg("rk-olc","o","rkO"); seg("rk-gor","g","rkG");
  const R=R0.filter(r=>(!S.rkS||g(r,"Sirket")===S.rkS)&&(S.rkT==="tum"||(S.rkT==="ith")===(g(r,"Tip")==="İthal")));
  const top=(L)=>{ let t=0,m=0,f=0; for(const r of L){ const h=g(r,"Hacim_t"); t+=h; m+=h*mk(r); f+=h*fk(r); } return {t,m:t?m/t:null,f:t?f/t:null}; };
  const A=top(R), Ri=top(R.filter(r=>g(r,"Tip")==="İthal")), Ry=top(R.filter(r=>g(r,"Tip")==="Yerli"));
  const tl=v=>v==null?"–":nf.format(Math.round(v)), fr=v=>v==null?"–":(v>0?"+":v<0?"−":"")+nf.format(Math.abs(Math.round(v))), fc=v=>v==null||Math.abs(v)<0.5?"":v>0?"p":"n";
  const kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  $("rk-kpi").innerHTML=kt("GTS alım maliyeti",tl(gts)+" TL/m³",`ithal, GTS koşulları · ${tes?"bölgeye teslim":"Dörtyol terminalinde"}`)
    +kt(S.rkS?esc(S.rkS)+" ortalaması":"Rakip ortalaması",tl(A.m)+" TL/m³",`${nf.format(A.t/1e3)} kt · GTS'e göre ${fr(A.f)} TL/m³`,A.f>0?"pos":A.f<0?"neg":"")
    +kt("İthal",Ri.t?tl(Ri.m)+" TL/m³":"–",`hacmin %${nf1.format(A.t?Ri.t/A.t*100:0)} · GTS'e göre ${fr(Ri.f)}`)
    +kt("Yerli (rafineri)",Ry.t?tl(Ry.m)+" TL/m³":"–",`hacmin %${nf1.format(A.t?Ry.t/A.t*100:0)} · GTS'e göre ${fr(Ry.f)}`);
  $("rk-sub").textContent=`GTS etki alanındaki iller · motorin · ${S.rkY} Makul yol · TL/m³, vergisiz · + = rakip GTS'den pahalı (GTS avantajı)`;
  // tedarikçi grafiği: kaynak (ithalatçı / rafineri) ya da yükleme noktası bazında, hacim ağırlıklı
  { const anah=r=>S.rkG==="kaynak"?g(r,"Kaynak")+"|"+g(r,"Tip"):g(r,"Yukleme_noktasi")+"|"+g(r,"Tip"), M=new Map();
    for(const r of R){ const k=anah(r); (M.get(k)||M.set(k,[]).get(k)).push(r); }
    const L=[...M.entries()].map(([k,rs])=>{ const [ad,tip]=k.split("|"), o=top(rs); return {ad,tip,...o,alt:S.rkG==="kaynak"?[...new Set(rs.map(r=>g(r,"Yukleme_noktasi")))].length+" yükleme noktası":[...new Set(rs.map(r=>g(r,"Kaynak")))].join(", ")}; }).sort((a,b)=>a.m-b.m);
    const vs=[gts,...L.map(x=>x.m)].filter(v=>v!=null), lo=Math.floor((Math.min(...vs)-300)/500)*500, hi=Math.ceil((Math.max(...vs)+150)/500)*500, W=920, sol=250, sag=150, sh=30, H=L.length*sh+44, x=v=>sol+(v-lo)/(hi-lo)*(W-sol-sag), mx=Math.max(...L.map(o=>o.t),1);
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tedarikçi bazında alım maliyeti"><g class="rk-ax">`;
    for(let v=lo;v<=hi;v+=500) s+=`<line x1="${x(v)}" x2="${x(v)}" y1="18" y2="${H-20}" stroke="#E3E8EB"/><text x="${x(v)}" y="${H-6}" text-anchor="middle">${nf.format(v)}</text>`;
    s+=`</g><line x1="${x(gts)}" x2="${x(gts)}" y1="12" y2="${H-20}" stroke="${C.gts}" stroke-width="2"/><text x="${x(gts)+4}" y="12" class="rk-gl">GTS ${tl(gts)}</text>`;
    L.forEach((o,i)=>{ const y=24+i*sh, ren=o.tip==="İthal"?C.mot:"#C8641C", w=Math.max(2,x(o.m)-x(lo));
      s+=`<g><text x="${sol-10}" y="${y+12}" text-anchor="end" class="rk-ad">${esc(o.ad)}<tspan class="rk-al" x="${sol-10}" dy="12">${o.tip} · ${esc(o.alt).slice(0,44)}</tspan></text>
        <rect x="${x(lo)}" y="${y}" width="${w}" height="16" rx="2" fill="${ren}" fill-opacity="${0.35+0.65*Math.sqrt(o.t/mx)}"><title>${esc(o.ad)} (${o.tip}): ${tl(o.m)} TL/m³ · ${nf.format(o.t/1e3)} kt · GTS'e göre ${fr(o.f)}</title></rect>
        <text x="${x(o.m)+6}" y="${y+12}" class="rk-v">${tl(o.m)} <tspan class="${o.f>0?"rk-p":o.f<0?"rk-n":""}">${fr(o.f)}</tspan> · ${nf.format(o.t/1e3)} kt</text></g>`; });
    $("rk-graf").innerHTML=s+`</svg>`; $("rk-gsub").textContent=`${L.length} ${S.rkG==="kaynak"?"tedarikçi":"yükleme noktası"} · çubuk koyuluğu hacme göre · mavi ithal, turuncu yerli · sarı çizgi GTS`; }
  // ayrıntı tablosu: dağıtıcı × yükleme noktası × tedarikçi (aynı anahtarlı satırlar birleştirilir)
  { const M=new Map(); for(const r of R){ const k=[g(r,"Sirket"),g(r,"Yukleme_noktasi"),g(r,"Kaynak"),g(r,"Tip")].join("|"); const o=M.get(k); if(o){ o.h+=g(r,"Hacim_t"); } else M.set(k,{r,h:g(r,"Hacim_t")}); }
    let L=[...M.values()]; const sk=S.rkSr; const KOL=[["Dağıtıcı",o=>esc(g(o.r,"Sirket")),"l"],["Yükleme noktası",o=>esc(g(o.r,"Yukleme_noktasi"))+`<small>${esc(g(o.r,"Il")||"")}</small>`,"l"],["Tedarikçi",o=>esc(g(o.r,"Kaynak"))+`<small>${esc(g(o.r,"Fiyat_bazi")||"")}</small>`,"l"],["Tip",o=>`<span class="pill ${g(o.r,"Tip")==="İthal"?"i":"d"}">${g(o.r,"Tip")}</span>`,"l"],
      ["Hacim (kt)",o=>nf1.format(o.h/1e3),"",o=>o.h],["Liste / ürün",o=>tl(g(o.r,"Tip")==="İthal"?g(o.r,"Urun_TL_m3"):g(o.r,"Liste_TL_m3")),"ga",o=>g(o.r,"Tip")==="İthal"?g(o.r,"Urun_TL_m3"):g(o.r,"Liste_TL_m3")],["Ciro + perf. primi",o=>fr(g(o.r,"Prim_TL_m3")||0),"ga",o=>g(o.r,"Prim_TL_m3")||0],["Vade",o=>fr(g(o.r,"Vade_degeri_TL_m3")||0),"ga",o=>g(o.r,"Vade_degeri_TL_m3")||0],
      ["İthalat gideri",o=>fr(g(o.r,"Ic_gider_TL_m3")||0),"ga",o=>g(o.r,"Ic_gider_TL_m3")||0],["Elleçleme",o=>fr(g(o.r,"Ellecleme_TL_m3")||0),"ga",o=>g(o.r,"Ellecleme_TL_m3")||0],["Vergi finansmanı",o=>fr(g(o.r,"Vergi_fin_TL_m3")||0),"ga",o=>g(o.r,"Vergi_fin_TL_m3")||0],["Taşıma (kabotaj / demiryolu)",o=>fr(g(o.r,"Tasima_TL_m3")||0),"ga",o=>g(o.r,"Tasima_TL_m3")||0],
      ["Alım maliyeti",o=>`<b>${tl(g(o.r,"Alim_maliyeti_TL_m3"))}</b>`,"ga",o=>g(o.r,"Alim_maliyeti_TL_m3")],["GTS farkı",o=>`<span class="${fc(g(o.r,"GTS_farki_TL_m3"))}">${fr(g(o.r,"GTS_farki_TL_m3"))}</span>`,"",o=>g(o.r,"GTS_farki_TL_m3")],
      ["Leg2 navlun",o=>fr(g(o.r,"Bolgeye_teslim_TL_m3")-g(o.r,"Alim_maliyeti_TL_m3")),"gs",o=>g(o.r,"Bolgeye_teslim_TL_m3")-g(o.r,"Alim_maliyeti_TL_m3")],["Bölgeye teslim",o=>`<b>${tl(g(o.r,"Bolgeye_teslim_TL_m3"))}</b>`,"gs",o=>g(o.r,"Bolgeye_teslim_TL_m3")],["GTS farkı (teslim)",o=>`<span class="${fc(g(o.r,"GTS_farki_teslim_TL_m3"))}">${fr(g(o.r,"GTS_farki_teslim_TL_m3"))}</span>`,"gs",o=>g(o.r,"GTS_farki_teslim_TL_m3")]];
    if(sk!=null&&KOL[sk]&&KOL[sk][3]) L.sort((a,b)=>S.rkSy*(KOL[sk][3](a)-KOL[sk][3](b))); else L.sort((a,b)=>b.h-a.h);
    $("rk-tab").innerHTML=`<thead><tr>${KOL.map(([l,,c,v],i)=>`<th class="${c||""}${v?" st-so":""}" data-i="${i}"${sk===i?` aria-sort="${S.rkSy<0?"descending":"ascending"}"`:""}>${l}${sk===i?(S.rkSy<0?" ↓":" ↑"):""}</th>`).join("")}</tr></thead><tbody>`
      +L.map(o=>`<tr>${KOL.map(([,f,c])=>`<td class="${c||""}">${f(o)}</td>`).join("")}</tr>`).join("")+`</tbody>`;
    for(const h of $("rk-tab").querySelectorAll("th.st-so")) h.onclick=()=>{ const i=+h.dataset.i; if(S.rkSr===i) S.rkSy=-S.rkSy; else { S.rkSr=i; S.rkSy=-1; } rakip(); };
    $("rk-tsub").textContent=`${L.length} satır · dağıtıcı × yükleme noktası × tedarikçi · TL/m³`; }
  // dağıtıcı özeti (tıklayınca filtre)
  { const L=sirk.map(([s,o])=>{ const rs=R0.filter(r=>g(r,"Sirket")===s), a=top(rs); return {s,t:o.t,ti:o.ti,...a}; });
    $("rk-oz").innerHTML=`<thead><tr><th class="l">Dağıtıcı</th><th>Hacim (kt)</th><th>İthal payı</th><th>Ort. maliyet</th><th>GTS farkı</th></tr></thead><tbody>`
      +L.map(o=>`<tr data-s="${esc(o.s)}" tabindex="0"${o.s===S.rkS?' aria-selected="true"':""}><td class="l">${esc(o.s)}</td><td>${nf.format(o.t/1e3)}</td><td>%${nf1.format(o.t?o.ti/o.t*100:0)}</td><td>${tl(o.m)}</td><td class="${fc(o.f)}">${fr(o.f)}</td></tr>`).join("")+`</tbody>`;
    for(const tr of $("rk-oz").querySelectorAll("tr[data-s]")){ const f=()=>{ S.rkS=S.rkS===tr.dataset.s?"":tr.dataset.s; rakip(); }; tr.onclick=f; tr.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); f(); } }; } }
  $("rk-not").innerHTML=`<b>${esc(RK.durum||"PDM analizi")}.</b> İthal = GTS ile aynı koşullar: (CIF Med + prim) × kur × 0,845 + ithalat iç giderleri + terminal elleçlemesi. Yerli = rafineri vergisiz liste fiyatı (İzmit RSF ve nokta farkı; her satırın fiyat bazı tedarikçi adının altında) − dağıtıcının 2026 rafineri koşullarına göre ciro ve performans primi ± vade değeri + ÖTV/KDV finansmanı + kabotaj / demiryolu taşıması. Bölgeye teslim = + ortalama Leg2 navlunu. Bayi başka dağıtıcıdan alıyorsa koşul sahibi o dağıtıcıdır; toptan marjı dahil değildir. Rafineriden doğrudan almayan küçük dağıtıcıların gerçek maliyeti burada gösterilenden yüksek olabilir.`;
}
/* ---------- NAKİT AKIŞI (kullanıcı 09.11.2026 20:11 "ekle"): modelin Nakit_Akisi sayfası (paket 105+). Giriş +, çıkış −; bakiye 1.1.2027'de sıfırdan başlar,
   finansman öncesidir (faiz ve kredi kur farkı Kârlılık'ta). USD gösterimde her gün o günün kuruyla çevrilir. ---------- */
function nakit(){
  const N=V.nakit; if(!N||!N.g||!N.g.length){ $("nk-kpi").innerHTML=`<p class="not">Bu pakette günlük nakit akışı (Nakit_Akisi) yok; paket 105 ve sonrası gerekir.</p>`; for(const id of ["nk-graf","nk-ay"]) $(id).innerHTML=""; $("nk-tab").innerHTML=""; return; }
  if(!S.nkB) S.nkB="tl"; if(!S.nkA) S.nkA="ozet";
  for(const [id,k,f] of [["nk-bir","b","nkB"],["nk-ayr","a","nkA"]]) for(const b of $(id).querySelectorAll("button")){ b.setAttribute("aria-pressed",String(b.dataset[k]===S[f])); b.onclick=()=>{ S[f]=b.dataset[k]; nakit(); }; }
  const us=S.nkB==="usd", K=N.kur, cv=(v,i)=>us?v/(K[i]||1):v, B=us?"M $":"M TL", fm=v=>(v<0?"−":"")+(us?nf1:nf).format(Math.abs(v)), fk=v=>(v<0?"−":"")+(Math.abs(v)>=1000&&!us?nf2.format(Math.abs(v)/1e3)+" milyar":(us?nf1:nf).format(Math.abs(v))+(us?"":" milyon"))+(us?" M $":" TL");
  const i0=PEN.i0, n=Math.min(PEN.n,N.g.length-i0), G=N.g;
  // grup: giriş = satış + ÖTV + KDV tahsilatı; vergiler = ÖTV devlete + ithalat KDV + KDV beyanı + teminat komisyonu; diğer = beyanname + faaliyet; hedge = ürün + kur
  const grp=r=>({gir:r[0]+r[1]+r[2],kar:r[3],ver:r[4]+r[5]+r[6]+r[7],dig:r[8]+r[9],hed:r[10]+r[11]});
  const bak=G.map((r,i)=>cv(r[12],i));
  let mn=Infinity, mi=i0, ort=0, eksi=0, gir=0, cik=0; for(let i=i0;i<i0+n;i++) if(G[i][12]<G[mi][12]) mi=i; mn=Math.min(0,bak[mi])||bak[mi]; if(G[mi][12]>=0) mn=0;   // azami ihtiyaç günü TL bakiyesinden (USD'de o günün kuruyla)
  for(let i=i0;i<i0+n;i++){ const b=bak[i]; if(b<0){ ort-=b; eksi++; } const q=grp(G[i]); gir+=cv(q.gir+Math.max(0,q.hed),i); cik+=cv(q.kar+q.ver+q.dig+Math.min(0,q.hed),i); }
  const son=bak[i0+n-1], once=i0>0?bak[i0-1]:0, kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  $("nk-kpi").innerHTML=kt("Azami finansman ihtiyacı",mn<0?fk(-mn):"yok",mn<0?`${gunS(mi)} · ${us?nf.format(-G[mi][12])+" M TL":nf1.format(-G[mi][12]/(K[mi]||1))+" M $"}`:"bakiye hep artıda",mn<0?"neg":"")
    +kt("Ortalama finansman ihtiyacı",fk(ort/n),`eksi bakiyeli ${nf.format(eksi)} gün / ${nf.format(n)}`)
    +kt("Dönem sonu bakiye",fk(son),`${gunS(i0+n-1)}${i0>0?" · dönem başı "+fk(once):""}`,son<0?"neg":"pos")
    +kt("Giriş / çıkış",`${fm(gir)} / ${fm(cik)}`,`${B} · hedge net girişe ya da çıkışa`);
  $("nk-sub").textContent=`${YIL||"2027–2028"} · ${us?"USD, her gün o günün kuruyla":"TL"} · giriş +, çıkış − · finansman (faiz) öncesi`;
  // günlük bakiye
  zaman($("nk-graf"),{aria:"Günlük kümülatif nakit bakiyesi",h:240,sifir:true,fmt:v=>nf.format(v),seri:[{ad:"Kümülatif bakiye ("+B+")",renk:C.mot,v:bak,alan:true,kalin:2}],
    yatay:mn<0?[{v:mn,ad:"Azami ihtiyaç "+fm(mn)+" · "+gunS(mi),renk:C.neg}]:[]});
  // aylık
  const AYL=new Map(); for(let i=i0;i<i0+n;i++){ const d=gun(i), k=d.getUTCFullYear()*100+d.getUTCMonth(); let o=AYL.get(k); if(!o){ o={ad:AY[d.getUTCMonth()]+" "+String(d.getUTCFullYear()).slice(2),d:Array(12).fill(0),gir:0,kar:0,ver:0,dig:0,hed:0,mn:Infinity,son:0}; AYL.set(k,o); }
    const r=G[i], q=grp(r); r.slice(0,12).forEach((v,j)=>o.d[j]+=cv(v,i)); for(const x of ["gir","kar","ver","dig","hed"]) o[x]+=cv(q[x],i); o.mn=Math.min(o.mn,bak[i]); o.son=bak[i]; }
  const AL=[...AYL.values()]; for(const o of AL) o.net=o.gir+o.kar+o.ver+o.dig+o.hed;
  cubuk($("nk-ay"),{aria:"Aylık nakit akışı",h:230,kat:AL.map(a=>a.ad),fmt:v=>nf.format(v),etk:i=>i%(AL.length<=12?(W<600?2:1):(W<600?6:3))===0?AL[i].ad:"",
    seri:[{ad:"Tahsilat (satış + ÖTV + KDV)",renk:C.pos,v:AL.map(a=>a.gir)},{ad:"Kargo ödemesi",renk:C.mot,v:AL.map(a=>a.kar)},{ad:"Vergiler (ÖTV, KDV, teminat)",renk:C.kur,v:AL.map(a=>a.ver)},{ad:"Diğer giderler",renk:C.ink3,v:AL.map(a=>a.dig)},{ad:"Hedge (ürün + kur)",renk:C.gts,v:AL.map(a=>a.hed)}],
    cizgi:[{ad:"Ay sonu bakiye",renk:C.neg,v:AL.map(a=>a.son)}]});
  // tablo
  const KOL=S.nkA==="ayr"?[["Satış tahsilatı",o=>o.d[0]],["ÖTV tahsilatı",o=>o.d[1]],["KDV tahsilatı",o=>o.d[2]],["Kargo ödemesi",o=>o.d[3]],["ÖTV – devlete",o=>o.d[4]],["İthalat KDV",o=>o.d[5]],["KDV beyanı",o=>o.d[6]],["Teminat komisyonu",o=>o.d[7]],["Beyanname gideri",o=>o.d[8]],["Faaliyet giderleri",o=>o.d[9]],["Ürün hedge",o=>o.d[10]],["Kur hedge",o=>o.d[11]]]
    :[["Tahsilat",o=>o.gir],["Kargo ödemesi",o=>o.kar],["Vergiler",o=>o.ver],["Diğer giderler",o=>o.dig],["Hedge",o=>o.hed]];
  const T={d:Array(12).fill(0),gir:0,kar:0,ver:0,dig:0,hed:0,net:0}; for(const o of AL){ o.d.forEach((v,j)=>T.d[j]+=v); for(const x of ["gir","kar","ver","dig","hed","net"]) T[x]+=o[x]; }
  const hc=v=>`<td class="${v<-0.05?"n":""}">${Math.abs(v)<0.05?"–":fm(v)}</td>`;
  $("nk-tab").innerHTML=`<thead><tr><th class="l">Ay</th>${KOL.map(k=>`<th>${k[0]}</th>`).join("")}<th>Net akış</th><th>Ay sonu bakiye</th><th>Ay içi en düşük</th></tr></thead><tbody>`
    +AL.map(o=>`<tr><td class="l">${o.ad}</td>${KOL.map(k=>hc(k[1](o))).join("")}<td><b>${fm(o.net)}</b></td><td class="${o.son<0?"n":""}"><b>${fm(o.son)}</b></td><td class="${o.mn<0?"n":""}">${fm(o.mn)}</td></tr>`).join("")
    +`<tr class="top"><td class="l">Toplam</td>${KOL.map(k=>hc(k[1](T))).join("")}<td><b>${fm(T.net)}</b></td><td class="${son<0?"n":""}"><b>${fm(son)}</b></td><td class="${mn<0?"n":""}">${fm(mn)}</td></tr></tbody>`;
  $("nk-tsub").textContent=`${B} · ${AL.length} ay · ${S.nkA==="ayr"?"tüm kalemler":"gruplu"}`;
}
/* ---------- KARGOLAR (kullanıcı 03.11.2026 16:50): kargo yaşam döngüsü ---------- */
function kargolar(){
  const KD=V.kargo; if(!KD){ $("kg-cizgi").innerHTML=`<p class="not">Bu paketteki modelde kargo yaşam döngüsü verisi yok.</p>`; return; }
  const ur=Object.keys(KD); if(!S.kgU||!KD[S.kgU]) S.kgU=ur[0]; $("kg-urun-k").hidden=ur.length<2;
  for(const b of $("kg-urun").querySelectorAll("button")){ b.disabled=!KD[b.dataset.u]; b.onclick=()=>{ S.kgU=b.dataset.u; S.kgN=null; kargolar(); }; b.setAttribute("aria-pressed",String(b.dataset.u===S.kgU)); }
  const D=KD[S.kgU], K=D.k, g0=Date.parse(D.g0+"T00:00:00Z"), gi=s=>s?Math.round((Date.parse(s+"T00:00:00Z")-g0)/864e5):null, tS=i=>{ const d=new Date(g0+i*864e5); return d.getUTCDate()+" "+AY[d.getUTCMonth()]+" "+d.getUTCFullYear(); };
  const tk=s=>s?(d=>d.getUTCDate()+" "+AY[d.getUTCMonth()]+" "+d.getUTCFullYear())(new Date(s+"T00:00:00Z")):"–", gem=k=>k[0]===0?"Açılış stoğu":esc(k[1]||"");
  if(S.kgN==null||!K.some(k=>k[0]===S.kgN)) S.kgN=(K.find(k=>k[0]>0)||K[0])[0];
  // kargo kâr/zarar (kullanıcı 03.11.2026 17:09): model kalemleri + TL defter düzeltmesi (kambiyo, kur hedge, tahsilat kur farkı)
  const FZ=(V.kambiyo&&V.kambiyo.faiz)||{tl:.33,usd:.0394,marj:.001}, hAc=(((V.tic||[]).find(r=>/^Kur hedge \(Açık/.test(r[0]))||(V.tic||[]).find(r=>r[4]==='GTS!KambiyoHedge'||/^Kambiyo kur hedge/.test(r[0]))||[])[1]||'Açık')==='Açık';   // tek kur hedge anahtarı (03.11.2026 19:29)
  const beyK=x=>{ let c=0; const o=[]; for(const b of D.bey){ const a0=c, a1=c+b[1]; c=a1; const t=Math.max(0,Math.min(a1,x[22])-Math.max(a0,x[21])); if(t>0.05) o.push([b[0],t,b[2],b[3]!=null?b[3]*t/b[1]:null,b[4],b[5],t<b[1]-0.05,b[6]!=null?b[6]*t/b[1]:null]); } return o; };
  const kzH=x=>{ const B=beyK(x), od=gi(x[8]); let kmb=0, hdg=0; for(const b of B){ const kb=b[4]||0; if(!kb) continue; kmb+=(b[3]||0)/kb; const dd=od!=null?od-b[0]:0, kv=b[5]||kb;
      if(b[7]!=null){ hdg+=b[7]/kb; continue; }   // paket 78+: modelin günlük kur hedge sütunu
      if(hAc&&dd>0){ const fw=kb*(1+FZ.tl*dd/365)/(1+FZ.usd*dd/360)*(1+(FZ.marj||0)); hdg+=b[1]*(x[15]||0)*(kv-fw)/kb; } }
    const t=x[25]||0, sat=(x[24]||0)*t, al=-(x[15]||0)*t, bm=x[18]||0, fin=-(x[26]||0), hn=x[27]||0, nm=x[19]||0, tk=-(x[29]||0);
    if(x.length>36){ const bus=x[36]||0; return {t,tl:true,m3:x[32]||0,gtl:x[33]||0,stl:-(x[34]||0),btl:x[35]||0,bus,fin,hn,kmb,hdg,son:bus+fin+hn+kmb+hdg,kh:x[28]||0}; }   // paket 85: kullanıcı hesap şablonu (TL)
    return {t,sat,al,bm,fin,hn,nm,tk,kmb,hdg,son:nm+tk+kmb+hdg,kh:x[28]||0}; };
  const sel=$("kg-sel"); sel.innerHTML=K.map(k=>`<option value="${k[0]}">${k[0]===0?"Açılış stoğu · 1 Oca 2027":"Kargo "+k[0]+" · "+esc(k[1]||"")+" · "+nf.format(k[2])+" t · varış "+tk(k[5])}</option>`).join(""); sel.value=String(S.kgN);
  sel.onchange=()=>{ S.kgN=+sel.value; kargolar(); };
  const ki=K.findIndex(k=>k[0]===S.kgN), k=K[ki];
  $("kg-onc").disabled=ki<=0; $("kg-son").disabled=ki>=K.length-1;
  $("kg-onc").onclick=()=>{ if(ki>0){ S.kgN=K[ki-1][0]; kargolar(); } }; $("kg-son").onclick=()=>{ if(ki<K.length-1){ S.kgN=K[ki+1][0]; kargolar(); } };
  { const z=kzH(k), t=z.t||1, sat=(l,v,c,n)=>`<tr class="${c||"k-alt"}"><td class="l"><span class="kl">${l}</span>${n?`<span class="kn">${n}</span>`:""}</td><td class="yb${c==="k-son"||c==="k-ara"?(v<0?" n":" p"):""}">${(v<0?"−":"")+nf1.format(Math.abs(v)/1e6)}</td><td class="muted">${(v<0?"−":"")+nf1.format(Math.abs(v)/t)}</td></tr>`;
    $("kg-ksub").textContent=`${nf.format(z.t)} t satıldı · M $ ve $/t`;
    if(z.tl){ const tlr=(l,v,c,n)=>`<tr class="${c||"k-alt"}"><td class="l"><span class="kl">${l}</span>${n?`<span class="kn">${n}</span>`:""}</td><td class="yb${c==="k-ara"?(v<0?" n":" p"):""}">${(v<0?"−":"")+nf1.format(Math.abs(v)/1e6)} <span class="muted">M TL</span></td><td class="muted">${z.m3?(v<0?"−":"")+nf.format(Math.abs(v)/z.m3)+" /m³":""}</td></tr>`;
      $("kg-ksub").textContent=`${nf.format(z.t)} t · ${nf.format(z.m3)} m³ satıldı · TL ve $ (kullanıcı hesap şablonu)`;
      { const n=$("kg-knot"); if(n) n.textContent="Kargo sonucu modelin kargo bazında hesabından (Kargolar BU–BZ): satış m³, gelir ve SMM TL, brüt kâr $ = TL / beyanname kuru; + finansman + ürün hedge + kambiyo + forward. Faaliyet giderleri (elleçleme, fire, teminat, ÖTV/KDV faizi, beyanname) dönem bazlıdır, kargolara dağıtılmaz."; }
      $("kg-kz").innerHTML=`<thead><tr><th class="l">Kalem</th><th class="yb">Tutar</th><th>Birim</th></tr></thead><tbody>`
        +tlr("Satış geliri",z.gtl,"k-ana","m³ × (satış günü Tüpraş + müşteri primi)")+tlr("Satılan malın maliyeti",z.stl,"k-alt","ton × (CIF fiyatlama ort. + prim) × beyanname kuru × 0,845 / yoğunluk "+(k[37]?nf3.format(k[37]):""))+tlr("Brüt kâr",z.btl,"k-ara")
        +sat("Brüt kâr ($)",z.bus,"k-ara","brüt kâr TL / ithalat beyannamesi kuru")+sat("Finansman",z.fin,"k-alt",z.fin?"stok ve alacak (USD faiz)":"alım primi içinde")+sat("Ürün hedge (net)",z.hn,"k-alt","ICE swap sonucu − işlem maliyeti − teminat finansmanı")+(k[30]!=null?sat("&nbsp;&nbsp;içinde baz etkisi",k[30],"k-alt","CIF Med − ICE LSGO; + = kazanç"):"")
        +sat("Kambiyo kârı / zararı",z.kmb,"k-alt","beyanname kuru − fatura vadesi kuru")+sat("Kur hedge (forward)",z.hdg,"k-alt",hAc?"beyanname → fatura vadesi":"kapalı")
        +sat("Kargo sonucu",z.son,"k-son","faaliyet giderleri (elleçleme, fire, teminat, faiz, beyanname) dönem bazlı, dahil değil")+`</tbody>`; } else
    $("kg-kz").innerHTML=`<thead><tr><th class="l">Kalem</th><th class="yb">M $</th><th>$/t</th></tr></thead><tbody>`
      +sat("Satış geliri",z.sat,"k-ana","Tüpraş ± fiyatı, tahsilat kuruyla")+sat("Alış maliyeti",z.al,"k-alt","CIF + prim, navlun farkı, ikinci liman, fire")+sat("Brüt marj",z.bm,"k-ara")
      +sat("Finansman",z.fin,"k-alt",z.fin?"stok ve alacak (USD faiz)":"alım primi içinde")+sat("Ürün hedge (net)",z.hn,"k-alt","ICE swap sonucu − işlem maliyeti − teminat finansmanı")+(k[30]!=null?sat("&nbsp;&nbsp;içinde baz etkisi",k[30],"k-alt","CIF Med − ICE LSGO; + = kazanç"):"")
      +sat("Net marj (model)",z.nm,"k-ara")+sat("Tahsilat kur farkı geri eklenir",z.tk,"k-alt","TL defterde kambiyoya taşınır")
      +sat("Kambiyo kârı / zararı",z.kmb,"k-alt","beyanname kuru − fatura vadesi kuru")+sat("Kur hedge (forward)",z.hdg,"k-alt",hAc?"beyanname → fatura vadesi":"kapalı")
      +sat("Kargo sonucu",z.son,"k-son","TL defter; vergi avantajı ve faaliyet giderleri hariç")+`</tbody>`;
    const R=K.filter(x=>x[0]>0||x[25]>0).map(x=>[x[0],kzH(x).son]); gw($("kg-sonuc"));
    const Wg=W||900, Hh=230, pL=44, pR=8, pT=10, y0=Hh-24, mx=Math.max(1,...R.map(r=>Math.abs(r[1]))), lo=Math.min(0,...R.map(r=>r[1])), hi=Math.max(0,...R.map(r=>r[1])), sy=v=>pT+(hi-v)/(hi-lo||1)*(y0-pT), bw=(Wg-pL-pR)/R.length;
    let gg=""; for(let q=0;q<=4;q++){ const v=lo+(hi-lo)*q/4; gg+=`<line x1="${pL}" y1="${sy(v)}" x2="${Wg-pR}" y2="${sy(v)}" stroke="var(--line)" stroke-width="${Math.abs(v)<1e-9?1:.5}"/><text x="${pL-6}" y="${sy(v)+3.5}" text-anchor="end" font-size="10" fill="var(--ink-3)">${(v<0?"−":"")+nf1.format(Math.abs(v)/1e6)}</text>`; }
    gg+=`<line x1="${pL}" y1="${sy(0)}" x2="${Wg-pR}" y2="${sy(0)}" stroke="var(--ink-3)" stroke-width="1"/>`;
    R.forEach(([n,v],i)=>{ const x=pL+i*bw+bw*.12, y=Math.min(sy(0),sy(v)), h=Math.abs(sy(v)-sy(0)), se=n===k[0]; gg+=`<rect data-k="${n}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*.76).toFixed(1)}" height="${Math.max(1,h).toFixed(1)}" fill="${v<0?C.neg:C.pos}" opacity="${se?1:.45}" style="cursor:pointer"${se?` stroke="var(--ink)" stroke-width="1.5"`:""}><title>Kargo ${n}: ${(v<0?"−":"+")+nf1.format(Math.abs(v)/1e6)} M $</title></rect>`; const si=R.findIndex(r=>r[0]===k[0]); if((i%5===0&&Math.abs(i-si)>2)||se) gg+=`<text x="${(x+bw*.38).toFixed(1)}" y="${Hh-6}" text-anchor="middle" font-size="10" fill="${se?"var(--ink)":"var(--ink-3)"}"${se?' font-weight="700"':""}>${n}</text>`; });
    const top=R.reduce((a,r)=>a+r[1],0), pz=R.filter(r=>r[1]>=0).length;
    $("kg-sonuc").innerHTML=`<svg viewBox="0 0 ${Wg} ${Hh}" role="img" aria-label="Kargo bazında sonuç">${gg}</svg><p class="not">${R.length} kargo · toplam ${(top<0?"−":"+")+nf1.format(Math.abs(top)/1e6)} M $ · ${pz} kârlı, ${R.length-pz} zararlı · çubuğa tıklayınca kargo seçilir</p>`;
    for(const r of $("kg-sonuc").querySelectorAll("rect[data-k]")) r.onclick=()=>{ S.kgN=+r.dataset.k; kargolar(); }; }
  // satışın FIFO dağılımı: kümülatif satış ∈ (L, M]
  const L=k[21], M=k[22], gun=[]; let cum=0; for(let i=0;i<D.sat.length;i++){ const a=cum, b=cum+D.sat[i]; cum=b; const o=Math.max(0,Math.min(b,M)-Math.max(a,L)); if(o>0.05) gun.push([i,o]); }
  let cb=0; const BY=[]; for(const b of D.bey){ const a0=cb, a1=cb+b[1]; cb=a1; const o=Math.max(0,Math.min(a1,M)-Math.max(a0,L)); if(o>0.05) BY.push([b[0],o,b[2],b[3]!=null?b[3]*o/b[1]:null,b[4],b[5],o<b[1]-0.05]); }
  const byT=BY.reduce((a,b)=>a+b[1],0), stT=gun.reduce((a,g)=>a+g[1],0), kmb=BY.reduce((a,b)=>a+(b[3]||0),0);
  $("kg-h").textContent=k[0]===0?"Açılış stoğu · yaşam döngüsü":`Kargo ${k[0]} · ${k[1]||""} · yaşam döngüsü`;
  $("kg-sub").textContent=`${S.kgU} · ${nf.format(k[2])} t net${k[3]?` · B/L ${nf.format(k[3])} t`:""} · ${K.filter(x=>x[0]>0).length} kargo`;
  // zaman çizelgesi
  const OL=[["Fiyatlama"+(k[31]&&k[31]!==k[4]?" başı":""),k[4],C.ink3],...(k[31]&&k[31]!==k[4]?[["Fiyatlama sonu",k[31],C.ink3]]:[]),["NOR / varış",k[5],C.gts],["Antrepo beyannamesi",k[6],"#7B4FA0"],["COD",k[7],C.mot],["Ödeme",k[8],"#C0504D"],["Satışa hazır",k[9],C.pos],["İlk satış",k[10],C.mot],["Tükenme",k[11],C.neg]].filter(x=>x[1]).reduce((a,x)=>{ const o=a.find(y=>y[1]===x[1]); if(o) o[0]+=" · "+x[0]; else a.push([...x]); return a; },[]);
  gw($("kg-cizgi")); const xs=OL.map(x=>gi(x[1])), lo=Math.min(...xs,gun.length?gun[0][0]:Infinity), hi=Math.max(...xs,gun.length?gun[gun.length-1][0]:-Infinity), Wd=W||900, H=214, pl=16, pr=16, sx=i=>pl+(hi>lo?(i-lo)/(hi-lo):0.5)*(Wd-pl-pr);
  let g=`<line x1="${pl}" y1="92" x2="${Wd-pr}" y2="92" stroke="var(--line)" stroke-width="2"/>`;
  if(gun.length) g+=`<rect x="${sx(gun[0][0])}" y="86" width="${Math.max(2,sx(gun[gun.length-1][0])-sx(gun[0][0]))}" height="12" rx="3" fill="${C.mot}" opacity=".22"><title>Satış dönemi: ${tS(gun[0][0])} – ${tS(gun[gun.length-1][0])}</title></rect>`;
  for(const b of BY) g+=`<line x1="${sx(b[0]).toFixed(1)}" y1="100" x2="${sx(b[0]).toFixed(1)}" y2="108" stroke="#7B4FA0" stroke-width="1.5"><title>İthalat beyannamesi ${tS(b[0])}: ${nf.format(b[1])} t</title></line>`;
  const yer=[], cx=x=>Math.min(Math.max(x,pl+58),Wd-pr-58); OL.forEach(([ad,d,c],j)=>{ const x=sx(gi(d)); let sira=0; while(sira<5&&yer.some(p=>p[1]===sira&&Math.abs(p[0]-cx(x))<124)) sira++; yer.push([cx(x),sira]); const ust=sira%2===0, kat=Math.floor(sira/2), yy=ust?92-28-kat*30:92+30+kat*30;
    g+=`<line x1="${x.toFixed(1)}" y1="${ust?yy+5:98}" x2="${x.toFixed(1)}" y2="${ust?86:yy-13}" stroke="${c}" stroke-width="1" opacity=".55"/><circle cx="${x.toFixed(1)}" cy="92" r="5.5" fill="${c}" stroke="var(--surface,#fff)" stroke-width="2"><title>${ad}: ${tk(d)}</title></circle>`
      +`<text x="${cx(x).toFixed(1)}" y="${ust?yy-8:yy}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink)">${ad}</text><text x="${cx(x).toFixed(1)}" y="${ust?yy+4:yy+12}" text-anchor="middle" font-size="10.5" fill="var(--ink-3)">${tk(d)}</text>`; });
  $("kg-cizgi").innerHTML=`<svg viewBox="0 0 ${Wd} ${H}" role="img" aria-label="Kargo yaşam döngüsü zaman çizelgesi">${g}</svg>`;
  const kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  $("kg-kpi").innerHTML=kt("Antrepo beyannamesi",k[0]===0?"–":tk(k[6]),k[0]===0?"açılış stoğu":`B/L ${nf.format(k[3]||k[2])} t · ÖTV teminatı ${nf1.format((k[20]||0)/1e6)} M TL`)
    +kt("İthalat beyannameleri",`${BY.length} adet`,`${nf.format(byT)} t · kambiyo ${kmb>=0?"+":"−"}${nf1.format(Math.abs(kmb)/1e6)} M TL`)
    +kt("Satış",gun.length?`${gun.length} gün`:"–",gun.length?`${nf.format(stT)} t · ${tS(gun[0][0])} – ${tS(gun[gun.length-1][0])}`:"")
    +kt("Alış ve marj",`${nf1.format(k[15]||0)} $/t`,`CIF ${nf1.format(k[14]||0)} · değer ${nf1.format((k[16]||0)/1e6)} M $ · brüt ${(k[17]||0)<0?"−":""}${nf1.format(Math.abs(k[17]||0))} $/t · net ${(k[19]||0)<0?"−":""}${nf1.format(Math.abs(k[19]||0)/1e6)} M $`,(k[19]||0)<0?"neg":"pos");
  // günlük satış + kalan stok grafiği
  { const el=$("kg-gunluk"); if(!gun.length){ el.innerHTML=`<p class="not">Bu kargodan dönem içinde satış yok.</p>`; } else {
    gw(el); const a=gun[0][0], b=gun[gun.length-1][0], n=b-a+1, Hh=200, pL=52, pR=52, pT=10, y0=Hh-24, Wg=W||900, bw=Math.max(1,(Wg-pL-pR)/n*0.8), mx=Math.max(...gun.map(x=>x[1])), sxg=i=>pL+(i-a+0.5)/n*(Wg-pL-pR);
    const sy=v=>y0-(v/mx)*(y0-pT), sy2=v=>y0-(v/(M-L))*(y0-pT); let gg="", kal=M-L, path="", byG=new Map(BY.map(x=>[x[0],x]));
    for(let t=0;t<=4;t++){ const v=mx*t/4, y=sy(v); gg+=`<line x1="${pL}" y1="${y}" x2="${Wg-pR}" y2="${y}" stroke="var(--line)" stroke-width="${t?0.5:1}"/><text x="${pL-6}" y="${y+3.5}" text-anchor="end" font-size="10" fill="var(--ink-3)">${nf.format(v)}</text><text x="${Wg-pR+6}" y="${sy2((M-L)*t/4)+3.5}" font-size="10" fill="var(--ink-3)">${nf.format((M-L)*t/4/1000)} kt</text>`; }
    const gm=new Map(gun); for(let i=a;i<=b;i++){ const v=gm.get(i)||0; kal-=v; if(v) gg+=`<rect x="${(sxg(i)-bw/2).toFixed(1)}" y="${sy(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y0-sy(v)).toFixed(1)}" fill="${C.mot}"><title>${tS(i)}: ${nf.format(v)} t satış${byG.has(i)?` · ithalat beyannamesi ${nf.format(byG.get(i)[1])} t`:""}</title></rect>`; path+=(path?"L":"M")+sxg(i).toFixed(1)+","+sy2(Math.max(0,kal)).toFixed(1); }
    for(const x of BY) if(x[0]>=a&&x[0]<=b) gg+=`<circle cx="${sxg(x[0]).toFixed(1)}" cy="${y0+6}" r="2.6" fill="#7B4FA0"><title>İthalat beyannamesi ${tS(x[0])}: ${nf.format(x[1])} t</title></circle>`;
    gg+=`<path d="${path}" fill="none" stroke="${C.gts}" stroke-width="2"/>`;
    const et=[a,a+Math.round(n/3),a+Math.round(2*n/3),b]; for(const i of et) gg+=`<text x="${sxg(i)}" y="${Hh-4}" text-anchor="middle" font-size="10" fill="var(--ink-3)">${tS(i)}</text>`;
    el.innerHTML=`<svg viewBox="0 0 ${Wg} ${Hh}" role="img" aria-label="Günlük satış ve kalan stok">${gg}</svg><div class="lg"><span><i class="k" style="background:${C.mot}"></i>günlük satış (t, sol eksen)</span><span><i class="k" style="background:${C.gts}"></i>kalan stok (sağ eksen)</span><span><i class="k" style="background:#7B4FA0;border-radius:50%"></i>ithalat beyannamesi</span></div>`; } }
  // ithalat beyannameleri tablosu
  $("kg-bsub").textContent=BY.length?`${BY.length} beyanname · ${nf.format(byT)} t · ${nf.format(byT/D.yog)} m³`:"bu kargoya beyanname yok (açılış stoğu ya da dönem dışı)";
  let kb=0; $("kg-bey").innerHTML=`<thead><tr><th class="l">Tarih</th><th>Miktar (t)</th><th>m³</th><th>Kümülatif (t)</th><th>Beyanname kuru</th><th>Ödeme kuru</th><th>Kambiyo (TL)</th></tr></thead><tbody>`
    +BY.map(b=>{ kb+=b[1]; return `<tr><td class="l">${tS(b[0])}${b[6]?' <span class="muted" title="Parti iki kargoya bölünüyor">½</span>':''}</td><td>${nf.format(b[1])}</td><td>${nf.format(b[1]/D.yog)}</td><td>${nf.format(kb)}</td><td>${b[4]!=null?nf2.format(b[4]):"–"}</td><td>${b[5]?nf2.format(b[5]):"–"}</td><td class="${(b[3]||0)<0?"n":"p"}">${b[3]==null?"–":((b[3]<0?"−":"+")+nf.format(Math.abs(b[3])))}</td></tr>`; }).join("")
    +(BY.length?`<tr class="top"><td class="l"><b>Toplam</b></td><td><b>${nf.format(byT)}</b></td><td>${nf.format(byT/D.yog)}</td><td></td><td></td><td></td><td class="${kmb<0?"n":"p"}"><b>${(kmb<0?"−":"+")+nf.format(Math.abs(kmb))}</b></td></tr>`:"")+`</tbody>`;
  // günlük satış tablosu
  $("kg-ssub").textContent=gun.length?`${gun.length} gün · ${nf.format(stT)} t`:"";
  let kl=M-L; $("kg-sat").innerHTML=`<thead><tr><th class="l">Tarih</th><th>Satış (t)</th><th>Kalan (t)</th><th>Kalan %</th></tr></thead><tbody>`+gun.map(([i,v])=>{ kl-=v; return `<tr><td class="l">${tS(i)}</td><td>${nf.format(v)}</td><td>${nf.format(Math.max(0,kl))}</td><td>${pct(Math.max(0,kl)/(M-L))}</td></tr>`; }).join("")+`</tbody>`;
  // tüm kargolar
  const tb=$("kg-tum"); tb.innerHTML=`<thead><tr><th>No</th><th class="l">Gemi</th><th>Ton</th><th class="l">NOR / varış</th><th class="l">Antrepo beyannamesi</th><th class="l">COD</th><th class="l">Ödeme</th><th class="l">İlk satış</th><th class="l">Tükenme</th><th>Gün</th><th>Beyanname</th><th>Alış $/t</th><th>Net marj M $</th><th>Kargo sonucu M $</th></tr></thead><tbody>`
    +K.map(x=>{ let c2=0, nb=0; for(const b of D.bey){ const a0=c2, a1=c2+b[1]; c2=a1; if(Math.min(a1,x[22])-Math.max(a0,x[21])>0.05) nb++; } return `<tr data-k="${x[0]}" tabindex="0" aria-selected="${x[0]===S.kgN}"><td>${x[0]}</td><td class="l">${gem(x)}</td><td>${nf.format(x[2])}</td><td class="l">${tk(x[5])}</td><td class="l">${x[0]===0?"–":tk(x[6])}</td><td class="l">${tk(x[7])}</td><td class="l">${tk(x[8])}</td><td class="l">${tk(x[10])}</td><td class="l">${tk(x[11])}</td><td>${x[12]??"–"}</td><td>${nb}</td><td>${nf1.format(x[15]||0)}</td><td class="${(x[19]||0)<0?"n":"p"}">${(x[19]||0)<0?"−":""}${nf1.format(Math.abs(x[19]||0)/1e6)}</td>${(z=>`<td class="${z<0?"n":"p"}"><b>${z<0?"−":""}${nf1.format(Math.abs(z)/1e6)}</b></td>`)(kzH(x).son)}</tr>`; }).join("")+`</tbody>`;
  for(const tr of tb.querySelectorAll("tr[data-k]")){ const f=()=>{ S.kgN=+tr.dataset.k; kargolar(); $("kg-h").scrollIntoView({behavior:"smooth",block:"start"}); }; tr.onclick=f; tr.onkeydown=e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); f(); } }; }
}

/* ---------- GENEL ---------- */
function wfKart(baslik,K,toplam,alt){
  let cum=0, mn=0, mx=0; for(const [,v] of K){ cum+=v; mn=Math.min(mn,cum); mx=Math.max(mx,cum); } mn=Math.min(mn,toplam); mx=Math.max(mx,toplam);
  const rg=(mx-mn)||1, X=v=>(v-mn)/rg*100; cum=0; let h="";
  for(const [l,v] of K){ const a=cum, b=cum+v; cum=b; h+=`<span class="wl">${esc(l)}</span><span class="wb"><span class="z0" style="left:${X(0).toFixed(2)}%"></span><i style="left:${X(Math.min(a,b)).toFixed(2)}%;width:${Math.max(.5,Math.abs(X(b)-X(a))).toFixed(2)}%;background:${v>=0?C.pos:C.neg}"></i></span><span class="wv ${v>=0?"p":"n"}">${v>=0?"+":""}${usd(v)}</span>`; }
  h+=`<span class="wl t">Toplam</span><span class="wb"><span class="z0" style="left:${X(0).toFixed(2)}%"></span><i style="left:${X(Math.min(0,toplam)).toFixed(2)}%;width:${Math.max(.5,Math.abs(X(toplam)-X(0))).toFixed(2)}%;background:${C.gts}"></i></span><span class="wv t">${usd(toplam)}</span>`;
  return `<section><div class="head"><h2>${esc(baslik)}</h2><span class="sub">${alt}</span></div><div class="wf" role="img" aria-label="${esc(baslik)} köprüsü">${h}</div></section>`;
}
function genel(){
  { const y0=V.g0.slice(0,4), y1=String(new Date(Date.parse(V.g0+"T00:00:00Z")+(V.gm.length-1)*864e5).getUTCFullYear()); $("g-h").textContent=(KILIT||(y0===y1?y0:y0+"–"+y1))+" senaryo modeli"; }
  const Y=k=>oz(k,1), top=Y("Toplam (USD)"), sm=Y("Motorin satışı (t)"), sb=Y("Benzin satışı (t)"), ora=Y("Satış / hedef tonaj"), tem=Y("Tepe teminat bakiyesi (TL)"), gv=Y("Gemi varışı (adet, varış tarihine göre)");
  const kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  const nk=j=>SIRKET&&typeof top[j]==="number"?top[j]:(Y("Net marj (USD)")[j]||0)-(Y("Vergi + beyanname maliyeti (USD)")[j]||0), nkNot=V.kartab?"hedge ve faaliyet giderleri dahil, kurumlar vergisi öncesi":"hedge dahil, vergi sonrası";
  if(YIL){ const j=YIL==="2027"?1:2;
    $("g-kpi").innerHTML=kt(YIL+" net kâr",usd(nk(j)),`${nkNot}`,nk(j)<0?"neg":"pos")
      +kt("Satış",ton(sm[j]+sb[j]),`${BZ?`motorin ${ton(sm[j])} · benzin ${ton(sb[j])}`:"yalnız motorin"}<br>hedefin ${pct(ora[j])}`)
      +kt("Gemi varışı",nf.format(gv[j]),`${YIL} varış tarihine göre`)
      +kt("Tepe teminat",nf1.format(tem[j]/1e9)+" milyar TL",`${YIL} ÖTV teminat mektubu tepe bakiyesi`); }
  else $("g-kpi").innerHTML=kt("İki yıl net kâr",usd(nk(3)),`2027 ${usd(nk(1))} · 2028 ${usd(nk(2))} · ${nkNot}`,nk(3)<0?"neg":"pos")
    +kt("Satış",ton(sm[3]+sb[3]),`${BZ?`motorin ${ton(sm[3])} · benzin ${ton(sb[3])}`:"yalnız motorin"}<br>hedefin ${pct(ora[1])} (2027) · ${pct(ora[2])} (2028)`)
    +kt("Gemi varışı",nf.format(gv[3]),`${BZ?`motorin ${oz("Kargo sayısı (dönem varışı)")[1]} · benzin ${oz("Kargo sayısı (dönem varışı)")[2]} kargo · `:"motorin kargoları · "}2027 ${gv[1]} · 2028 ${gv[2]}`)
    +kt("Tepe teminat",nf1.format(tem[3]/1e9)+" milyar TL",`ÖTV teminat mektubu limiti · tepe vergi nakit ${nf1.format(oz("Tepe vergi nakit işletme sermayesi (TL)")[3]/1e9)} milyar TL`);
  if(!$("g-not")) $("g-kpi").insertAdjacentHTML("afterend",`<p class="not" id="g-not">${V.kartab?"Net kâr = Karlılık tablosundaki net kâr (net satışlar − satılan malın maliyeti − faaliyet giderleri, kurumlar vergisi öncesi)":"Net kâr = net marj (hedge dahil) − vergi ve beyanname maliyeti"}; bölgesel navlun avantajı bayi tarafındaki değerdir, kâra dahil değildir. Sonuç tek bir fiyat yolundan gelir: <b id="g-yol"></b>. Parti boyutu, ikinci liman, vade ve hedge karşılaştırması ile iki yıllık Monte Carlo Risk sekmesindedir.</p>`);
  { const sn=gir("Fiyat senaryosu")||"Baz", yo=gir("Fiyat yolu"); $("g-yol").textContent=sn==="Makul"?"Makul senaryo (kullanıcı fiyat modeli)":`${sn} senaryosu, ${yo==="P50"?"P50 (günlük medyan)":"temsili yol"}`; }
  ticari();
  if(V.kartab){ karTablo(); karlilik("e-kar","e-ksub"); $("e-karsec").hidden=false; } else { karlilik("g-kar","g-ksub"); const e=$("e-karsec"); if(e) e.hidden=true; }
}

/* ---------- Kârlılık: kalemler halinde, hedge dahil net kâra kadar (kullanıcı 01.11.2026 18:23) ----------
   Kargo bazında (kargonun satışa hazır olduğu yıl); vergi ve bölgesel avantaj Özet "Yıllara göre" bloğundan. */
function karlilik(KI,SI){
  const Y=k=>oz(k,1), yillar=[["2027",1],["2028",2]], kol=YIL?yillar.filter(x=>x[0]===YIL):yillar.concat([["Toplam",3]]);
  const gn=l=>{ const v=+gir(l); return isFinite(v)?v:0; }, EL=gn("GTS elleçleme tarifesi (USD/t)"), SY=gn("İthal kargo ek seyir (USD/t)"), PR=[gn("Alım primi / iskontosu – motorin (USD/t, CIF Med ±)"),gn("Alım primi / iskontosu – benzin (USD/t, CIF Med ±)")];
  const top=(y)=>{ const o={t:0,sat:0,al:0,nav:0,ik:0,br:0,fin:0,hb:0,hi:0,ht:0,net:0,kur:0,n:0,fd:0,ap:0,pr:0,el:0,sy:0};
    for(const [li,L] of [V.km,V.kb].entries()) for(const k of L){ const yn=k.length>=34&&typeof k[32]==="number"&&typeof k[33]==="number"; let w=1;
      if(y!=="Toplam"){ if(yn) w=y==="2027"?k[33]:1-k[33]; else if(k[4].slice(0,4)!==y) continue; }
      if(k.length<23||!w) continue; const sf=yn&&k[2]?k[32]/k[2]:1, q=w*sf, tn=k[2]*q;
      o.t+=tn; o.al+=k[16]*q; o.nav+=k[17]*q; o.ik+=k[18]*q; o.br+=k[12]*w; o.fin+=k[15]*w; o.hb+=k[19]*w; o.hi+=k[20]*w; o.ht+=k[21]*w; o.net+=k[13]*w; o.kur+=k[22]*q; o.n++;
      if(k.length>=26){ o.fd+=(k[25]-k[9])*tn; o.ap+=(k[9]*k[2]-(k[16]-k[17]-k[18]))*q; o.pr+=PR[li]*tn; o.el+=EL*tn; o.sy+=SY*tn; } }
    o.sat=o.al+o.br; return o; };
  let T=kol.map(([y,j])=>{ const o=top(y); o.ver=Y("Vergi + beyanname maliyeti (USD)")[j]||0; o.bol=Y("Bölgesel navlun avantajı (USD)")[j]||0; o.nk=o.net-o.ver; o.mt=o.nk+o.bol; o.ad=y; if(V.tld){ const jj=y==="2027"?1:y==="2028"?2:3; o.kmb=V.tld.kmb[jj]; o.hdg=V.tld.hdg[jj]; o.nk=o.nk-o.kur+o.kmb+o.hdg; } return o; });
  if(!T[0].n){ $(KI).innerHTML=`<tbody><tr><td class="l">Bu paketteki model kalem ayrıntısı vermiyor.</td></tr></tbody>`; return; }
  // tür: h=hacim, ana=ana kalem (kalın), alt=bileşen (girintili), ara=ara toplam (kalın), son=net kâr, b=bilgi
  let R=[
    ["Satış hacmi",o=>o.t,"h","kargo tonu"],
    ["Satış geliri",o=>o.sat,"ana","Tüpraş vergisiz fiyatı ± satış farkı"],
    ["Ürün alışı",o=>-(o.al-o.nav-o.ik),"alt","CIF Med ± alım primi, elleçleme, ek seyir ve fire dahil"],
    ...(V.km.some(k=>k[17])?[["Gemi navlun farkı",o=>-o.nav,"alt","büyük gemi kazancı (+), küçük gemi farkı (−)"]]:[]),
    ["İkinci liman (kısmi tahliye)",o=>-o.ik,"alt"],
    ["Brüt marj",o=>o.br,"ara"],
    ["Tüpraş primi",o=>o.br-o.fd-o.ap+o.nav+o.ik,"acl","satış fiyatı − satış dönemindeki CIF Med"],
    ["Stokta fiyat değişimi",o=>o.fd,"acl","satış dönemi CIF − fiyatlama günü CIF; düşen piyasada zarar"],
    ["Alım primi, elleçleme ve fire",o=>o.ap,"acl","CIF Med ile ürün alışı arasındaki fark (navlun hariç)"],
    ["Alım primi / iskontosu",o=>-o.pr,"acl2","Ticari koşullar: CIF Med ± USD/t; prim (+) zarar, iskonto (−) kazanç"],
    ["GTS elleçleme tarifesi",o=>-o.el,"acl2",`${nf1.format(EL)} USD/t · Girdiler B48`],
    ["İthal kargo ek seyir",o=>-o.sy,"acl2",`${nf1.format(SY)} USD/t · Girdiler B49`],
    ["Fire",o=>o.ap+o.pr+o.el+o.sy,"acl2","konşimento ile tahliye edilen ton farkı (%"+nf1.format(gn("Tahliye farkı (gemi B/L − tahliye, %)")*100)+"); tüm alış bedeline uygulanır"],
    V.km.some(k=>k[17])?["Navlun farkı ve ikinci liman",o=>-o.nav-o.ik,"acl","Gemi navlun farkı + İkinci liman satırları"]:["İkinci liman",o=>-o.ik,"acl","kısmi tahliye uğrak maliyeti"],
    ["Finansman",o=>-o.fin,"alt",((V.tic||[]).find(r=>r[4]==="GTS!FinansmanPrimde"||r[0]==="Stok ve alacak finansmanı")||[])[1]==="Alım priminde"?"stokta kalma ve müşteri vadesi · alım primi içinde, ayrıca hesaplanmaz":"stokta kalma ve müşteri vadesi"],
    ["Hedge öncesi marj",o=>o.br-o.fin,"ara"],
    ["Ürün hedge sonucu",o=>o.hb,"alt","ICE Gasoil; kilit fiyatı − satış dönemi CIF"],
    ["Hedge işlem maliyeti",o=>-o.hi,"alt"],
    ["Hedge teminat finansmanı",o=>-o.ht,"alt"],
    ["Net marj (hedge dahil)",o=>o.net,"ara"],
    ["İthalat vergi avantajı",o=>-o.ver,"alt","ÖTV ve KDV: müşteriden tahsil ile devlete ödeme arasındaki günlerin TL faizi − teminat komisyonu − beyanname"],
    ...(V.tld?[["Tahsilat kur farkı geri eklenir",o=>-o.kur,"alt","TL alacağın USD karşılığı; TL defterde kur farkı kambiyoda"],["Kambiyo kârı / zararı",o=>o.kmb,"alt","beyanname kuru − fatura vadesi kuru"],["Kur hedge sonucu",o=>o.hdg,"alt","beyanname → fatura vadesi forward"]]:[]),
    ["Net kâr",o=>o.nk,"son"],
    ...(V.tld?[]:[["TL tahsilatın USD karşılığı (vade etkisi)",o=>o.kur,"b","net marjın içinde · TL defterde kambiyo değil"]])];
  // paket 85: model kullanıcı hesap şablonunda (TL) → köprü Karlilik satırlarından (kargo ayrıştırması eski tanımda kalır)
  if(V.tld&&V.tld.tl){ const L=V.kartab.rows, b=re=>L.find(r=>re.test(String(r[0]).trim()))||[null,0,0,0];
    const rG=b(/^NET SATIŞLAR \(USD/), rS=b(/^SATILAN MALIN MALİYETİ \(USD/), rB=b(/^BRÜT KÂR \(USD/), rH=b(/^ÜRÜN HEDGE SONUCU/), rF=b(/^FAALİYET GİDERLERİ/), rK=b(/^Kambiyo kârı/), rW=b(/^Kur hedge – forward|^Kur hedge sonucu/), rN=b(/^NET KÂR/), rT=b(/^Gerçekleşen satış – bayi alımı/);
    const fk=re=>b(re), kal2=[["Stok ve alacak finansmanı",/^Stok ve alacak finansmanı/],["ÖTV ve KDV finansmanı (TL faiz)",/^ÖTV ve KDV finansmanı/],["ÖTV teminat mektubu komisyonu",/^ÖTV teminat mektubu/],["GTS elleçleme + ek seyir",/^GTS elleçleme/],["Fire (tahliye / ölçüm farkı)",/^Tahliye \/ ölçüm farkı/],["İthalat beyannamesi (gümrük)",/^İthalat beyannamesi \(gümrük/],["Sörvey, gözetim, sigorta",/^Sörvey/],["Satış ve pazarlama",/^Satış ve pazarlama/],["Genel yönetim",/^Genel yönetim/]];
    T=kol.map(([y,j])=>({ad:y,n:1,t:rT[j]||0,sat:rG[j]||0,smm:-(rS[j]||0),br:rB[j]||0,hn:rH[j]||0,fa:-(rF[j]||0),kmb:rK[j]||0,fwd:rW[j]||0,nk:rN[j]||0,fk:Object.fromEntries(kal2.map(([l,re])=>[l,-(fk(re)[j]||0)]))}));
    R=[["Satış hacmi",o=>o.t,"h","satılan ton"],["Satış geliri",o=>o.sat,"ana","m³ = t / 0,835 × (satış günü Tüpraş + müşteri primi), TL → beyanname kuruyla $"],["Satılan malın maliyeti",o=>o.smm,"alt","ton × (CIF Med fiyatlama ort. + alım primi) × beyanname kuru × 0,845 / gerçek yoğunluk"],["Brüt kâr",o=>o.br,"ara","brüt kâr TL / ithalat beyannamesi kuru"],
      ["Ürün hedge",o=>o.hn,"alt","ICE swap sonucu (baz etkisi dahil) − işlem maliyeti − teminat finansmanı"],["Faaliyet giderleri",o=>o.fa,"alt","finansman, faiz, teminat komisyonu, elleçleme, fire, beyanname, sörvey, satış, yönetim"],
      ...kal2.filter(([l])=>T.some(o=>Math.abs(o.fk[l])>1)).map(([l])=>[l,o=>o.fk[l],"acl"]),
      ["Kambiyo kârı / zararı",o=>o.kmb,"alt","beyanname kuru − fatura vadesi kuru"],["Kur hedge (forward)",o=>o.fwd,"alt","beyanname → fatura vadesi"],["Net kâr",o=>o.nk,"son"]]; }
  const son=T[T.length-1], mx=Math.max(1,...R.filter(r=>r[2]!=="h"&&r[0]!=="Satış geliri"&&r[0]!=="Ürün alışı"&&r[0]!=="Satılan malın maliyeti").map(r=>Math.abs(r[1](son))));
  const m=v=>(v<0?"−":"")+nf1.format(Math.abs(v)/1e6), sg=(v,t)=>(t==="alt"&&v>0?"+":"");
  let h=`<thead><tr><th class="l">Kalem</th>${T.map((o,k)=>`<th class="yb">${o.ad}<br><span>M $</span></th><th>$/t</th><th>%</th>`).join("")}<th class="l bar-h">${son.ad} · etki</th></tr></thead><tbody>`;
  for(const [l,f,t,not] of R){
    if(t==="acl"&&l==="Tüpraş primi") h+=`<tr class="k-aclb"><td class="l" colspan="${1+T.length*3+1}">Brüt marjın kaynağı</td></tr>`;
    h+=`<tr class="k-${t}"><td class="l"><span class="kl">${esc(l)}</span>${not?`<span class="kn">${esc(not)}</span>`:""}</td>`;
    for(const o of T){ const v=f(o);
      if(t==="h"){ h+=`<td class="yb">${ton(v)}</td><td></td><td></td>`; continue; }
      const pt=o.t?v/o.t:0, ps=o.sat?v/o.sat:0, c=t==="ana"||t==="b"||Math.abs(v)<5e4?"":(v<0?"n":"p");
      if(t==="acl"||t==="acl2"){ h+=`<td class="yb ${c}">${v>0?"+":""}${m(v)}</td><td class="${c}">${(pt<0?"−":pt>0?"+":"")+nf1.format(Math.abs(pt))}</td><td class="muted">${(ps<0?"−":"")+nf1.format(Math.abs(ps)*100)}</td>`; continue; }
      h+=`<td class="yb ${c}">${sg(v,t)}${m(v)}</td><td class="muted">${(pt<0?"−":"")+nf1.format(Math.abs(pt))}</td><td class="muted">${t==="ana"?"100":(ps<0?"−":"")+nf1.format(Math.abs(ps)*100)}</td>`; }
    const v=f(son), w=t==="h"||l==="Satış geliri"||l==="Ürün alışı"||l==="Satılan malın maliyeti"?0:Math.min(100,Math.abs(v)/mx*100);
    h+=`<td class="l bar">${w?`<i class="${v<0?"n":"p"}${t==="ara"||t==="son"?" kal":""}" style="width:${w.toFixed(1)}%"></i>`:""}</td></tr>`; }
  $(KI).innerHTML=h+`</tbody>`;
  if(V.tld&&V.tld.tl) $(SI).textContent=`modelin Kârlılık tablosu (kullanıcı hesap şablonu, TL → $ beyanname kuruyla) · $/t satılan ton başına · % satış gelirine oran`; else $(SI).textContent=`kargo bazında, ${V.km.some(k=>typeof k[33]==="number")?"satılan tona göre yıllara bölünmüş":"kargonun satışa hazır olduğu yıla"} · $/t satılan ton başına · % satış gelirine oran${Object.keys(V.girdi||{}).length?" · sizin girdilerinizle":""}`;
}

/* Kârlılık tablosu: Excel modelinin Karlilik sayfası (kullanıcı 02.11.2026 10:43) */
/* Yasal defter (TL) görünümü – kambiyo kârı/zararı (kullanıcı 02.11.2026 20:04): beyanname açılış kuru ile kargo fatura vadesi kuru farkı */
function yasalDefter(){ const el=$("g-yasal"), sec=$("g-yasalsec"); if(!el||!sec) return; const Kb=V.kambiyo&&V.kambiyo.yil; if(!Kb||!Object.keys(Kb).length){ sec.hidden=true; return; } sec.hidden=false;
  const ys=(YIL?[YIL]:["2027","2028"]).filter(y=>Kb[y]), top=ys.length>1, Y=y=>y==="Toplam"?ys.reduce((a,k)=>{ for(const f of ["usd","tlOdeme","tlBeyan","ktl","kusd"]) a[f]=(a[f]||0)+Kb[k][f]; a.gw=(a.gw||0)+Kb[k].gun*Kb[k].usd; return a; },{}):{...Kb[y],gw:Kb[y].gun*Kb[y].usd};
  const kol=top?[...ys,"Toplam"]:ys, M=v=>(v<0?"−":"")+nf1.format(Math.abs(v)/1e6), sg=v=>(v>0?"+":v<0?"−":"")+nf1.format(Math.abs(v)/1e6);
  const sat=(l,f,c,n)=>`<tr class="${c||""}"><td class="l"><span class="kl">${l}</span>${n?`<span class="kn">${n}</span>`:""}</td>${kol.map(y=>{ const o=Y(y), v=f(o); return `<td class="yb${c==="k-son"?(v.n<0?" n":" p"):""}">${v.t}</td>`; }).join("")}</tr>`;
  el.innerHTML=`<thead><tr><th class="l">Kalem</th>${kol.map(y=>`<th class="yb">${y}</th>`).join("")}</tr></thead><tbody>`
    +sat("Beyan edilen ürün alış bedeli",o=>({t:M(o.usd)+" M $"}),"k-alt","ithalat beyannamesine giren kargo bedeli (FIFO)")
    +sat("TL maliyet – fatura vadesi kuruyla",o=>({t:M(o.tlOdeme)+" M TL"}),"k-alt",`fiilen ödenen TL · vade = COD${V.kambiyo.odv?" + "+nf.format(V.kambiyo.odv)+" gün":""}`)
    +sat("TL maliyet – beyanname kuruyla",o=>({t:M(o.tlBeyan)+" M TL"}),"k-alt","yasal defterde satılan malın maliyeti")
    +sat("Ortalama kur – fatura vadesi / beyanname",o=>({t:nf2.format(o.tlOdeme/o.usd)+" / "+nf2.format(o.tlBeyan/o.usd)}),"k-alt")
    +sat("Ödemeden beyannameye geçen süre",o=>({t:(o.gw<0?"−":"")+nf1.format(Math.abs(o.usd?o.gw/o.usd:0))+" gün"}),"k-alt","ağırlıklı ortalama · eksi = ödeme beyannameden sonra")
    +sat("Kambiyo kârı / zararı",o=>({t:sg(o.ktl)+" M TL",n:o.ktl}),"k-son","beyanname kuru − fatura vadesi kuru · + kâr")
    +sat("Kambiyo, USD karşılığı",o=>({t:sg(o.kusd)+" M $",n:o.kusd}),"k-alt",(V.kambiyo.usdKur||"beyanname günü kuru")+"yla")+`</tbody>`;
}
function karTablo(){
  const K=V.kartab, L=K.rows, bul=re=>L.find(r=>re.test(r[0].trim()));
  const TN=bul(/^Gerçekleşen satış – bayi alımı/)||bul(/^PLANLANAN SATIŞ/), ns=bul(/^NET SATIŞLAR \(USD/)||bul(/^NET SATIŞLAR/), nsTL=bul(/^NET SATIŞLAR \(TL\)/);
  const kol=YIL?[[YIL,YIL==="2027"?1:2]]:[["2027",1],["2028",2],["Toplam",3]];
  const m=v=>(v<0?"−":"")+nf1.format(Math.abs(v)/1e6), s1=v=>(v<0?"−":"")+nf1.format(Math.abs(v)), yz=v=>(v<0?"−":"")+nf1.format(Math.abs(v)*100);
  let h=`<thead><tr><th class="l">Kalem</th>${kol.map(([y])=>`<th class="yb">${y}<br><span>M $</span></th><th>$/t</th><th>%</th>`).join("")}</tr></thead><tbody>`;
  for(const r of L){ const ham=r[0], ad=ham.trim(), gir=Math.floor((ham.length-ham.trimStart().length)/2);
    if(/^Kontrol|Ozet'e eklenen|^Bilgi: bölgesel navlun/i.test(ad)||(V.tld&&/^Yasal defter: (kambiyo|kur hedge)|^USD eşdeğeri|^Bilgi: USD bazlı net kâr/.test(ad)&&!(V.tld.model&&/^Bilgi: USD bazlı net kâr/.test(ad)))) continue;   // kullanıcı 02.11.2026 22:08: bölgesel avantaj gösterilmez
    const ad0=ad.replace(/\s*\([^)]*\)\s*/g,""), ana=ad0===ad0.toLocaleUpperCase("tr-TR")&&/[A-ZÇĞİÖŞÜ]/.test(ad0), son=/^NET KÂR/.test(ad), bilgi=/^Bilgi/.test(ad);
    const miktar=/\((t|m³)( = [^)]*)?\)$/.test(ad), oran=/oranı$|marjı$/.test(ad), birim=/\(USD\/t/.test(ad), tlb=/\(TL\/m³\)$/.test(ad), tlt=/\(TL\)$/.test(ad);   // paket 85: TL tutarlar ve TL/m³ fiyatlar
    const tur=son?"son":ana?(/BRÜT KÂR/.test(ad)?"ara":"ana"):bilgi?"b":"alt", cls=`k-${tur}${gir>1?" k-g2":""}`;
    h+=`<tr class="${cls}"><td class="l"><span class="kl">${esc(ad.replace(/^Bilgi: (.)/,(_,c)=>c.toLocaleUpperCase("tr-TR")).replace(/^Tahliye \/ ölçüm farkı$/,"Fire").replace(/^Tahsilat kur farkı \(vade boyunca TL değer kaybı\)$/,"TL tahsilatın USD karşılığı (vade etkisi)"))}</span>${r[6]?`<span class="kn">${esc(r[6])}</span>`:""}</td>`;
    for(const [,j] of kol){ const v=r[j];
      if(typeof v!=="number"){ h+=`<td class="yb"></td><td></td><td></td>`; continue; }
      if(miktar){ h+=`<td class="yb">${/m³/.test(ad)?nf.format(v)+" m³":ton(v)}</td><td></td><td></td>`; continue; }
      if(oran){ h+=`<td class="yb muted">${v<0?"−":""}%${nf1.format(Math.abs(v)*100)}</td><td></td><td></td>`; continue; }
      if(birim){ h+=`<td class="yb"></td><td class="muted">${s1(v)}</td><td></td>`; continue; }
      if(tlb){ h+=`<td class="yb muted">${nf.format(v)} TL/m³</td><td></td><td></td>`; continue; }
      if(tlt){ const p=nsTL&&nsTL[j]?v/nsTL[j]:0, c=tur==="ara"?(v<0?"n":"p"):""; h+=`<td class="yb ${c}">${m(v)} <span class="muted">M TL</span></td><td></td><td class="muted">${/^NET SATIŞ/.test(ad)?"100":yz(p)}</td>`; continue; }
      const t=TN&&TN[j]?v/TN[j]:0, p=ns&&ns[j]?v/ns[j]:0, c=son||tur==="ara"?(v<0?"n":"p"):"";
      h+=`<td class="yb ${c}">${m(v)}</td><td class="muted">${s1(t)}</td><td class="muted">${tur==="ana"&&/NET SATIŞ/.test(ad)?"100":yz(p)}</td>`; }
    h+=`</tr>`; }
  $("g-kar").innerHTML=h+`</tbody>`;
  $("g-ksub").textContent=`Excel modeli Karlilik sayfası · $/t satılan ton başına · % net satışa oran${Object.keys(V.girdi||{}).length?" · sizin girdilerinizle":""}`;
  const n=$("g-knot"); if(n) n.textContent=K.not||"";
}

/* girdiler.json: bir panelin anahtarlarını yenileriyle değiştirir, diğer panellerinkini korur */
function girdiYaz(anahtarlar,yeni){ const fs=require("fs"), path=require("path"), o={};
  for(const [k,v] of Object.entries(V.girdi||{})) if(!anahtarlar.includes(k)) o[k]=v; Object.assign(o,yeni);
  fs.mkdirSync(path.dirname(V.girdiYolu),{recursive:true}); if(Object.keys(o).length) fs.writeFileSync(V.girdiYolu,JSON.stringify(o,null,1)); else if(fs.existsSync(V.girdiYolu)) fs.unlinkSync(V.girdiYolu); }
/* USD/t girdisinin yıllık karşılığı: satılan ton (Karlilik) × USD/t */
function tYil(v){ const r=V.kartab&&V.kartab.rows.find(x=>/Gerçekleşen satış – bayi alımı/.test(x[0])); if(!r||typeof v!=="number"||!isFinite(v)) return "";
  const m=x=>nf1.format(x/1e6); return (YIL==="2027"?`2027 ≈ ${m(v*r[1])} M $`:YIL==="2028"?`2028 ≈ ${m(v*r[2])} M $`:`2027 ≈ ${m(v*r[1])} · 2028 ≈ ${m(v*r[2])} M $`); }
/* Forward maliyeti (kullanıcı 02.11.2026 17:47): TL ve USD faizinden faiz paritesiyle; vade = satış vadesi (model formülüyle aynı) */
function fwHesap(tl,usd,m,d){ return (1+tl*d/365)/(1+usd*d/360)*(1+(m||0))-1; }
function fwMetin(o,T,tl,usd,d){ if(!o) return "–"; const vr=T&&T.find(x=>/^Satış vadesi/.test(x[0])); d=d??(vr&&typeof vr[1]==="number"?vr[1]:17); tl=tl??o.tl; usd=usd??o.usd;
  if(!isFinite(tl)||!isFinite(usd)) return "–"; return `${nf.format(d)} gün %${nf2.format(fwHesap(tl,usd,o.marj,d)*100)} · aylık %${nf2.format(fwHesap(tl,usd,o.marj,30)*100)}`; }
/* ---------- Ticari koşullar: kullanıcı girdisi (Excel Özet G5:I14); masaüstünde model bu değerlerle yeniden hesaplanır ---------- */
function ticari(){
  const el=$("g-tic"), T0=(V.tic||[]).filter(r=>r[1]!=="Değer");
  // panel düzeni (kullanıcı 02.11.2026 18:04): satırlar konu başlıklarına göre; düzene girmeyen satır kendi başlığında kalır
  const T=(()=>{ const G=[]; for(const r of T0){ if(r[1]==null&&r[2]==null&&!r[4]&&r[5]!=="not") G.push([r]); else if(G.length) G[G.length-1].push(r); else G.push([[ "Diğer",null,null],r]); }
    const kul=new Set(), out=[], al=(re)=>{ const x=[]; for(const g of G) for(const r of g.slice(1)) if(!kul.has(r)&&r[5]!=="not"&&re.test(r[0])){ kul.add(r); x.push(r); } return x; };
    const DUZEN=[["Alım tarafı",[/^Alım primi \/ iskontosu – motorin/,/^Alım primi \/ iskontosu – benzin/,/^Alım ödeme vadesi/,/^Fiyatlama/,/^Stok ve alacak finansmanı/]],
      ["Satış tarafı",[/^Satış fiyatı – motorin/,/^Satış primi yöntemi/,/^Rakip maliyeti yönteminde prim alt sınırı/,/^Rakip ithalatçıların alım primi/,/^Dağıtıcı geçiş eşiği/,/^Geçen hacim \/ potansiyel/,/^Navlun avantajının/,/^Tüpraş Batman.*kota|[Rr]afineri.*kota/,/^Karadeniz/,/^Satış fiyatı – benzin/,/^Satış vadesi/,/^Satış hedefi/,/^Asgari (müşteri|aylık) alım/]],
      ["Müşteri davranışı",[/^Bayi kotası/]],[/^Kaynak bazlı/,null],
      ["Faiz ve finansman",[/^TL (finansman )?faizi/,/^USD borçlanma/,/^USD faizi/]],
      ["Hedge ve parti",[/^Ürün hedge/,/^Motorin hedge oranı/,/^Benzin.*hedge/i,/^Hedge kilit/,/^Kur hedge \(/,/^Kur hedge oranı/,/^Forward maliyeti/,/^Kur hedge – beyanname/,/^Kambiyo kur hedge/,/^Ürün hedge enstrümanı/,/partisi/,/^Uygulanan parti/]],[/^Faaliyet giderleri/,null]];
    for(const [ad,L] of DUZEN){
      if(L===null){ const g=G.find(g=>ad.test(g[0][0])); if(g){ const x=g.slice(1).filter(r=>!kul.has(r)); x.forEach(r=>kul.add(r)); if(x.some(r=>r[5]!=="not")) out.push(g[0],...x); } continue; }
      const x=L.flatMap(al); if(x.length) out.push([ad,null,null],...x); }
    for(const g of G){ const x=g.slice(1).filter(r=>!kul.has(r)&&r[5]!=="not"); if(x.length&&!/^Girdi paneli/.test(g[0][0])) out.push(g[0],...x); else if(x.length) out.push(["Diğer",null,null],...x); }
    return out; })();
  if(!T.length){ el.innerHTML=`<p class="not">Bu paketteki Excel modelinde ticari koşullar paneli yok (paket 57 ve sonrası).</p>`; return; }
  const yaz=typeof require==="function"&&V.girdiYolu&&window.gts, G=V.girdi||{}, TK=T.filter(r=>r[4]).map(r=>r[4]), nG=TK.filter(k=>k in G).length;
  const tur=r=>r[5]===1?"bos":r[5]||(/partisi/.test(r[0])?"bos":"");
  const bir=l=>/kotasyon sayısı/.test(l)?"adet":/ek kotası \(bugünkü alıma oranla\)/.test(l)?"%":/t\/ay/.test(l)?"ton":/USD\/yıl/.test(l)?"$/yıl":/USD\/t/.test(l)?"$/t":/TL\/m³/.test(l)?"TL/m³":/gün/i.test(l)?"gün":/\(t\)/.test(l)?"ton":/\(%\)/.test(l)?"%":"";
  const onEk=l=>/COD sonrası kotasyon/.test(l)?"COD sonrası":/COD/.test(l)?"COD ±":/Tüpraş ±/.test(l)?"Tüpraş ±":"";
  const adT=l=>l.replace(/ \((USD\/t|USD\/yıl|TL\/m³|gün|t|%|Açık \/ Kapalı)\)/,"").replace(/,? boş = \w+$/,"").replace(/: COD \+ gün$/,"").replace(/: COD sonrası kotasyon sayısı$/,"").replace(/: Tüpraş ±$/,"").replace(/ \(Girdiler B\d+\)$/,"");
  const f=v=>typeof v==="number"?(Math.abs(v)>=1e4?nf.format(v):String(+v.toFixed(4)).replace(".",",")):"";
  const sayi=t=>{ const s=String(t).trim().replace(/\s/g,"").replace("−","-").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."); return s===""?null:Number(s); };
  const ana=T.find(r=>/^Motorin GTS partisi/.test(r[0]));
  let h="", acik=false, ozet="";
  const bzGiz=r=>!BZ&&/benzin/i.test(r[0])&&!(r[4]&&r[4] in G)&&(r[3]==null||r[3]===r[1]);
  for(const r of T){ if(r[5]==="not"&&/SCN_GTS_RAFINERI_FARKI|paylar ve potansiyel/.test(r[0])) continue; // kullanıcı 02.11.2026 18:57: not kaldırıldı
    if(r[5]==="not"){ if(acik) h+=`<p class="tf-not">${esc(r[0].replace(/^Not:\s*/,""))}</p>`; continue; }
    if(r[1]==null&&r[2]==null&&!r[4]){ h+=`${acik?"</div>":""}<div class="tf-g" data-g="${esc(r[0])}"><h4>${esc(r[0].replace(/\s*\(Karlilik\)$/,"").replace(/\s*\(Tüpraş İzmit ± TL\/m³\)$/,""))}</h4>`; acik=true; continue; }
    if(bzGiz(r)) continue;
    if(/^Satış ve pazarlama/.test(r[0])&&!(r[4]&&r[4] in G)) continue; // kullanıcı 02.11.2026 11:39: panelden kaldırıldı
    if(/^2027 motorin GTS partisi|^Uygulanan parti/.test(r[0])&&!(r[4]&&r[4] in G)) continue; // kullanıcı 02.11.2026 18:52: panelden kaldırıldı (kayıtlı 2027 partisi varsa görünür kalır)
    const t=/^Rakip ithalatçıların alım primi/.test(r[0])?"bilgi":/^Tüpraş Batman \/ Kırıkkale ek kotası/.test(r[0])?"yuzde":tur(r), id="tg-"+(r[4]||r[0]).replace(/[^\w]/g,""), yz=t==="yuzde", gv=v=>typeof v==="number"&&yz?v*100:v, deg=r[3], deg2=r[4]&&deg!=null&&deg!==r[1];
    const not=String(r[2]||"").replace(/\s*Girdiler B\d+(, B\d+)*('?[a-zçğıöşü]*)?\.?/g,"").trim();
    // USD/t alanları: yıllık tutar girilmesin (kullanıcı 02.11.2026 18:44: "usd/ton hesapları şaşıyor")
    const dv=Object.assign({},r[6]||{}); if(bir(r[0])==="$/t"&&dv.max==null){ dv.min=/^Alım primi/.test(r[0])?-200:0; dv.max=200; dv.hata="USD/t olarak girin ("+(dv.min<0?"−200 ile 200":"0 ile 200")+" arası) – yıllık tutar değil"; }
    let inp;
    if(r[4]==="GTS!ForwardBilgi") inp=`<output id="tg-fw">${fwMetin(r[6],T)}</output>`;
    else if(t==="bilgi") inp=`<output id="${id}">${esc(typeof r[1]==="number"?(Math.abs(r[1])>=100?nf1.format(r[1]):f(r[1])):String(r[1]??"–").replace(/(\d),(?=\d{3}\b)/g,"$1."))}</output>`;
    else if(t==="sec") inp=`<select id="${id}" data-h="${esc(r[4]||"")}" data-d="${esc(deg??"")}" ${yaz&&r[4]?"":"disabled"}>${(l=>typeof r[1]==="string"&&!l.includes(r[1])?[r[1],...l]:l)((r[6]&&r[6].liste)||(/^(Evet|Hayır)$/.test(r[1])?["Evet","Hayır"]:["Açık","Kapalı"])).map(o=>`<option${o===r[1]?" selected":""}>${o}</option>`).join("")}</select>`;
    else inp=`<input id="${id}" type="text" inputmode="decimal" data-h="${esc(r[4]||"")}" data-d="${deg??""}"${yz?' data-y="1"':""} value="${f(gv(r[1]))}"${t==="bos"?` data-bos="1" placeholder="boş"`:""}${dv&&dv.min!=null&&isFinite(dv.min)?` data-min="${dv.min}"`:""}${dv&&dv.max!=null&&isFinite(dv.max)?` data-max="${dv.max}"`:""}${dv&&dv.hata?` data-hata="${esc(dv.hata)}"`:""}${dv&&dv.tip==="whole"?' data-tam="1"':""} ${yaz&&r[4]?"":"disabled"} aria-describedby="${id}-n">`;
    const ek=[/^Alım primi/.test(r[0])?"eksi = iskonto":"", !BZ&&/benzin/i.test(r[0])?"benzin ithalatı kapalı":"", /^Rakip ithalatçıların alım primi/.test(r[0])?"rakip maliyet tablosundan · değişikliği PDM yeniden hesaplar":/^Dağıtıcı geçiş eşiği/.test(r[0])?"GTS bölgeye teslimde en az bu kadar ucuzsa dağıtıcı geçer":/^Navlun avantajının/.test(r[0])?"bölgesel prim: dağıtıcının navlun tasarrufunun bu kadarı satış fiyatına · yalnız rakip maliyeti yönteminde":/^Tüpraş Batman \/ Kırıkkale ek kotası/.test(r[0])?"dağıtıcı bugünkü rafineri alımının bu oranı kadar fazlasını alabilir · gerçekçi %0–25":/^Karadeniz alternatifi/.test(r[0])?"Trabzon / Giresun / Samsun terminalinden teslim en ucuz alternatif sayılır":/^Rakip maliyeti yönteminde prim alt sınırı/.test(r[0])?"boş = sınır yok · 0 = Tüpraş İzmit altına satılmaz":r===ana?(T.some(x=>/^2027 motorin GTS partisi/.test(x[0])&&x[4]&&x[4] in G)?"2028 · boş = tam gemi":"boş = tam gemi"):t==="bos"?"boş = 2028 partisi":"", /^Uygulanan parti/.test(r[0])?"2027 / 2028":"", /^Bayi kotası/.test(r[0])?"zam beklentisinde normal günün üstüne azami ek alım":"", /^(Sörvey|Satış ve pazarlama)/.test(r[0])?`<span class="tyil" data-k="${esc(r[4]||"")}">${tYil(r[1])}</span>`:"", /^Asgari (müşteri|aylık) alım/.test(r[0])?(V.minAlim&&V.minAlim.n?`${V.minAlim.n} dağıtıcı çıkarıldı · motorin −${ton(V.minAlim.tonM)} (%${nf1.format(V.minAlim.sM*100)})`:"0 = sınır yok"):"", r[7]&&r[7].tl!=null?`%${nf1.format(r[7].pay*100)} hacim · potansiyel ${nf.format(r[7].tl)} TL/m³${typeof r[1]==="number"&&r[1]>r[7].tl?' · <b class="uyar">potansiyeli aşıyor</b>':""}`:"", /^Satış hedefi/.test(r[0])&&V.hedef?`hedef ${nf.format(V.hedef.tam/1e3)} kt/yıl → ${nf.format(V.hedef.tam*(r[1]||1)/1e3)} kt/yıl${(()=>{ const p=V.kartab&&V.kartab.rows.find(x=>/^PLANLANAN SATIŞ/.test(x[0])); return p&&YIL?` · ${YIL} planlanan ${nf.format(p[YIL==="2027"?1:2]/1e3)} kt`:""; })()}`:"", t==="bilgi"?"model hesabı":""].filter(Boolean);
    const alt=[deg2?`<b>varsayılan ${typeof deg==="number"?f(gv(deg)):esc(String(deg))}</b>`:"",...ek].filter(Boolean).join(" · ");
    const lab=adT(r[0]).replace(/^Alım primi \/ iskontosu – /,"Alım primi – ").replace(/^Motorin GTS partisi.*$/,"Motorin partisi").replace(/^2027 motorin GTS partisi.*$/,"2027 partisi").replace(/^Uygulanan parti.*$/,"Uygulanan parti").replace(/^Hedge kilit fiyatı.*$/,"Hedge kilit fiyatı").replace(/^Bayi kotası.*$/,"Bayi kotası").replace(/^Satış primi yöntemi.*$/,"Satış primi yöntemi").replace(/^Rakip maliyeti yönteminde prim alt sınırı.*$/,"Prim alt sınırı (rakip maliyeti)").replace(/^Rakip ithalatçıların alım primi.*$/,"Rakip ithalatçıların alım primi").replace(/^Dağıtıcı geçiş eşiği.*$/,"Dağıtıcı geçiş eşiği").replace(/^Navlun avantajının satış fiyatına yansıtılan payı.*$/,"Navlun avantajının fiyata yansıyan payı").replace(/^Tüpraş Batman \/ Kırıkkale ek kotası.*$/,"Rafineri ek kotası (Batman / Kırıkkale)").replace(/^Karadeniz alternatifi.*$/,"Karadeniz alternatifi dahil").replace(/^Asgari müşteri alımı.*$/,"Asgari müşteri alımı (aylık)").replace(/^USD faizi – yıllık.*$/,"USD faizi – forward").replace(/^USD borçlanma faizi – yıllık.*$/,"USD borçlanma faizi").replace(/^TL faizi – yıllık.*$/,"TL faizi").replace(/^TL finansman faizi.*$/,"TL faizi").replace(/^USD faizi – forward.*$/,"USD faizi – forward").replace(/^Asgari aylık alım.*$/,"Asgari müşteri alımı (aylık)").replace(/^Satış hedefi.*$/,"Satış hedefi").replace(/^Satış fiyatı – motorin.*ağırlıklı.*$/,"Satış primi – motorin, ağırlıklı").replace(/^Mersin üçüncü taraf terminallerinden gelen bayi.*$/,"Mersin üçüncü taraf terminali bayisi").replace(/\s*\(TL\/m³\)$/,"").replace(/^Satış fiyatı – /,"Satış fiyatı – ");
    h+=`<div class="tf-r${deg2?" deg":""}${t==="bilgi"?" bilgi":""}" title="${esc(not)}"><label for="${id}">${esc(lab)}<small id="${id}-n">${alt}</small></label>
      <div class="tf-v">${onEk(r[0])?`<em>${onEk(r[0])}</em>`:""}${inp}</div><span class="tf-u">${t!=="sec"?bir(r[0]):""}</span></div>`; }
  if(acik) h+="</div>";
  { // fiyat ortalamaları (seçili fiyat yolu; dönem = kilitli/seçili yıl)
    const F=V.fiy||[], t0=Date.UTC(2027,0,1), yr=i=>String(new Date(t0+i*864e5).getUTCFullYear()), Fs=F.filter((_,i)=>!YIL||yr(i)===YIL);
    if(Fs.length){ const ort=j=>{ const v=Fs.map(r=>r[j]).filter(x=>typeof x==="number"); return v.length?v.reduce((a,b)=>a+b,0)/v.length:null; }, tp=ort(3), cf=ort(0);
      const K=V.km.filter(k=>typeof k[33]==="number"?(YIL==="2027"?k[33]>0:YIL==="2028"?k[33]<1:true):yilOk(k[4])), w=k=>k[2]*(typeof k[33]==="number"?(YIL==="2027"?k[33]:YIL==="2028"?1-k[33]:1):1);
      const kw=K.reduce((a,k)=>a+w(k),0), cfK=kw?K.reduce((a,k)=>a+k[9]*w(k),0)/kw:null;
      const sr=V.kartab&&V.kartab.rows.find(r=>/Ortalama satış fiyatı/.test(r[0])), sat=sr?sr[YIL==="2027"?1:YIL==="2028"?2:3]:null, d1=v=>v==null?"–":nf1.format(v);
      const sat1=(l,v,alt)=>`<div class="tf-r bilgi"><label>${l}<small>${alt}</small></label><div class="tf-v"><output>${v}</output></div><span class="tf-u">$/t</span></div>`;
      const YG=(v=>isFinite(v)&&v>0?v:.845)(+gir("Tüpraş fiyatı dönüşüm yoğunluğu – motorin (t/m³)")), tl=(v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null)(Fs.filter(r=>typeof r[3]==="number"&&typeof r[2]==="number").map(r=>r[3]*r[2]*YG));
      const kr=(l,v,u)=>`<div class="tf-r bilgi"><label>${l}</label><div class="tf-v"><output>${v}</output></div><span class="tf-u">${u}</span></div>`;
      ozet=`<div class="tf-ozet"><span class="tf-oz-b">Ortalama fiyatlar · ${YIL||"2027–2028"}</span><span>Tüpraş fiyatı (vergisiz) <b>${tl==null?"–":nf.format(tl)}</b> TL/m³</span><span>Platts CIF Med motorin <b>${d1(cf)}</b> $/t</span><span>USD/TRY <b>${(k=>k==null?"–":nf2.format(k))(ort(2))}</b> TL/$</span></div>`; } }
  el.innerHTML=`${ozet}<div class="tf tf3">${h}</div><div class="tic-a">${yaz?`<button type="button" class="ana" id="tic-hesap" disabled>Modeli bu koşullarla hesapla</button>${nG?`<button type="button" class="btn" id="tic-sifir">Model varsayılanına dön</button>`:""}<span class="chip ${nG?"eski":"ok"}">${nG?`Sizin girdileriniz uygulanıyor (${nG})`:"Model varsayılanları"}</span><span class="not" id="tic-d"></span>`:`<span class="not">Değerleri masaüstü uygulamasında (GTS Dörtyol) girebilirsiniz; model sizin koşullarınızla yeniden hesaplanır.</span>`}</div>`;
  { // dengeli kolonlar (kullanıcı 02.11.2026 19:01): grup → kolon; düzene girmeyen grup en kısa kolona
    const tf=el.querySelector(".tf3"), gs=[...tf.querySelectorAll(":scope>.tf-g")], K=[0,1,2].map(()=>Object.assign(document.createElement("div"),{className:"tf-k"}));
    const KOL=[[/^Alım tarafı/,0],[/^Satış tarafı/,0],[/^Müşteri davranışı/,0],[/^Faiz ve finansman/,1],[/^Kaynak bazlı/,1],[/^Hedge/,2],[/^Faaliyet giderleri/,2]], boy=k=>K[k].querySelectorAll(".tf-r").length;
    const sira=g=>{ const i=KOL.findIndex(([re])=>re.test(g.dataset.g||"")); return i<0?99:i; }; gs.sort((a,b)=>sira(a)-sira(b));
    for(const g of gs){ const m=KOL.find(([re])=>re.test(g.dataset.g||"")); const k=m?m[1]:[0,1,2].sort((a,b)=>boy(a)-boy(b))[0]; K[k].appendChild(g); }
    tf.replaceChildren(...K); }
  /* kullanıcı 09.11.2026 12:08: "rakip maliyeti açık iken kaynak bazlı satış tablosu inaktif olsun" – yöntem Rakip maliyeti iken kaynak bazlı primler,
     Sabit segment iken rakip maliyeti alt sınırı kullanılmaz; seçim değişince anında güncellenir */
  { const ym=T.find(x=>/^Satış primi yöntemi/.test(x[0])), sl=ym&&ym[4]?el.querySelector(`select[data-h="${ym[4]}"]`):null, kg=[...el.querySelectorAll(".tf-g")].find(g=>/^Kaynak bazlı/.test(g.dataset.g||""));
    const altR=T.find(x=>/^Rakip maliyeti yönteminde prim alt sınırı/.test(x[0])), altI=altR&&altR[4]?el.querySelector(`[data-h="${altR[4]}"]`):null;
    const uygula=()=>{ const rk=(sl?sl.value:ym&&ym[1])==="Rakip maliyeti";
      if(kg){ kg.classList.toggle("pasif",rk); let nt=kg.querySelector(".tf-pasif"); if(!nt){ nt=document.createElement("p"); nt.className="tf-pasif"; kg.querySelector("h4").after(nt); }
        nt.textContent=rk?"Rakip maliyeti yöntemi seçili: prim her dağıtıcının bugünkü alternatif alım maliyetinden hesaplanır, bu tablo kullanılmaz.":""; nt.hidden=!rk;
        for(const i of kg.querySelectorAll("input,select")){ if(i.dataset.ac==null) i.dataset.ac=i.disabled?"0":"1"; i.disabled=rk||i.dataset.ac==="0"; } kg.setAttribute("aria-disabled",String(rk)); }
      if(altI){ const r=altI.closest(".tf-r"); if(altI.dataset.ac==null) altI.dataset.ac=altI.disabled?"0":"1"; altI.disabled=!rk||altI.dataset.ac==="0"; if(r) r.classList.toggle("pasif",!rk); } };
    if(ym){ uygula(); if(sl) sl.addEventListener("change",uygula); } }
  if(!yaz) return;
  const I=[...el.querySelectorAll("[data-h]")].filter(i=>i.dataset.h), btn=$("tic-hesap"), d=$("tic-d");
  const oku=i=>{ if(i.tagName==="SELECT") return i.value; const v=sayi(i.value); if(v===null) return i.dataset.bos?null:NaN; return i.dataset.y?v/100:v; };
  const ilk=new Map(I.map(i=>[i,i.value]));
  for(const sp of el.querySelectorAll(".tyil")){ const i=I.find(x=>x.dataset.h===sp.dataset.k); if(i) i.addEventListener("input",()=>{ const v=oku(i); sp.textContent=typeof v==="number"&&isFinite(v)?tYil(v):""; }); }
  { const fr=T.find(x=>x[4]==="GTS!ForwardBilgi"), ip=re=>I.find(i=>{ const r=T.find(x=>x[4]===i.dataset.h); return r&&re.test(r[0]); }), iTL=ip(/^TL (finansman )?faizi/), iUS=ip(/^USD faizi/), iVD=ip(/^Satış vadesi/), o=$("tg-fw");
    if(fr&&o&&iTL&&iUS){ const yen=()=>{ const v=x=>x?oku(x):null; o.textContent=fwMetin(fr[6],T,v(iTL),v(iUS),iVD?v(iVD):null); }; for(const i of [iTL,iUS,iVD]) if(i) i.addEventListener("input",yen); } }
  const kontrol=()=>{ let deg=false, hata=false; for(const i of I){ const v=oku(i); const ok=v===null||typeof v==="string"||isFinite(v)&&(!i.dataset.bos||v>0)&&(i.dataset.min==null||v>=+i.dataset.min-1e-9)&&(i.dataset.max==null||v<=+i.dataset.max+1e-9)&&(!i.dataset.tam||Math.abs(v-Math.round(v))<1e-9); i.classList.toggle("hata",!ok); if(!ok){ hata=i.dataset.hata||true; continue; } if(i.value.trim()!==ilk.get(i).trim()) deg=true; }
    btn.disabled=hata||!deg; d.textContent=hata?(typeof hata==="string"?"Geçersiz değer: "+hata:"Geçerli bir sayı girin."):deg?"Değişiklikler hesaplanmadı.":""; };
  for(const i of I){ i.addEventListener(i.tagName==="SELECT"?"change":"input",kontrol); i.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!btn.disabled) btn.click(); }); }
  kontrol();   // kayıtlı girdi sınır dışındaysa (ör. USD/t alanına yıllık tutar) açılışta işaretle
  const kaydet=(o)=>girdiYaz(TK,o||{});
  btn.onclick=()=>{ const o={}; for(const i of I){ const v=oku(i), dd=i.dataset.d; if(v===null) continue;
      const esit=typeof v==="string"?v===dd:(dd!==""&&Math.abs(v-Number(dd))<1e-12); if(!esit) o[i.dataset.h]=v; }
    o["GTS!RiskHesapla"]=true;   // kullanıcı 03.11.2026: Genel bakıştaki değişiklik Risk tablolarına da yansısın
    try{ kaydet(o); }catch(e){ d.textContent="Girdiler kaydedilemedi: "+e.message; return; } btn.disabled=true; d.textContent="Hesaplanıyor… (Risk tabloları dahil, yaklaşık 1 dk)"; window.gts.yenile(); };
  const sf=$("tic-sifir"); if(sf) sf.onclick=()=>{ try{ kaydet({"GTS!RiskHesapla":true}); }catch(e){ d.textContent=e.message; return; } window.gts.yenile(); };
}

/* ---------- PAZAR VE AKIŞ ---------- */
const A=V.akis, VAD={REF:"Referans · 3,5 $/t, MR, 150 bin m³",TARIFE_2:"GTS tarifesi 2 $/t",TARIFE_5:"GTS tarifesi 5 $/t",RAKIP_MERSIN_YARI:"Mersin tarifesi yarıya iner",RAKIP_MERSIN_TAM:"Mersin tarifesi sıfırlanır",GEMI_LR1:"LR1 gemi",GEMI_LR2:"LR2 gemi",TANK_120:"Tank 120 bin m³",TANK_200:"Tank 200 bin m³",DEVIR_12:"Azami devir 12",GERCEKCI:"Gerçekçi: Mersin −%50, LR2, devir 12",GERCEKCI_200:"Gerçekçi + tank 200 bin m³"};
const S={dsec:null,sen:"HEDEF_150",vaka:"GERCEKCI_200",ku:"m",fu:"m",rs:0,ms:"Baz",acik:new Set(),hu:"m",hku:"m",hhep:false,hkhep:false};
const tAd=t=>{ const x=V.term[t]; return x?(x[0]==="T227"?"GTS Dörtyol":x[1]):"?"; };
const PJ=V.geo.proj, pj=(la,lo)=>[(lo-PJ.minx)*PJ.cos*PJ.sx,(PJ.maxy-la)*PJ.sx];
/* Pazar ve akış hedef satışa göre (kullanıcı 02.11.2026 12:53): 2026 akış senaryosunun şirket × il × terminal kayma deseni,
   modelin hedef satışına ölçeklenir; hedef müşteriler dağıtıcılar. */
function hedefTon(){ const yil=+(gir("Seçili motorin (t/yıl)")??gir("Seçili motorin (t/yıl) – asgari alım kuralı sonrası"))||(V.hedef?V.hedef.tam*(V.hedef.oran||1):0), sat=oz("Motorin satışı (t)",1);
  const v=YIL?sat[YIL==="2027"?1:2]:yil; return {yil, v:typeof v==="number"?v:yil, ad:YIL?YIL+" satış":"yıllık hedef"}; }
function akis(){
  const sel=$("a-vaka"), HT=hedefTon(); S.sen=V.minAlim&&V.minAlim.sen?V.minAlim.sen:HT.yil&&HT.yil<=1125000?"BAZ_075":"HEDEF_150"; { const sg=$("a-sen"); if(sg) sg.hidden=true; }
  const doldur=()=>{ const L=A.oz.filter(r=>r[0]===S.sen); if(!L.some(r=>r[1]===S.vaka)) S.vaka="REF"; let og="",h=""; for(const r of L){ if(r[2]!==og){ if(og) h+="</optgroup>"; h+=`<optgroup label="${esc(r[2])}">`; og=r[2]; } h+=`<option value="${esc(r[1])}">${esc(VAD[r[1]]||r[1])}</option>`; } sel.innerHTML=h+"</optgroup>"; sel.value=S.vaka; };
  sel.onchange=()=>{ S.vaka=sel.value; ciz(); };
  for(const b of $("a-sen").querySelectorAll("button")) b.onclick=()=>{ S.sen=b.dataset.s; for(const x of $("a-sen").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); doldur(); ciz(); };
  doldur(); ciz();
  function ciz(){
    const oi=A.oz.findIndex(r=>r[0]===S.sen&&r[1]===S.vaka), o=A.oz[oi], f=o[9]>0?HT.v/o[9]:1, fb=BZ?f:0, fu=u=>u?f:fb;
    // asgari aylık alım (kullanıcı 02.11.2026 17:01): eşik altı dağıtıcılar çıkarıldı; kalanlar modelin (düşmüş) satışını paylaşır
    // dağıtıcı geçiş kuralı (paket 109+, kullanıcı 09.11.2026 21:25): GTS avantajı eşiğin altındaki dağıtıcı × il × kaynak terminal akışı GTS'ye geçmez
    const GX=new Map(); for(const g of (V.gecis&&V.gecis.r)||[]) GX.set(g[0]+"|"+g[1]+"|"+g[2],g); const gx=r=>r[3]===1?GX.get(r[1]+"|"+V.il[r[2]]+"|"+r[4]):null, gecmez=r=>{ const g=gx(r); return !!g&&!g[9]; };
    const MA=V.minAlim&&V.minAlim.n?V.minAlim:null, EX=new Set(MA?MA.sir:[]), mEx=A.ky.reduce((q,r)=>q+(r[0]===oi&&r[3]===1&&(EX.has(r[1])||gecmez(r))?r[6]:0),0), f2=o[9]-mEx>0?HT.v/(o[9]-mEx):f, fu2=u=>u?f2:(BZ?f2:0);
    S.gecY=A.ky.filter(r=>r[0]===oi&&r[3]===1&&!EX.has(r[1])&&gecmez(r)).map(r=>({s:r[1],il:r[2],k:r[4],t:r[6],g:gx(r)}));
    $("a-sub").textContent="";
    const kt=(l,v,s,c="")=>`<div class="kt ${c}" style="grid-column:span 3"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
    const KY=A.ky.filter(r=>r[0]===oi&&(BZ||r[3])&&!EX.has(r[1])&&!gecmez(r)).map(r=>{ const q=fu2(r[3]); return [r[0],r[1],r[2],r[3],r[4],r[5],r[6]*q,r[7]*q,r[8],r[9],r[10]]; }),
      IK=A.ik.filter(r=>r[0]===oi&&(BZ||r[5])).map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6]*fu(r[5]),r[7],r[8]]),
      TM=A.tm.filter(r=>r[0]===oi&&(BZ||r[2])).map(r=>[r[0],r[1],r[2],r[3],r[3]+(r[4]-r[3])*fu(r[2])]);
    for(const x of S.gecY){ const q=x.t*f, r=A.ky.find(k=>k[0]===oi&&k[1]===x.s&&k[2]===x.il&&k[4]===x.k&&k[3]===1), a=TM.find(t=>t[1]===x.k&&t[2]===1), b=r?TM.find(t=>t[1]===r[5]&&t[2]===1):null; if(a) a[4]+=q; if(b) b[4]-=q; }   // geçmeyen akış kaynak terminalde kalır
    S.gecAv=new Map(); for(const r of KY){ const g=gx(r); if(!g) continue; const z=S.gecAv.get(r[1])||S.gecAv.set(r[1],{t:0,a:0}).get(r[1]); z.t+=r[6]; z.a+=r[6]*g[8]; }
    const nSir=new Set(KY.map(r=>r[1])).size;
    const KG={M:0,D:0,B:0,K:0}; for(const r of KY) KG[kayKod(r)]+=r[6]; const KT=KG.M+KG.D+KG.B+KG.K||1;
    $("a-kart").innerHTML=kt(`GTS ${HT.ad}`,ton(HT.v),`${BZ?`motorin ${ton(HT.v)} · benzin ${ton(o[10]*fb)}`:"yalnız motorin"} · ${nSir} dağıtıcı${V.gecis&&V.gecis.r.length?(()=>{ const R=V.gecis.r, p=R.reduce((a,g)=>a+g[3],0), q=R.reduce((a,g)=>a+(g[9]?g[3]:0),0); return `<br>geçiş kuralı: ${R.filter(g=>g[9]).length} / ${R.length} akış, potansiyelin ${pct(p?q/p:0)}${V.gecis.esik!=null?` · eşik ${nf.format(V.gecis.esik)} TL/m³`:""}`; })():""}`)
      +(KG.D+KG.B+KG.K>0?kt("Bayinin bugünkü kaynağı · Mersin ithal",pct(KG.M/KT),[["D","Tüpraş Mersin deposu"],["B","Tüpraş Batman"],["K","Tüpraş Kırıkkale"]].filter(([g])=>KG[g]>0).map(([g,a])=>`<span style="color:${KAYG[g][1]}">${a} ${ton(KG[g])}</span>`).join(" · ")+` · Mersin ithal ${ton(KG.M)}`):"");
    dagPanel(KY,IK,TM);
    const T=[...TM.filter(r=>r[4]>r[3]).sort((a,b)=>b[4]-a[4]),...TM.filter(r=>r[4]<=r[3]).sort((a,b)=>(a[4]-a[3])-(b[4]-b[3]))];
    $("a-term").innerHTML=`<thead><tr><th class="l">Terminal</th><th class="l">Ürün</th><th>Önce</th><th>Sonra</th><th>Değişim</th><th>%</th></tr></thead><tbody>`+T.map(r=>{ const d=r[4]-r[3]; return `<tr><td class="l"><b>${esc(tAd(r[1]))}</b> <span class="muted">· ${esc(V.term[r[1]]?V.term[r[1]][2]:"")}</span></td><td class="l">${r[2]?"Motorin":"Benzin"}</td><td>${ton(r[3])}</td><td>${ton(r[4])}</td><td class="${d>0?"p":"n"}"><b>${d>0?"+":""}${ton(d)}</b></td><td class="muted">${r[3]?pct(d/r[3]):"yeni"}</td></tr>`; }).join("")+`</tbody>`;
    const ls=T.filter(r=>r[4]<r[3]); $("a-tsub").textContent=`${ls.length} terminal × ürün kaybediyor · toplam kayıp ${ton(ls.reduce((a,r)=>a+r[3]-r[4],0))}`;
    const SM=new Map(); for(const r of KY){ const x=SM.get(r[1])||SM.set(r[1],{v:[0,0],it:0,ko:0,ks:0,il:new Map()}).get(r[1]); x.v[r[3]]+=r[6]; x.it+=r[7]; x.ko+=r[6]*r[8]; x.ks+=r[6]*r[9]; const y=x.il.get(r[2])||x.il.set(r[2],{v:[0,0],ko:0,ks:0}).get(r[2]); y.v[r[3]]+=r[6]; y.ko+=r[6]*r[8]; y.ks+=r[6]*r[9]; }
    const SL=[...SM].sort((a,b)=>(b[1].v[0]+b[1].v[1])-(a[1].v[0]+a[1].v[1]));
    const kk=(x)=>{ const t=x.v[0]+x.v[1]; return t?`${nf.format(x.ko/t)} → ${nf.format(x.ks/t)}`:""; };
    const TOP=SL.reduce((a,[,x])=>a+x.v[0]+x.v[1],0)||1, ay=YIL?12:12;
    let h=`<thead><tr><th class="l">Dağıtıcı / il</th><th>Pay</th><th>${YIL?YIL+" alım":"Yıllık alım"}<br><span>motorin, t</span></th>${BZ?"<th>Benzin, t</th>":""}<th>Aylık ort.<br><span>t/ay</span></th><th>Leg2 km önce → sonra</th></tr></thead><tbody>`;
    for(const [s,x] of SL){ const ac=S.acik.has(s), t=x.v[0]+x.v[1]; h+=`<tr class="top" data-s="${s}" aria-expanded="${ac}"><td class="l">${ac?"▾":"▸"} <b>${esc(V.sir[s]||"?")}</b> <span class="muted">· ${esc((V.sirg&&V.sirg[s])||"")}${V.sirg&&V.sirg[s]?" · ":""}${x.il.size} il</span></td><td class="muted">${pct(t/TOP)}</td><td><b>${ton(x.v[1])}</b></td>${BZ?`<td>${ton(x.v[0])}</td>`:""}<td>${ton((x.v[0]+x.v[1])/ay)}</td><td>${kk(x)}</td></tr>`;
      if(ac) for(const [i,y] of [...x.il].sort((a,b)=>(b[1].v[0]+b[1].v[1])-(a[1].v[0]+a[1].v[1]))) h+=`<tr><td class="l" style="padding-left:28px">${esc(V.il[i]||"?")}</td><td class="muted">${pct((y.v[0]+y.v[1])/TOP)}</td><td>${ton(y.v[1])}</td>${BZ?`<td>${ton(y.v[0])}</td>`:""}<td>${ton((y.v[0]+y.v[1])/ay)}</td><td>${kk(y)}</td></tr>`; }
    h+=`<tr class="top"><td class="l"><b>Toplam</b></td><td class="muted">%100</td><td><b>${ton(SL.reduce((a,[,x])=>a+x.v[1],0))}</b></td>${BZ?`<td>${ton(SL.reduce((a,[,x])=>a+x.v[0],0))}</td>`:""}<td>${ton(TOP/ay)}</td><td></td></tr>`;
    const tb=$("a-sir"); tb.innerHTML=h+`</tbody>`; for(const tr of tb.querySelectorAll("tr[data-s]")) tr.onclick=()=>{ const s=+tr.dataset.s; S.acik.has(s)?S.acik.delete(s):S.acik.add(s); ciz(); };
    $("a-ssub").textContent=`${SM.size} dağıtıcı · ${HT.ad} ${ton(HT.v)} 2026 akışındaki paylarına göre${MA?` · aylık ${ton(MA.esik)} altında alan ${MA.n} dağıtıcıya satış yok (${ton(MA.tonM)} motorin düşüldü)`:""} · satıra tıklayınca iller açılır`;
  }
}
const KAYG={M:["Mersin terminalinden (ithal ürün)",C.gts],D:["Tüpraş Mersin deposundan","#C0504D"],B:["Tüpraş Batman'dan","#7B4FA0"],K:["Tüpraş Kırıkkale'den","#2A8C8C"]};
const kayKod=r=>r[10]||(()=>{ const c=V.term[r[4]]&&V.term[r[4]][0]; return c==="T13"?"B":c==="T21"?"K":"M"; })();
function harita(KY,IK,TM,SF){
  const G=V.geo, u=G.w/1000, add=(m,k,x)=>m.set(k,(m.get(k)||0)+x);
  const IV=new Map(), IU=new Map(); for(const r of KY){ add(IV,r[2],r[6]); const o=IU.get(r[2])||IU.set(r[2],[0,0,0,0]).get(r[2]); o[r[3]]+=r[6]; o[2]+=r[6]*r[8]; o[3]+=r[6]*r[9]; }
  const mx=Math.max(1,...IV.values());
  let m=""; for(const [n,d] of Object.entries(G.p)){ const x=IV.get(+n)||0; m+=`<path d="${d}" fill="${x>=0.5?`rgba(184,134,11,${(0.10+0.48*Math.sqrt(x/mx)).toFixed(2)})`:"var(--c0)"}" stroke="#fff" stroke-width="${(0.6*u).toFixed(2)}"><title>${esc(V.il[n]||"")}${x>=0.5?": "+ton(x):""}</title></path>`; }
  const gt=Object.keys(V.term).find(k=>V.term[k][0]==="T227"); let e="";
  if(gt!=null){ const [gx,gy]=pj(V.term[gt][3],V.term[gt][4]);
    // kaynak grubuna göre yay: bayinin bugünkü kaynağı Mersin / Tüpraş Batman / Tüpraş Kırıkkale
    const KV=new Map(); for(const r of KY){ const g=kayKod(r), k=r[2]+"|"+g; KV.set(k,(KV.get(k)||0)+r[6]); }
    for(const [k,x] of [...KV].sort((a,b)=>a[1]-b[1])){ const [i0,g]=k.split("|"), i=+i0, c=G.c&&G.c[i]; if(!c||x<0.01*mx) continue; if(Math.hypot(c[0]-gx,c[1]-gy)<4*u) continue; const h=g==="M"?18:g==="D"?26:g==="B"?34:44;
      e+=`<path d="M${gx.toFixed(1)},${gy.toFixed(1)} Q${((gx+c[0])/2).toFixed(1)},${(Math.min(gy,c[1])-h*u).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}" stroke="${KAYG[g][1]}" stroke-opacity=".8" stroke-linecap="round" stroke-width="${(0.6*u+5*u*Math.sqrt(x/mx)).toFixed(2)}" fill="none"><title>GTS → ${esc(V.il[i]||"")} · bugün ${KAYG[g][0]}: ${ton(x)}</title></path>`; } }
  let dt=""; const mk=Math.max(1,...IK.map(r=>r[6])); for(const r of IK){ if(r[3]==null) continue; const [px,py]=pj(r[3],r[4]), sv=r[7]-r[8]; dt+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${Math.max(1.2*u,5*u*Math.sqrt(r[6]/mk)).toFixed(1)}" fill="${sv>=100?C.pos:sv>=50?"#5FA36F":"#A7C9AE"}" fill-opacity=".85" stroke="#fff" stroke-width="${(0.4*u).toFixed(2)}"><title>${esc(r[2])} · ${r[5]?"motorin":"benzin"} ${ton(r[6])} · ${nf.format(r[7])} → ${nf.format(r[8])} km</title></circle>`; }
  // terminal ve rafineri işaretleri (kullanıcı 02.11.2026 15:30: daha görünür, rafineri ikonu farklı)
  const RAF=t=>V.term[t]&&(V.term[t][5]==="R"||/Rafineri|Tüpraş (Batman|Kırıkkale|İzmit|Aliağa)|Star Rafineri/.test(V.term[t][1]||""));
  const ikon=(px,py,a,raf,dolgu,cizgi,sw,baslik)=>raf
    ? `<g transform="translate(${(px-a/2).toFixed(1)},${(py-a/2).toFixed(1)}) scale(${(a/24).toFixed(3)})"><title>${baslik}</title><path d="M2 22V11l6 3V9l6 3V4h3v7h3v-7h2v18z" fill="${dolgu}" stroke="${cizgi}" stroke-width="${(sw*24/a).toFixed(2)}" stroke-linejoin="round"/></g>`
    : `<rect x="${(px-a/2).toFixed(1)}" y="${(py-a/2).toFixed(1)}" width="${a.toFixed(1)}" height="${a.toFixed(1)}" rx="${(a*0.18).toFixed(1)}" fill="${dolgu}" stroke="${cizgi}" stroke-width="${sw.toFixed(2)}"><title>${baslik}</title></rect>`;
  const KUT=[]; const yazi=(x,y,t,renk,anc="start")=>{ const w=String(t).replace(/<[^>]*>/g,"").length*5.9*u, h=12*u; let x0=anc==="end"?x-w:x;
    for(let k=0;k<8&&KUT.some(b=>x0<b[0]+b[2]&&x0+w>b[0]&&y-h<b[1]&&y>b[1]-b[3]);k++) y+=h; KUT.push([x0,y,w,h]); return yazi0(x,y,t,renk,anc); };
  const yazi0=(x,y,t,renk,anc="start")=>`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anc}" style="font:600 ${(10.5*u).toFixed(1)}px var(--f-body);fill:${renk};paint-order:stroke;stroke:#fff;stroke-width:${(3.2*u).toFixed(1)}">${t}</text>`;
  const TV=new Map(); for(const r of TM) add(TV,r[1],r[4]-r[3]); const mT=Math.max(1,...[...TV.values()].map(Math.abs)); let nd="", lb="";
  // aynı konumdaki (aynı liman) kaybeden terminaller tek işarette toplanır; rafineriler ayrı
  const KT=new Map(); for(const [t,d] of TV){ const x=V.term[t]; if(!x) continue; if(d>0){ KT.set("g"+t,{t,d,adlar:[]}); continue; } const k=RAF(t)?"r"+t:"h"+x[2]; const o=KT.get(k)||KT.set(k,{t,d:0,adlar:[],n:0}).get(k); o.d+=d; o.n++; o.adlar.push(`${tAd(t)} ${ton(-d)}`); }
  for(const {t,d,adlar,n} of [...KT.values()].sort((a,b)=>Math.abs(b.d)-Math.abs(a.d))){ const x=V.term[t]; const [px,py]=pj(x[3],x[4]), g=d>0;
    if(g){ const r=Math.max(5*u,14*u*Math.sqrt(Math.abs(d)/mT)); nd+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${C.gts}" stroke="#fff" stroke-width="${(1.6*u).toFixed(2)}"><title>${esc(tAd(t))}: +${ton(d)}</title></circle>`; lb+=yazi(px-r-4*u,py-r,`${esc(tAd(t))} +${ton(d)}`,"var(--ink)","end"); continue; }
    const raf=RAF(t), a=Math.max(raf?13*u:10*u,26*u*Math.sqrt(Math.abs(d)/mT)), ad=n>1?`${x[2].replace(/\s*\(.*\)$/,"")} · ${n} terminal`:tAd(t);
    nd+=ikon(px,py,a,raf,raf?"#FCE9E6":"#FDEDEA",C.neg,1.6*u,`${esc(ad)}${raf?" (rafineri)":""}: GTS'ye kayan ${ton(-d)}${n>1?"\n"+adlar.map(esc).join("\n"):""}`);
    lb+=yazi(px-a/2-4*u,py+a/2+11*u,`${esc(ad)} −${ton(Math.abs(d))}`,C.neg,"start"); }
  // şirketin ikmal noktaları: aynı konumdakiler (aynı liman / rafineri sahası) yan yana dizilir, etiket tek blok
  let sf=""; if(SF&&SF.length){ const ms=Math.max(1,...SF.map(r=>r[1])), HG=new Map();
    const MER=[]; for(const r of [...SF].sort((a,b)=>b[1]-a[1])){ const x=V.term[r[0]]; if(!x||x[0]==="T227"||TV.has(r[0])) continue; const [qx,qy]=pj(x[3],x[4]); let m=MER.find(g=>Math.hypot(g[0]-qx,g[1]-qy)<26*u); if(!m){ m=[qx,qy,[]]; MER.push(m); } m[2].push(r); }
    MER.forEach((g,n)=>HG.set(n,g[2]));
    for(const L of [...HG.values()].sort((a,b)=>b.reduce((s,r)=>s+r[1],0)-a.reduce((s,r)=>s+r[1],0))){ L.sort((a,b)=>b[1]-a[1]); const x0=V.term[L[0][0]], [px,py]=pj(x0[3],x0[4]);
      const A=L.map(([t,v])=>Math.max(8*u,22*u*Math.sqrt(v/ms))); let cx=px-A[0]/2;
      L.forEach(([t,v,k],n)=>{ const raf=RAF(t), a=A[n]; sf+=ikon(cx+a/2,py,a,raf,raf?"#2F3E4E":C.mot,"#fff",1.2*u,`${esc(tAd(t))}${raf?" (rafineri)":""} · 2026 motorin ikmali ${ton(v)}${k>=0.5?` · GTS'ye kayan ${ton(k)}`:""}`); cx+=a+2*u; });
      const sat=L.filter(r=>r[1]>=0.03*ms); sat.forEach(([t,v],n)=>{ sf+=yazi0(cx+2*u,py+4*u+n*12*u,`${esc(tAd(t))} ${ton(v)}`,RAF(t)?"#2F3E4E":C.mot); }); } }
  $("a-harita").innerHTML=`<svg viewBox="0 0 ${G.w} ${G.h}" role="img" aria-label="GTS'ye kayan hacim haritası">${m}<g>${e}</g><g>${dt}</g><g>${sf}</g><g>${nd}</g><g style="pointer-events:none">${lb}</g></svg><div class="lg">${["M","D","B","K"].filter(g=>KY.some(r=>kayKod(r)===g)).map(g=>`<span><i style="background:${KAYG[g][1]};height:4px"></i>GTS → il · bugün ${KAYG[g][0]}</span>`).join("")}<span><i class="k" style="background:#FDEDEA;border:1.5px solid ${C.neg};border-radius:2px"></i>hacim kaybeden terminal</span><span><svg width="14" height="14" viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;flex:none"><path d="M2 22V11l6 3V9l6 3V4h3v7h3v-7h2v18z" fill="#FCE9E6" stroke="${C.neg}" stroke-width="2"/></svg> hacim kaybeden rafineri</span>${SF&&SF.length?`<span><i class="k" style="background:${C.mot};border-radius:2px"></i>şirketin terminali</span><span><svg width="14" height="14" viewBox="0 0 24 24" style="width:14px;height:14px;vertical-align:-2px;flex:none"><path d="M2 22V11l6 3V9l6 3V4h3v7h3v-7h2v18z" fill="#2F3E4E"/></svg> şirketin rafineri ikmali · 2026 motorin</span>`:""}${IK.length?`<span><i class="k" style="background:${C.pos};border-radius:50%"></i>ilçe · Leg2 kısalması ≥ 100 km (koyu)</span>`:`<span class="muted">ilçe noktaları yalnız referans vakada</span>`}</div>`;
}
/* Dağıtıcı paneli (kullanıcı 02.11.2026 13:15): tıklanan dağıtıcı haritayı filtreler; 10 kt altı "Diğer" altında toplanır */
const DAG_ESIK=20000;
function dagPanel(KY,IK,TM){
  const SM=new Map(); for(const r of KY){ const o=SM.get(r[1])||SM.set(r[1],{t:0,ko:0,ks:0,il:new Set(),g:{M:0,D:0,B:0,K:0}}).get(r[1]); o.t+=r[6]; o.ko+=r[6]*r[8]; o.ks+=r[6]*r[9]; o.il.add(r[2]); o.g[kayKod(r)]+=r[6]; }
  const L=[...SM].sort((a,b)=>b[1].t-a[1].t), B=L.filter(([,o])=>o.t>=DAG_ESIK), K=L.filter(([,o])=>o.t<DAG_ESIK), TT=L.reduce((a,[,o])=>a+o.t,0);
  if(S.dsec!=null&&S.dsec!=="diger"&&!SM.has(S.dsec)) S.dsec=null; if(S.dsec==="diger"&&!K.length) S.dsec=null;
  const secili=S.dsec==null?null:S.dsec==="diger"?new Set(K.map(([s])=>s)):new Set([S.dsec]);
  if(secili){ const KYf=KY.filter(r=>secili.has(r[1])), TMf=[]; for(const r of KYf){ TMf.push([0,r[4],r[3],r[6],0],[0,r[5],r[3],0,r[6]]); }
    const SF=S.dsec!=="diger"?(V.saf||[]).filter(r=>r[0]===S.dsec).map(r=>[r[1],r[2],KYf.filter(k=>k[4]===r[1]).reduce((a,k)=>a+k[6],0)]):null; harita(KYf,[],TMf,SF); }
  else harita(KY,IK,TM);
  const kk=o=>o.t?`${nf.format(o.ko/o.t)} → ${nf.format(o.ks/o.t)} km`:"";
  const sat=(key,ad,alt,v,on)=>`<button type="button" class="r dg${on?" on":""}" data-d="${key}" aria-pressed="${on}"><span>${ad}${alt?`<br><small class="muted">${alt}</small>`:""}</span><b>${v}</b></button>`;
  const ko=K.reduce((a,[,o])=>({t:a.t+o.t,ko:a.ko+o.ko,ks:a.ks+o.ks}),{t:0,ko:0,ks:0});
  $("a-il").innerHTML=`<div class="r"><b>Dağıtıcılar</b><span class="muted">${L.length} · ${ton(TT)}</span></div>`
    +sat("",`Tümü`,`${L.length} dağıtıcı`,ton(TT),S.dsec==null)
    +B.map(([s,o])=>sat(s,esc(V.sir[s]||"?"),`${o.il.size} il · ${kk(o)}${(z=>z&&z.t?` · GTS avantajı <span class="${z.a/z.t>=0?"p":"n"}">${z.a/z.t>=0?"+":"−"}${nf.format(Math.abs(z.a/z.t))}</span> TL/m³`:"")((S.gecAv||new Map()).get(s))}${o.g.D>=500||o.g.B>=500||o.g.K>=500?`<br>${[["D","Tüpraş Mersin"],["B","Batman"],["K","Kırıkkale"]].filter(([g])=>o.g[g]>=500).map(([g,a])=>`<span style="color:${KAYG[g][1]}">${a} ${ton(o.g[g])}</span>`).join(" ")}`:""}`,ton(o.t),S.dsec===s)).join("")
    +(K.length?sat("diger","Diğer",`${K.length} dağıtıcı · her biri 20 kt altı`,ton(ko.t),S.dsec==="diger"):"");
  { const GY=S.gecY||[]; if(GY.length){ const M=new Map(); for(const x of GY){ const z=M.get(x.s)||M.set(x.s,{t:0,a:0,il:new Set(),ky:new Map()}).get(x.s); z.t+=x.t; z.a+=x.t*x.g[8]; z.il.add(V.il[x.il]); if(x.g[10]) z.ky.set(x.g[10],(z.ky.get(x.g[10])||0)+x.t); }
      const top=[...M.values()].reduce((a,z)=>a+z.t,0);
      $("a-il").insertAdjacentHTML("beforeend",`<div class="r gec-bas"><b>GTS'ye geçmeyen</b><span class="muted">avantaj eşiğin altında · ${ton(top)} potansiyel</span></div>`
        +[...M].sort((a,b)=>b[1].t-a[1].t).map(([s,z])=>`<div class="r gec-yok" title="Bölgeye teslimde GTS avantajı eşiğin altında: dağıtıcı bugünkü kaynağında kalır"><span>${esc(V.sir[s]||"?")}<br><small class="muted">${[...z.il].slice(0,3).map(esc).join(", ")}${z.il.size>3?" …":""} · avantaj <span class="${z.a>=0?"":"n"}">${z.a>=0?"+":"−"}${nf.format(Math.abs(z.a/z.t))}</span> TL/m³${z.ky.size?`<br>en ucuz alternatif: ${[...z.ky].sort((a,b)=>b[1]-a[1]).map(([k])=>esc(k)).slice(0,2).join(", ")}`:""}</small></span><b>${ton(z.t)}</b></div>`).join("")); } }
  for(const b of $("a-il").querySelectorAll("button[data-d]")) b.onclick=()=>{ const d=b.dataset.d; S.dsec=d===""?null:d==="diger"?"diger":(S.dsec===+d?null:+d); dagPanel(KY,IK,TM); };
  $("a-hsub").textContent=S.dsec==null?"il rengi ve çizgi kalınlığı GTS'den ile giden ton · dağıtıcıya tıklayın":S.dsec==="diger"?`Diğer · ${K.length} küçük dağıtıcı`:`${V.sir[S.dsec]||"?"} · GTS'den illere ve hacim kaybeden terminaller`;
}

/* ---------- OPERASYON ---------- */
function operasyon(){
  // tank planı
  const TP=V.tplan, grp=[["Motorin","Antrepo",C.mot],["Benzin","Antrepo",BZ?C.ben:"#C9D2D7"],["Motorin","Milli","#7C9CCB"],["Benzin","Milli",BZ?"#7FB68F":"#C9D2D7"]], tmax=Math.max(...grp.map(([u,r])=>TP.filter(t=>t[2]===u&&t[3]===r).reduce((a,t)=>a+t[1],0)));
  $("o-tank").innerHTML=grp.map(([u,r,c])=>{ const L=TP.filter(t=>t[2]===u&&t[3]===r), s=L.reduce((a,t)=>a+t[1],0);
    return `<div class="sr"><span>${u} · ${r.toLowerCase()}${!BZ&&u==="Benzin"?'<br><small class="muted">projede kullanılmıyor</small>':""}</span><div class="bx" style="width:${(s/tmax*100).toFixed(1)}%">${L.map(t=>`<i style="flex:${t[1]} 1 0;background:${c}" title="Tank ${t[0]} · ${nf.format(t[1])} m³">${t[1]>=4000?t[0]:""}</i>`).join("")}</div><b>${nf.format(s)} m³</b></div>`; }).join("");
  $("o-tsub").textContent=`${TP.length} tank · toplam ${nf.format(TP.reduce((a,t)=>a+t[1],0))} m³ · kullanılabilir antrepo ${nf.format(V.tkap[0])} + ${nf.format(V.tkap[1])} m³, milli ${nf.format(V.tkap[2])} + ${nf.format(V.tkap[3])} m³`;
  const TK=V.tank;
  zaman($("o-antrepo"),{aria:"Antrepo doluluğu",seri:bzs([{ad:"Motorin antrepo",renk:C.mot,v:TK.map(r=>r[0]),alan:1},{ad:"Benzin antrepo",renk:C.ben,v:TK.map(r=>r[1]),alan:1}]),yatay:bzs([{v:V.tkap[0],ad:"motorin kullanılabilir "+nf.format(V.tkap[0])+" m³",renk:C.mot},{v:V.tkap[1],ad:"benzin kullanılabilir "+nf.format(V.tkap[1])+" m³",renk:C.ben}]),fmt:v=>nf.format(v/1000)+"k",sifir:1,h:215});
  zaman($("o-milli"),{aria:"Milli tank",seri:bzs([{ad:"Motorin milli",renk:C.mot,v:TK.map(r=>r[2])},{ad:"Benzin milli",renk:C.ben,v:TK.map(r=>r[3])}]),yatay:bzs([{v:V.tkap[2],ad:"motorin kullanılabilir",renk:C.mot},{v:V.tkap[3],ad:"benzin kullanılabilir",renk:C.ben}]),fmt:v=>nf.format(v/1000)+"k",sifir:1,h:165});
  // rampa: aylık satış ve tüketim
  const ay=new Map(); for(let i=0;i<ND;i++){ const d=gun(i), k=d.getUTCFullYear()*100+d.getUTCMonth(); const o=ay.get(k)||ay.set(k,{m:0,b:0,tm:0,tb:0,ad:AY[d.getUTCMonth()]+" "+String(d.getUTCFullYear()).slice(2),k:d.toISOString().slice(0,7)}).get(k); o.m+=V.gm[i][0]; o.b+=V.gb[i][0]; o.tm+=V.gm[i][5]; o.tb+=V.gb[i][5]; }
  const AL=[...ay.entries()].filter(([k])=>!YIL||String(Math.floor(k/100))===YIL).map(x=>x[1]), hm=+gir("Seçili motorin (t/yıl)"), hb=+gir("Seçili benzin (t/yıl)");
  cubuk($("o-rampa"),{aria:"Aylık satış",kat:AL.map(a=>a.ad),seri:bzs([{ad:"Motorin satışı",renk:C.mot,v:AL.map(a=>a.m)},{ad:"Benzin satışı",renk:C.ben,v:AL.map(a=>a.b)}]),cizgi:[{ad:"Tüketim (mevsim × rampa)",renk:C.gts,v:AL.map(a=>a.tm+a.tb)},{ad:"Hedef hız (ay ortalaması)",renk:C.ink3,kesik:"5 4",v:AL.map(()=>(hm+hb)/12)}],fmt:v=>nf.format(v/1000)+"k",etk:i=>i%(AL.length<=12?(W<600?2:1):(W<600?6:3))===0?AL[i].ad:"",ek:i=>{ const q=(V.mev||[]).find(x=>x[1].slice(0,7)===(AL[i].k||"")); return q?`<br>rampa ${pct(q[2])}`:""; }});
  $("o-rsub").textContent=`ton / ay · Ocak 2027 hedefin %${nf.format(gir("Ocak 2027 satış oranı (hedefin %)")*100)}'si, Ocak 2028 %100 · satış, bayi davranışı ve haftalık takvim nedeniyle tüketimden sapar`;
  // kargo takvimi (gantt)
  const gantt=()=>{ gw($("o-gantt")); const i0=PEN.i0, nn=PEN.n, H=BZ?140:84, pad={l:W<600?58:70,r:12,t:8}, xs=olcek(0,nn-1,pad.l,W-pad.r), y0=H-22; let g=ayTik(nn,{t:pad.t,y0},xs,i0);
    const ser=[["Motorin",V.km,C.mot,pad.t+6],["Benzin",V.kb,C.ben,pad.t+62]].filter(x=>BZ||x[0]==="Motorin");
    for(const [ad,L,c,yb] of ser){ g+=`<text x="${pad.l-8}" y="${yb+24}" text-anchor="end" style="fill:var(--ink);font:12px var(--f-body)">${ad}</text>`;
      L.forEach((k,j)=>{ const a=Math.max(0,tarihI(k[4])-i0), b=/^\d{4}-/.test(k[6])?Math.min(nn-1,tarihI(k[6])-i0):nn-1; if(b<0||a>nn-1) return; const ln=j%3, y=yb+ln*16;
        g+=`<rect x="${xs(a).toFixed(1)}" y="${y}" width="${Math.max(1.5,xs(b)-xs(a)).toFixed(1)}" height="12" rx="2" fill="${k[13]>=0?c:C.neg}" fill-opacity="${k[13]>=0?.75:.6}"><title>${ad} kargo ${k[0]} · ${esc(k[1])} ${ton(k[2])} · satışa hazır ${k[4]} → tükenme ${k[6]} (${k[7]} gün) · net marj ${usd(k[13])}</title></rect>`; }); }
    $("o-gantt").innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kargo takvimi">${g}</svg><div class="lg"><span><i class="k" style="background:${C.mot}"></i>motorin kargosu (satışa hazır → tükenme)</span>${BZ?`<span><i class="k" style="background:${C.ben}"></i>benzin kargosu</span>`:""}<span><i class="k" style="background:${C.neg}"></i>net marjı eksi</span></div>`; };
  gantt();
  const kt=()=>{ const L=(S.ku==="m"?V.km:V.kb).filter(k=>yilOk(k[4]));
    $("o-kargo").innerHTML=`<thead><tr><th>No</th><th class="l">Gemi</th><th>Ton</th><th class="l">Satışa hazır</th><th class="l">Tükenme</th><th>Gün</th><th>CIF $/t</th><th>Alış $/t</th><th>Tüpraş ort. $/t</th><th>Brüt marj</th><th>Hedge net</th><th>Net marj</th></tr></thead><tbody>`
      +L.map(k=>`<tr><td>${k[0]}</td><td class="l">${esc(k[1])}</td><td>${ton(k[2])}</td><td class="l">${tk(k[4])}</td><td class="l" style="white-space:nowrap">${tk(k[6])}</td><td>${k[7]}</td><td>${nf1.format(k[9])}</td><td>${nf1.format(k[10])}</td><td>${nf1.format(k[11])}</td><td class="${k[12]>=0?"p":"n"}">${usd(k[12])}</td><td class="${k[14]>=0?"p":"n"}">${usd(k[14])}</td><td class="${k[13]>=0?"p":"n"}"><b>${usd(k[13])}</b></td></tr>`).join("")+`</tbody>`;
    const n=L.length||1, ort=L.reduce((a,k)=>a+k[7],0)/n; $("o-ksub").textContent=`${YIL?YIL+" · satışa hazır olduğu yıl · ":""}motorin ${V.km.filter(k=>yilOk(k[4])).length}${BZ?`, benzin ${V.kb.filter(k=>yilOk(k[4])).length}`:""} kargo${YIL?"":" (açılış stoğu dahil)"} · ${S.ku==="m"?"motorin":"benzin"} ortalama yaşam ${nf1.format(ort)} gün · kargo 0 = 1.1.2027 açılış stoğu`; };
  for(const b of $("o-kur").querySelectorAll("button")) b.onclick=()=>{ S.ku=b.dataset.u; for(const x of $("o-kur").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); kt(); };
  kt();
  $("o-lot").closest("section").hidden=!BZ; $("o-lot").innerHTML=`<thead><tr><th class="l">Senaryo</th><th>Lot</th><th>Kaç günlük tüketim</th><th>Yıllık varış</th><th>Ort. stok</th><th>Tepe stok</th><th>Finansman / yıl</th><th>$/t</th><th>%5 şokta tepe etkisi</th></tr></thead><tbody>`
    +V.blot.map(r=>`<tr><td class="l">${r[0]==="BAZ_075"?"Baz · 0,75 Mt":"Hedef · 1,5 Mt"}</td><td><b>${ton(r[1])}</b></td><td>${nf1.format(r[2])}</td><td>${r[3]}</td><td>${ton(r[4])}</td><td>${ton(r[5])}</td><td>${usd(r[6])}</td><td>${nf2.format(r[7])}</td><td>${usd(r[8])}</td></tr>`).join("")+`</tbody>`;
}

/* ---------- EKONOMİ ---------- */
function ekonomi(){
  yasalDefter();   // kullanıcı 02.11.2026 22:11: kambiyo Ekonomi sayfasında
  const sat=[["Motorin satışı (t)",ton],...(BZ?[["Benzin satışı (t)",ton]]:[]),["Satış / hedef tonaj",pct],["Gemi varışı (adet, varış tarihine göre)",nf.format],["Brüt marj (USD)",musd,1],["Finansman (USD)",x=>musd(-x),1],["Ürün hedge net (USD)",musd,1],["Net marj (USD)",musd,2],["Vergi + beyanname maliyeti (USD)",x=>musd(-x),1],...(V.kartab?[["Diğer faaliyet giderleri (USD)",x=>musd(-x),1]]:[]),...(V.tld?[["Kambiyo kârı / zararı",musd,1],["Kur hedge (forward) sonucu",musd,1],["Tahsilat kur farkı geri eklenir",musd,1]]:[]),["Toplam (USD)",musd,2],["Toplam (USD/t)",nf2.format],["Tepe teminat bakiyesi (TL)",x=>nf1.format(x/1e9)+" mlr TL"]];
  if(V.tld&&V.tld.tl){ const L=V.kartab.rows, b=re=>L.find(r=>re.test(String(r[0]).trim()))||[null,0,0,0], ng=r=>[r[0],-r[1],-r[2],-r[3]], mTL=x=>(x<0?"−":"")+nf1.format(Math.abs(x)/1e6)+" M TL";
    const S2=[["Motorin satışı",b(/^Gerçekleşen satış – bayi alımı/),ton],["Satış (m³)",b(/^Gerçekleşen satış \(m³/),x=>nf.format(x/1e3)+" bin m³"],["Satış / hedef tonaj",oz("Satış / hedef tonaj",1),pct],["Gemi varışı (adet, varış tarihine göre)",oz("Gemi varışı (adet, varış tarihine göre)",1),nf.format],
      ["Net satışlar",b(/^NET SATIŞLAR \(TL/),mTL],["Satılan malın maliyeti (−)",ng(b(/^SATILAN MALIN MALİYETİ \(TL/)),mTL],["Brüt kâr",b(/^BRÜT KÂR \(TL/),mTL,2],["Brüt kâr ($, beyanname kuru)",b(/^BRÜT KÂR \(USD/),musd,2],
      ["Ürün hedge",b(/^ÜRÜN HEDGE SONUCU/),musd,1],["Faaliyet giderleri (−) – finansman, faiz, elleçleme, fire dahil",ng(b(/^FAALİYET GİDERLERİ/)),musd,1],["Kambiyo kârı / zararı",b(/^Kambiyo kârı/),musd,1],["Kur hedge (forward) sonucu",b(/^Kur hedge – forward|^Kur hedge sonucu/),musd,1],
      ["Net kâr",b(/^NET KÂR/),musd,2],["Net kâr (USD/t)",b(/^Net kâr \(USD\/t/),nf2.format],["Tepe teminat bakiyesi (TL)",oz("Tepe teminat bakiyesi (TL)",1),x=>nf1.format(x/1e9)+" mlr TL"]];
    $("e-yil").classList.toggle("kilit",!!KILIT); { const z=$("e-ozsec"); if(z) z.hidden=!!KILIT; } $("e-yil").classList.toggle("y27",YIL==="2027"&&!KILIT); $("e-yil").classList.toggle("y28",YIL==="2028");
    $("e-yil").innerHTML=`<thead><tr><th class="l">Kalem</th><th>2027</th><th>2028</th><th>Toplam</th></tr></thead><tbody>`+S2.map(([l,r,f,t])=>{ const cl=v=>t&&typeof v==="number"?(v>=0?"p":"n"):""; return `<tr${t===2?' class="top"':""}><td class="l">${esc(l)}</td>${[1,2,3].map(j=>`<td class="${cl(r[j])}">${t===2?"<b>":""}${typeof r[j]==="number"?f(r[j]):"–"}${t===2?"</b>":""}</td>`).join("")}</tr>`; }).join("")+`</tbody>`;
  } else {
  $("e-yil").classList.toggle("kilit",!!KILIT); { const z=$("e-ozsec"); if(z) z.hidden=!!KILIT; } $("e-yil").classList.toggle("y27",YIL==="2027"&&!KILIT); $("e-yil").classList.toggle("y28",YIL==="2028");
  $("e-yil").innerHTML=`<thead><tr><th class="l">Kalem</th><th>2027</th><th>2028</th><th>Toplam</th></tr></thead><tbody>`+sat.map(([l,f,t])=>{ const fg=l.startsWith("Diğer faaliyet")?(V.kartab.rows.find(x=>/Ozet'e eklenen/.test(x[0]))||[l,0,0,0]):null, kb=V.tld&&(x=>x?[l,x[1],x[2],x[3]]:null)(l==="Kambiyo kârı / zararı"?V.tld.kmb:l==="Kur hedge (forward) sonucu"?V.tld.hdg:l==="Tahsilat kur farkı geri eklenir"?V.tld.tah:null), r=kb||fg||oz(l,1), neg=l.startsWith("Finansman")||l.startsWith("Vergi")||!!fg; const cl=v=>t?((neg?-v:v)>=0?"p":"n"):""; return `<tr${t===2?' class="top"':""}><td class="l">${esc((SIRKET&&l==="Toplam (USD)"?(V.kartab?"Net kâr (USD)":"Şirket sonucu (USD)"):SIRKET&&l==="Toplam (USD/t)"?(V.kartab?"Net kâr (USD/t)":"Şirket sonucu (USD/t)"):SIRKET&&l.startsWith("Bölgesel")?"Bölgesel navlun avantajı – bayiye kalır, bilgi (USD)":l).replace(" (USD)","").replace("Finansman","Finansman (−)").replace("Vergi + beyanname maliyeti","İthalat vergi avantajı"))}</td>${[1,2,3].map(j=>`<td class="${cl(r[j])}">${t===2?"<b>":""}${f(r[j])}${t===2?"</b>":""}</td>`).join("")}</tr>`; }).join("")+`</tbody>`; }
  // aylık net marj
  const ay=new Map(); const ek=(L,u)=>{ for(const k of L){ const d=new Date(k[4]+"T00:00:00Z"), key=d.getUTCFullYear()*100+d.getUTCMonth(); const o=ay.get(key)||ay.set(key,{ad:AY[d.getUTCMonth()]+" "+String(d.getUTCFullYear()).slice(2),m:0,b:0,n:0}).get(key); o[u]+=k[13]; o.n++; } };
  ek(V.km,"m"); ek(V.kb,"b"); const AL=[...ay].filter(([k])=>!YIL||String(Math.floor(k/100))===YIL).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  cubuk($("e-ay"),{aria:"Aylık net marj",kat:AL.map(a=>a.ad),seri:bzs([{ad:"Motorin",renk:C.mot,v:AL.map(a=>a.m)},{ad:"Benzin",renk:C.ben,v:AL.map(a=>a.b)}]),fmt:v=>nf1.format(v/1e6),etk:i=>i%(AL.length<=12?(W<600?2:1):(W<600?6:3))===0?AL[i].ad:"",ek:i=>`<br>${AL[i].n} kargo · toplam <b>${usd(AL[i].m+AL[i].b)}</b>`});
  // fiyat
  const F=V.fiy, fc=()=>{ const m=S.fu==="m";
    zaman($("e-fiyat"),{aria:"Alış ve satış fiyatı",seri:[{ad:"CIF Med (alış bazı)",renk:C.ink3,v:F.map(r=>m?r[0]:r[1])},{ad:"Tüpraş vergisiz (satış)",renk:m?C.mot:C.ben,v:F.map(r=>m?r[3]:r[4]),kalin:2}],fmt:nf.format,h:195});
    zaman($("e-prim"),{aria:"Tüpraş primi",seri:[{ad:"Tüpraş − CIF Med ($/t)",renk:C.gts,v:F.map(r=>m?r[3]-r[0]:r[4]-r[1]),alan:1}],fmt:nf.format,sifir:1,h:135}); };
  for(const b of $("e-fu").querySelectorAll("button")) b.onclick=()=>{ S.fu=b.dataset.u; for(const x of $("e-fu").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); fc(); };
  fc();
  zaman($("e-tem"),{aria:"Teminat bakiyesi",seri:[{ad:"ÖTV teminat bakiyesi",renk:C.kur,v:V.vn.map(r=>r[0]),alan:1},{ad:"Vergi nakit işletme sermayesi",renk:C.gts,v:V.vn.map(r=>r[1])}],fmt:v=>nf.format(v),sifir:1,h:180});
  $("e-oz").innerHTML=`<thead><tr><th class="l">Gösterge</th><th>Motorin</th>${BZ?"<th>Benzin</th>":""}<th>Toplam</th><th class="l">Not</th></tr></thead><tbody>`+OZ.filter(r=>r[1]!=="Motorin"&&(BZ||!/^Benzin/.test(r[0]))).map(r=>{ const b=r[1]==null&&r[2]==null&&r[3]==null; if(b) return `<tr class="ara"><td colspan="${BZ?5:4}">${esc(r[0])}</td></tr>`; const f=v=>v==null?"":typeof v==="number"?(Math.abs(v)>=1000||Number.isInteger(v)?nf.format(v):nf2.format(v)):esc(v); return `<tr><td class="l">${esc(r[0])}</td><td>${f(r[1])}</td>${BZ?`<td>${f(r[2])}</td>`:""}<td><b>${f(r[3])}</b></td><td class="l muted" style="white-space:normal;min-width:180px">${esc(r[4]||"")}</td></tr>`; }).join("")+`</tbody>`;
}

/* ---------- HEDGE: emtia (ICE Gasoil) ve kur (TL forward) ayrıntısı (kullanıcı 01.11.2026 18:37) ---------- */
// kargo alanları: [19] ürün hedge brüt, [20] işlem maliyeti, [21] teminat finansmanı, [14] ürün hedge net, [23] fiyatlama günü, [24] kilit fiyatı,
// [25] satış dönemi CIF ort., [26] hedge oranı, [27] kur varış, [28] kur tahsilat ort., [29] kur forward, [30] kur hedge etkisi, [31] satış TL/t, [22] tahsilat kur farkı (hedgesiz)
const HY=(k)=>k.length>=32;
function hedgeAyar(){
  const el=$("h-ayar"), H=V.hgir||[]; if(!H.length){ el.innerHTML=`<p class="not">Bu modelde hedge ayarları bulunamadı.</p>`; return; }
  const yaz=typeof require==="function"&&V.girdiYolu&&window.gts, G=V.girdi||{}, KS=H.map(r=>r[1]), nG=KS.filter(k=>k in G).length;
  const yuz=l=>/oranı|marjı/.test(l), ad=l=>l.replace(/ \(USD\/t;.*\)$/," (USD/t)").replace(" (ICE Gasoil ile çapraz)"," (ICE Gasoil ile çapraz)");
  const grp=[["Emtia (ürün) hedge",["Ürün hedge","Motorin ürün hedge oranı",...(BZ?["Benzin ürün hedge oranı (ICE Gasoil ile çapraz)"]:[]),"ICE Gasoil işlem maliyeti (USD/t; borsa + takas + komisyon + kayma, gidiş-dönüş)","Teminat (initial margin) oranı"]],["Kur hedge (TL forward)",["Kur hedge","Kur hedge oranı","Forward banka marjı"]]];
  let h="";
  for(const [g,L] of grp){ h+=`<div class="tic-g">${g}</div>`;
    for(const l of L){ const r=H.find(x=>x[0]===l); if(!r) continue; const id="hg-"+r[1].replace(/\W/g,""), deg=r[3]!=null&&r[3]!==r[2];
      const inp=typeof r[2]==="string"?`<select id="${id}" data-h="${r[1]}" data-d="${esc(r[3]??"")}" ${yaz?"":"disabled"}>${["Açık","Kapalı"].map(o=>`<option${o===r[2]?" selected":""}>${o}</option>`).join("")}</select>`
        :`<input id="${id}" type="text" inputmode="decimal" data-h="${r[1]}" data-y="${yuz(l)?1:0}" data-d="${r[3]??""}" value="${String(yuz(l)?+(r[2]*100).toFixed(4):r[2]).replace(".",",")}" ${yaz?"":"disabled"}><em>${yuz(l)?"%":"$/t"}</em>`;
      h+=`<div class="kt tic-k${deg?" deg":""}"><label for="${id}">${esc(ad(l))}</label><div class="tic-i">${inp}</div><small>${deg?`<b>model varsayılanı ${typeof r[3]==="number"&&yuz(l)?nf.format(r[3]*100)+" %":esc(String(r[3]).replace(".",","))}</b>`:""}</small></div>`; } }
  el.innerHTML=`<div class="tic">${h}</div><div class="tic-a">${yaz?`<button type="button" class="ana" id="hg-hesap" disabled>Modeli bu hedge ayarlarıyla hesapla</button>${nG?`<button type="button" class="btn" id="hg-sifir">Hedge ayarlarını varsayılana döndür</button>`:""}<span class="chip ${nG?"eski":"ok"}">${nG?`Sizin hedge ayarlarınız (${nG})`:"Model varsayılanları"}</span><span class="not" id="hg-d"></span>`:`<span class="not">Hedge ayarlarını masaüstü uygulamasında değiştirebilirsiniz; model yeniden hesaplanır.</span>`}</div>`;
  if(!yaz) return;
  const I=[...el.querySelectorAll("[data-h]")], btn=$("hg-hesap"), d=$("hg-d");
  const deger=i=>{ if(i.tagName==="SELECT") return i.value; const n=Number(i.value.trim().replace("−","-").replace(",",".")); return i.dataset.y==="1"?n/100:n; };
  const ilk=new Map(I.map(i=>[i,i.tagName==="SELECT"?i.value:i.value]));
  const kontrol=()=>{ let deg=false, hata=false; for(const i of I){ if(i.tagName!=="SELECT"){ const ok=isFinite(deger(i)); i.classList.toggle("hata",!ok); if(!ok) hata=true; } if(i.value!==ilk.get(i)) deg=true; } btn.disabled=hata||!deg; d.textContent=hata?"Geçerli bir sayı girin.":deg?"Değişiklikler hesaplanmadı.":""; };
  for(const i of I) i.addEventListener(i.tagName==="SELECT"?"change":"input",kontrol);
  btn.onclick=()=>{ const o={}; for(const i of I){ const v=deger(i), dv=i.dataset.d; const esit=typeof v==="string"?v===dv:(dv!==""&&Math.abs(v-Number(dv))<1e-12); if(!esit) o[i.dataset.h]=v; }
    o["GTS!RiskHesapla"]=true; try{ girdiYaz(KS,o); }catch(e){ d.textContent="Kaydedilemedi: "+e.message; return; } btn.disabled=true; d.textContent="Hesaplanıyor… (Risk tabloları dahil, yaklaşık 1 dk)"; window.gts.yenile(); };
  const sf=$("hg-sifir"); if(sf) sf.onclick=()=>{ try{ girdiYaz(KS,{"GTS!RiskHesapla":true}); }catch(e){ d.textContent=e.message; return; } window.gts.yenile(); };
}
function hedge(){
  hedgeAyar();
  const A=[...V.km.filter(k=>HY(k)&&yilOk(k[4])).map(k=>["Motorin",k]),...V.kb.filter(k=>HY(k)&&yilOk(k[4])).map(k=>["Benzin",k])];
  if(!A.length){ $("h-ek").innerHTML=`<p class="not">Bu paketteki model hedge ayrıntısı vermiyor.</p>`; return; }
  const sm=(L,f)=>L.reduce((a,x)=>a+f(x[1],x[0]),0), kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  const hg=k=>(V.hgir||[]).find(x=>x[0]===k), urun=hg("Ürün hedge"), kur=hg("Kur hedge"), kuro=hg("Kur hedge oranı");
  /* emtia */
  const hb=sm(A,k=>k[19]), hi=sm(A,k=>k[20]), ht=sm(A,k=>k[21]), hn=sm(A,k=>k[14]), tT=sm(A,k=>k[2]), tH=sm(A,k=>k[2]*(k[26]||0));
  const HM=A.filter(([u,k])=>k[26]>0), wk=HM.reduce((a,[,k])=>a+k[2]*k[26],0)||1, kil=HM.reduce((a,[,k])=>a+k[24]*k[2]*k[26],0)/wk, pen=HM.reduce((a,[,k])=>a+k[25]*k[2]*k[26],0)/wk;
  $("h-ek").innerHTML=kt("Hedge sonucu (net)",usd(hn),`brüt ${usd(hb)} − işlem ${usd(hi)} − teminat finansmanı ${usd(ht)}`,hn<0?"neg":"pos")
    +kt("Hedge edilen hacim",ton(tH),`toplam kargo ${ton(tT)} · %${nf.format(tT?tH/tT*100:0)} · ürün hedge ${urun?esc(urun[2]):"–"}`)
    +kt("Ortalama kilit fiyatı",nf1.format(kil)+" $/t",`hedge edilen kargolar, ton ağırlıklı · satış dönemi CIF ort. ${nf1.format(pen)} $/t`)
    +kt("Ton başına",nf1.format(tH?hn/tH:0)+" $/t",`hedge edilen ton başına net · kilit − satış dönemi ${nf1.format(kil-pen)} $/t`);
  // aylık hedge sonucu
  const ay=new Map(); for(const [u,k] of A){ const d=new Date(k[4]+"T00:00:00Z"), key=d.getUTCFullYear()*100+d.getUTCMonth(); const o=ay.get(key)||ay.set(key,{ad:AY[d.getUTCMonth()]+" "+String(d.getUTCFullYear()).slice(2),m:0,b:0,c:0}).get(key); if(u==="Motorin") o.m+=k[19]; else o.b+=k[19]; o.c-=k[20]+k[21]; }
  const AL=[...ay].sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  cubuk($("h-eay"),{aria:"Aylık hedge sonucu",kat:AL.map(a=>a.ad),seri:bzs([{ad:"Motorin hedge (brüt)",renk:C.mot,v:AL.map(a=>a.m)},{ad:"Benzin çapraz hedge (brüt)",renk:C.ben,v:AL.map(a=>a.b)},{ad:"İşlem + teminat maliyeti",renk:C.ink3,v:AL.map(a=>a.c)}]),fmt:v=>nf1.format(v/1e6),etk:i=>i%(AL.length<=12?(W<600?2:1):(W<600?6:3))===0?AL[i].ad:"",h:165});
  // vadeli eğri ile temsili yol
  const vm=new Map((V.vad||[]).map(r=>[r[0].slice(0,7),r])), gk=i=>gun(i).toISOString().slice(0,7);
  zaman($("h-egri"),{aria:"Vadeli eğri ve temsili yol",seri:[{ad:"CIF Med motorin – temsili fiyat yolu",renk:C.ink3,v:V.fiy.map(r=>r[0])},{ad:"Motorin vadeli eğrisi (ICE LSGO + fark, aylık)",renk:C.gts,v:V.gm.map((_,i)=>{ const r=vm.get(gk(i)); return r?r[2]:null; }),kalin:2.2}],fmt:nf.format,h:180});
  // kargo tablosu (emtia)
  const BZK=A.some(([,k])=>k.length>34&&k[34]!=null);   // kullanıcı 04.11.2026 10:27: kargo tablosunda baz etkisi (model Kargolar 'Baz etkisi – ürün hedge içinde')
  const et=()=>{ const L=A.filter(([u])=>S.hu==="b"?u==="Benzin":u==="Motorin"), N=S.hhep?L.length:20;
    $("h-etab").innerHTML=`<thead><tr><th>No</th><th class="l">Fiyatlama</th><th class="l">Satışa hazır</th><th>Ton</th><th>Oran</th><th title="Fiyatlama dönemi: COD sonrası N geçerli kotasyonun ortalaması">CIF fiyatlama ort. $/t</th><th>Kilit $/t</th><th>Satış dönemi CIF $/t</th><th>Fark $/t</th><th>Brüt</th>${BZK?`<th title="CIF Med − ICE LSGO baz sapması; brüt hedge sonucunun içinde, + = kazanç">içinde baz etkisi</th><th>Baz $/t</th>`:""}<th>Maliyet</th><th>Net</th></tr></thead><tbody>`
      +L.slice(0,N).map(([u,k])=>{ const f=k[24]-k[25]; return `<tr><td>${k[0]}</td><td class="l">${tk(k[23])}${k[35]&&k[35]!==k[23]?" – "+tk(k[35]):""}</td><td class="l">${tk(k[4])}</td><td>${ton(k[2])}</td><td>%${nf.format((k[26]||0)*100)}</td><td>${nf1.format(k[9])}</td><td>${nf1.format(k[24])}</td><td>${nf1.format(k[25])}</td><td class="${f>=0?"p":"n"}">${(f<0?"−":"+")+nf1.format(Math.abs(f))}</td><td class="${k[19]>=0?"p":"n"}">${usd(k[19])}</td>${BZK?(b=>{ const ht=k[2]*(k[26]||0); return `<td class="${b==null||!b?"muted":b>0?"p":"n"}">${b==null?"–":usd(b)}</td><td class="${!b?"muted":b>0?"p":"n"}">${b&&ht?(b<0?"−":"+")+nf1.format(Math.abs(b/ht)):"–"}</td>`; })(k[34]):""}<td class="n">${usd(-(k[20]+k[21]))}</td><td class="${k[14]>=0?"p":"n"}"><b>${usd(k[14])}</b></td></tr>`; }).join("")
      +(L.length>20?`<tr><td colspan="${BZK?14:12}" class="empty"><button type="button" class="btn" id="h-hep">${S.hhep?"İlk 20 kargo":`Tümü (${L.length})`}</button></td></tr>`:"")+`</tbody>`;
    const b=$("h-hep"); if(b) b.onclick=()=>{ S.hhep=!S.hhep; et(); }; };
  for(const b of $("h-eu").querySelectorAll("button")) b.onclick=()=>{ S.hu=b.dataset.u; for(const x of $("h-eu").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); et(); };
  et();
  /* kur */
  const ke=sm(A,k=>k[30]), kf=sm(A,k=>k[22]), acik=kur&&kur[2]==="Açık";
  const yak=sm(A,k=>{ const tl=(k[31]||0)*k[2]; return k[29]&&k[28]?tl*(1/k[29]-1/k[28])*(kuro?kuro[2]:1):0; });
  const fw=A.reduce((a,[,k])=>a+(k[29]-k[28])*k[2],0)/(tT||1);
  $("h-kk").innerHTML=kt("Kur hedge",acik?"Açık":"Kapalı",`oran %${nf.format((kuro?kuro[2]:0)*100)} · satış günü TL tahsilatı tahsil gününe forward ile sabitlenir`,acik?"":"")
    +kt("Kur hedge etkisi (model)",usd(ke),acik?"satış gelirine dahil":"kur hedge kapalı",ke<0?"neg":ke>0?"pos":"")
    +kt("TL tahsilatın USD karşılığı (vade etkisi)",usd(kf),`hedgesiz; satış günü kuruna göre · net marjın içinde`,kf<0?"neg":"pos")
    +kt(acik?"Forward − tahsilat kuru":"Açık olsaydı (yaklaşık)",acik?nf2.format(fw)+" TL":usd(yak),acik?"ton ağırlıklı ortalama":`forward ort. tahsilat kurundan ${nf2.format(fw)} TL yüksek · kesin sonuç için kur hedge'i açıp hesaplayın`,(!acik&&yak<0)?"neg":"");
  zaman($("h-kegri"),{aria:"USD/TRY",seri:[{ad:"USD/TRY – temsili yol",renk:C.kur,v:V.fiy.map(r=>r[2])},{ad:"USD/TRY forward (faiz paritesi, aylık)",renk:C.gts,v:V.gm.map((_,i)=>{ const r=vm.get(gk(i)); return r?r[4]:null; }),kalin:2.2}],fmt:v=>nf1.format(v),h:170});
  const ktb=()=>{ const L=A.filter(([u])=>S.hku==="b"?u==="Benzin":u==="Motorin"), N=S.hkhep?L.length:20;
    $("h-ktab").innerHTML=`<thead><tr><th>No</th><th class="l">Satışa hazır</th><th>Ton</th><th>Satış TL/t</th><th>Kur varış</th><th>Tahsilat ort.</th><th>Forward</th><th>Forward − tahsilat</th><th>Kur farkı (hedgesiz)</th><th>Kur hedge etkisi</th></tr></thead><tbody>`
      +L.slice(0,N).map(([u,k])=>{ const f=k[29]-k[28]; return `<tr><td>${k[0]}</td><td class="l">${tk(k[4])}</td><td>${ton(k[2])}</td><td>${nf.format(k[31]||0)}</td><td>${nf2.format(k[27])}</td><td>${nf2.format(k[28])}</td><td>${nf2.format(k[29])}</td><td class="muted">${(f<0?"−":"+")+nf2.format(Math.abs(f))}</td><td class="${k[22]>=0?"p":"n"}">${usd(k[22])}</td><td class="${k[30]>0?"p":k[30]<0?"n":""}">${k[30]?usd(k[30]):"–"}</td></tr>`; }).join("")
      +(L.length>20?`<tr><td colspan="10" class="empty"><button type="button" class="btn" id="h-khep">${S.hkhep?"İlk 20 kargo":`Tümü (${L.length})`}</button></td></tr>`:"")+`</tbody>`;
    const b=$("h-khep"); if(b) b.onclick=()=>{ S.hkhep=!S.hkhep; ktb(); }; };
  for(const b of $("h-ku").querySelectorAll("button")) b.onclick=()=>{ S.hku=b.dataset.u; for(const x of $("h-ku").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); ktb(); };
  ktb();
  $("h-esub").textContent=`${YIL||"2027–2028"} · kargonun satışa hazır olduğu yıl · ICE Gasoil futures${BZ?" (benzin için çapraz hedge)":""}`;
  $("h-ksub").textContent=`${YIL||"2027–2028"} · USD/TRY forward, TL faizi ve USD faizinden (faiz paritesi) + banka marjı`;
}

/* ---------- RİSK: iki yıllık ızgara ve Monte Carlo ---------- */
function riskDurum(){ // Risk tablolarının kaynağı: PDM çalıştırması ya da kullanıcının girdileriyle uygulama içi yeniden hesap
  const el=$("r-hdurum"); if(!el) return; const RH=V.riskHesap, yaz=typeof require==="function"&&V.girdiYolu&&window.gts, nG=Object.keys(V.girdi||{}).filter(k=>k!=="GTS!RiskHesapla").length;
  const zm=t=>{ try{ return new Date(t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }catch{ return ""; } };
  let h=RH?`<span class="chip ok">Sizin girdilerinizle hesaplandı · ${zm(RH.zaman)}</span> <span class="not">Parti, liman, vade ve hedge tablosu ile tarihsel test, Ticari koşullardaki girdilerinizle (satış hedefi dahil) ve TL defter net kâr tanımıyla uygulama içinde yeniden hesaplandı; Genel bakışta "hesapla" her seferinde bunları da yeniler. Monte Carlo tablosu PDM çalıştırmasıdır.</span>`
    :`<span class="chip eski">PDM çalıştırması · varsayılan girdiler, satış hedefi %100, önceki (USD bazlı) net kâr tanımı</span> <span class="not">${nG?(V.riskEski?"Girdileriniz son hesaptan sonra değişti. ":"Girdileriniz bu tablolara yansımadı. "):""}${yaz?"Düğmeyle tablolar sizin girdilerinizle yeniden hesaplanır (yaklaşık 1–2 dakika).":"Masaüstü uygulamasında sizin girdilerinizle yeniden hesaplanabilir."}</span>`;
  if(yaz&&!RH) h+=` <button type="button" class="btn" id="r-hbtn">Risk tablolarını girdilerimle hesapla</button>`;
  { const n=$("r-iznot"); if(n&&RH) n.textContent="Uygulama içi hesap: Ticari koşullardaki tüm girdileriniz sabit, yalnız tablodaki dört koşul değişiyor; parti 2027 ve 2028 için aynı. Net kâr Karlılık tablosundaki tanımla: faaliyet giderleri, kambiyo kârı/zararı ve kur hedge dahil (TL defter)."; }
  el.innerHTML=h; const b=$("r-hbtn"); if(b) b.onclick=()=>{ try{ girdiYaz(["GTS!RiskHesapla"],{"GTS!RiskHesapla":true}); }catch(e){ el.insertAdjacentHTML("beforeend",`<span class="not">Kaydedilemedi: ${esc(e.message)}</span>`); return; } b.disabled=true; b.textContent="Hesaplanıyor…"; window.gts.yenile(); };
}
function iki(){
  riskDurum();
  const IZ=V.riskHesap&&V.riskHesap.izg&&V.riskHesap.izg.length?V.riskHesap.izg:(V.izg||[]), M2=V.mc2||[], mm=v=>(v<0?"−":v>0?"+":"")+nf1.format(Math.abs(v)/1e6), cl=v=>v<0?"n":"p";
  $("r-iki").hidden=!IZ.length&&!M2.length; if(!IZ.length&&!M2.length) return;
  const vs=+gir("Satış vadesi (gün)")||17;
  const R=[...IZ].sort((a,b)=>(a[1]===b[1]?0:a[1]==="Açık"?-1:1)||a[4]-b[4]||a[2]-b[2]||a[3]-b[3]);
  const K7=YIL==="2027", K8=YIL==="2028", tt=r=>K7?r[5]:K8?r[6]:r[5]+r[6], mx=Math.max(1,...R.map(r=>Math.abs(tt(r))));
  $("r-izg").innerHTML=`<thead><tr><th class="l">Ürün hedge</th><th>Vade</th><th>Parti</th><th>İkinci liman</th>${YIL?`<th>Net kâr ${YIL}<br><span>M $</span></th>`:`<th>Net kâr 2027<br><span>M $</span></th><th>2028</th><th>İki yıl</th>`}<th class="l bar-h">${YIL||"iki yıl"}</th></tr></thead><tbody>`+R.map(r=>{ const t=tt(r), v=r[2]===40&&r[3]===60000&&r[4]===17&&r[1]==="Açık";
    return `<tr class="${v?"varsay":""}"><td class="l">${esc(r[1])}${v?' <span class="chip">varsayılan</span>':""}</td><td>${r[4]?nf.format(r[4])+" gün":"peşin"}</td><td>${nf.format(r[2])} kt</td><td>${r[3]?nf.format(r[3])+" $":"yok"}</td>${YIL?`<td class="${cl(t)}"><b>${mm(t)}</b></td>`:`<td class="${cl(r[5])}">${mm(r[5])}</td><td class="${cl(r[6])}">${mm(r[6])}</td><td class="${cl(t)}"><b>${mm(t)}</b></td>`}<td class="l bar"><i class="${t<0?"n":"p"}" style="width:${(Math.abs(t)/mx*100).toFixed(1)}%"></i></td></tr>`; }).join("")+`</tbody>`;
  const SO={Baz:0,"Ayı":1,"Boğa":2}, VO=c=>/^ürün hedge açık/.test(c)?0:/hedge kapalı/.test(c)?1:2, M=[...M2].sort((a,b)=>(SO[a[0]]??9)-(SO[b[0]]??9)||VO(a[1])-VO(b[1])||b[2]-a[2]);
  const cfg=c=>{ const m=/^(\d+)kt_L(\d+)k_V(\d+)/.exec(c); return m?`${m[1]} kt · ikinci liman ${+m[2]?m[2]+" bin $":"yok"} · ${+m[3]?"vade "+m[3]+" gün":"peşin"}`:c; };
  const hc=o=>`<td class="${cl(o[2])}">${mm(o[2])}</td><td class="muted">${mm(o[1])} … ${mm(o[3])}</td><td class="${o[4]>=.5?"n":""}"><b>%${nf.format(o[4]*100)}</b></td>`;
  if(V.mc2Tanim==="tld"){ const h=$("r-mc2h"), n=$("r-mc2not"); if(h) h.innerHTML=`Monte Carlo · TL defter net kâr <span class="chip ok">PDM çalıştırması · Baz / Ayı / Boğa × 100 yol${M2.some(r=>/hedge kapalı/.test(r[1]))?" · 3 varyant":""}</span>`;
    if(n) n.textContent=M2.some(r=>/hedge kapalı/.test(r[1]))?"PDM, 10.11.2026 (paket 111): her yol Excel modelinin paket 110 varsayılanlarıyla: alım CIF Med −10 $/t, COD + 30 gün, fiyatlama COD sonrası 20 kotasyon, 30 kt MR kargo, satış primi rakip maliyeti (rakip primi −10 $/t) + navlun avantajının %30'u, dağıtıcı geçiş kuralı (eşik 150 TL/m³; rakip farkları fiyat seviyesiyle ölçekli), kur hedge kapalı. Üç varyant aynı yollarla: ürün hedge açık (%100 ICE LSGO), ürün hedge kapalı, alım primi −15 $/t (yalnız Baz). Hedge açıkken P10–P90 aralığı yaklaşık %40 daralıyor. Kur stokastik; baz riski her yolda örneklenir. Uygulama içinde sizin girdilerinizle yeniden hesaplanamaz. Zarar olasılığı = net kârın sıfırın altında kaldığı yolların oranı.":"PDM, 09.11.2026 (paket 104): her yol Excel modelinin o günkü varsayılanlarıyla yeniden hesaplandı. Uygulama içinde sizin girdilerinizle yeniden hesaplanamaz. Zarar olasılığı = net kârın sıfırın altında kaldığı yolların oranı."; }
  $("r-mc2").innerHTML=`<thead><tr><th class="l">Senaryo</th><th class="l">Koşul</th><th>Yol</th>${(YIL?[YIL]:["2027","2028","İki yıl"]).map((y,k)=>`<th>${y} medyan${k?"":"<br><span>M $</span>"}</th><th>P10 … P90</th><th>Zarar olas.</th>`).join("")}</tr></thead><tbody>`
    +M.map(r=>`<tr><td class="l"><b>${esc(r[0])}</b></td><td class="l">${esc(cfg(r[1]))}</td><td>${r[2]}</td>${K7?hc(r[3]):K8?hc(r[4]):hc(r[3])+hc(r[4])+hc(r[5])}</tr>`).join("")+`</tbody>`;
  $("r-izsub").textContent=`${V.riskHesap&&V.riskHesap.izg&&V.riskHesap.izg.length?"sizin girdileriniz":"Makul fiyat yolu, PDM"} · net kâr${YIL?" "+YIL:""} · ${IZ.length} çalıştırma`; const h2=$("r-iki").querySelector("h2"); if(h2) h2.textContent=YIL?`${YIL} sonuçları · parti, liman, vade ve hedge`:"İki yıllık sonuçlar · parti, liman, vade ve hedge";
  { const f=document.querySelector('[data-v="risk"] .head .sub'); if(f&&YIL) f.textContent=`${YIL} · kullanıcı fiyat modelleri · P10–P90 bandı, P50 ve temsili yol`; }
}

/* ---------- RİSK: tarihsel test ve hedge kalibrasyonu ---------- */
function tarihsel(){
  const H=V.hkal, el=$("r-tar"); el.hidden=!H; if(!H) return;
  const bz=l=>{ const r=H.baz.find(x=>x[0].startsWith(l)); return r?r[1]:null; }, u20=H.ufuk.find(r=>r[0]===20)||H.ufuk[0];
  const kt=(l,v,s)=>`<div class="kt"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  $("r-tkpi").innerHTML=(u20?kt("Hedge etkinliği",`%${nf.format(u20[6]*100)}`,`${u20[0]} iş günü · 1:1 ICE ile CIF Med fiyat oynaklığının karşılanan payı`)+kt("Beta (CIF / ICE)",nf2.format(u20[1]),`R² ${nf2.format(u20[2])} · ${u20[0]} iş günü`):"")
    +(bz("CIF Med − ICE")!=null?kt("Baz riski",`${nf1.format(bz("CIF Med − ICE"))} ± ${nf1.format(bz("Baz standart")||0)} $/t`,`CIF Med − ICE front ortalama ± std · aralık ${esc(String(bz("Baz en düşük")||"").replace(/\./g,",").replace(/-/g,"−").replace(" / "," … "))}`):"")
    +(bz("ICE devir")!=null?kt("ICE devir maliyeti",`${esc(String(bz("ICE devir")).split("/")[1]||"").trim().replace(".",",").replace("-","−")} $/t`,`${esc(String(bz("ICE devir")).split("/")[0]).trim()} devir ortalaması · geriye doğru eğri`):"");
  const B=V.riskHesap&&V.riskHesap.bt&&V.riskHesap.bt.length?V.riskHesap.bt:H.bt, Y1=YIL==="2027", Y2=YIL==="2028", bt=r=>Y1?r[1]:Y2?r[2]:r[3], mx=Math.max(1,...B.map(r=>Math.abs(bt(r)))), mm=v=>(v<0?"−":v>0?"+":"")+nf1.format(Math.abs(v)), cl=v=>v<0?"n":"p";
  $("r-tbt").innerHTML=`<thead><tr><th class="l">Hedge kurgusu</th>${Y1?`<th>Yıl 1 · 2027 karşılığı<br><span>≈2024 · M $</span></th>`:Y2?`<th>Yıl 2 · 2028 karşılığı<br><span>≈2025 · M $</span></th>`:`<th>Yıl 1<br><span>≈2024</span></th><th>Yıl 2<br><span>≈2025</span></th><th>İki yıl<br><span>M $</span></th>`}<th class="l bar-h">${Y1?"yıl 1":Y2?"yıl 2":"iki yıl"}</th></tr></thead><tbody>`
    +B.map(r=>`<tr><td class="l">${esc(r[0])}</td>${Y1||Y2?`<td class="${cl(bt(r))}"><b>${mm(bt(r))}</b></td>`:`<td class="${cl(r[1])}">${mm(r[1])}</td><td class="${cl(r[2])}">${mm(r[2])}</td><td class="${cl(r[3])}"><b>${mm(r[3])}</b></td>`}<td class="l bar"><i class="${bt(r)<0?"n":"p"}" style="width:${(Math.abs(bt(r))/mx*100).toFixed(1)}%"></i></td></tr>`).join("")+`</tbody>`;
  $("r-tuf").innerHTML=`<thead><tr><th>Ufuk<br><span>iş günü</span></th><th>Beta</th><th>R²</th><th>Oynaklık hedgesiz<br><span>$/t std</span></th><th>1:1 hedge ile</th><th>Etkinlik</th><th>Ort. CIF değişimi</th><th>Ort. ICE (devir ayarlı)</th></tr></thead><tbody>`
    +H.ufuk.map(r=>`<tr${r[0]===20?' class="varsay"':""}><td>${r[0]}</td><td>${nf2.format(r[1])}</td><td>${nf2.format(r[2])}</td><td>${nf1.format(r[3])}</td><td>${nf1.format(r[4])}</td><td><b>%${nf.format(r[6]*100)}</b></td><td class="${cl(r[7])}">${mm(r[7])}</td><td class="${cl(r[8])}">${mm(r[8])}</td></tr>`).join("")+`</tbody>`;
  $("r-tok").innerHTML=H.okuma.map(x=>`<li>${esc(x)}</li>`).join("");
}

/* ---------- RİSK ---------- */
function risk(){
  const F=V.fiy, SN=V.sn||["Baz","Ayı","Boğa"];
  if(S.rs>=SN.length) S.rs=0;
  $("r-sen").innerHTML=SN.map((x,i)=>`<button type="button" data-s="${i}" aria-pressed="${i===S.rs}">${esc(x)}</button>`).join("");
  const fc=()=>{ const s=S.rs, c=7+s*4, k=7+SN.length*4+s*4;
    zaman($("r-cif"),{aria:"CIF motorin yelpazesi",seri:[{ad:SN[s]+" P50",renk:C.mot,v:F.map(r=>r[c+1])},{ad:SN[s]+" temsili yol",renk:C.gts,v:F.map(r=>r[c+3]),kalin:1.4}],bant:[{ad:"P10–P90",lo:F.map(r=>r[c]),hi:F.map(r=>r[c+2]),renk:C.mot}],fmt:nf.format,h:195});
    zaman($("r-kur"),{aria:"USD/TRY yelpazesi",seri:[{ad:"USD/TRY P50",renk:C.kur,v:F.map(r=>r[k+1])},{ad:"temsili yol",renk:C.gts,v:F.map(r=>r[k+3]),kalin:1.4}],bant:[{ad:"P10–P90",lo:F.map(r=>r[k]),hi:F.map(r=>r[k+2]),renk:C.kur}],fmt:v=>nf1.format(v),h:165}); };
  for(const b of $("r-sen").querySelectorAll("button")) b.onclick=()=>{ S.rs=+b.dataset.s; for(const x of $("r-sen").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); fc(); };
  fc();
  iki(); tarihsel();
  const sec=(L,s)=>L.filter(r=>r[2]===s).map(r=>[r[1],r[4],r[5],r[6],r[7],r[8]]);
  const mc=()=>{ const s=S.ms;
    aralik($("r-hedge"),sec(V.mc_hedge,s).sort((a,b)=>b[1]-a[1]),{aria:"Hedge seçenekleri"});
    aralik($("r-gemi"),sec(V.mc_gemi,s).sort((a,b)=>b[1]-a[1]),{aria:"Gemi kombinasyonları"});
    aralik($("r-tank"),sec(V.mc_tank,"Baz").sort((a,b)=>b[1]-a[1]),{aria:"Tank seçenekleri"});
    aralik($("r-dav"),sec(V.mc_dav,"Baz").sort((a,b)=>b[1]-a[1]),{aria:"Müşteri davranışı politikaları"}); };
  for(const b of $("r-msen").querySelectorAll("button")) b.onclick=()=>{ S.ms=b.dataset.s; for(const x of $("r-msen").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); mc(); };
  mc();
}

/* ---------- VARSAYIMLAR ---------- */
function varsayim(){
  const n4=new Intl.NumberFormat("tr-TR",{maximumFractionDigits:4}), f=v=>v==null?"":typeof v==="number"?(Math.abs(v)>=1000?nf.format(v):n4.format(v)):esc(v);
  $("v-gir").innerHTML=`<thead><tr><th class="l">Girdi</th><th>Değer</th><th class="l">Not</th></tr></thead><tbody>`+V.gir.slice(1).map(r=>r[1]==null&&r[2]==null?`<tr class="ara"><td colspan="3">${esc(r[0])}</td></tr>`:`<tr><td class="l" style="white-space:normal">${esc(r[0])}</td><td><b>${f(r[1])}</b></td><td class="l muted" style="white-space:normal">${r[2]!=null?f(r[2]):""}</td></tr>`).join("")+`</tbody>`;
  $("v-par").innerHTML=`<thead><tr><th class="l">Parametre</th><th class="l">Değer</th><th class="l">Kaynak</th></tr></thead><tbody>`+A.pr.map(r=>`<tr><td class="l">${esc(r[0])}</td><td class="l"><b>${esc(r[1])}</b></td><td class="l muted" style="white-space:normal">${esc(r[2])}</td></tr>`).join("")+`</tbody>`;
}

if(V.kaynak) $("meta").textContent=V.kaynak;
goster(location.hash.slice(1)||"genel");
let rzW=innerWidth, rzT; addEventListener("resize",()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ if(Math.abs(innerWidth-rzW)<40) return; rzW=innerWidth; const v=location.hash.slice(1)||"genel"; for(const k in CIZ) delete CIZ[k]; goster(v); },250); });
};
