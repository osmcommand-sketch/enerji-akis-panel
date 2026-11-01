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
let YIL=""; try{ YIL=localStorage.getItem("gts.yil")||""; }catch{}
const PEN={i0:0,n:ND}; const penAyarla=()=>{ if(!YIL){ PEN.i0=0; PEN.n=ND; return; } let a=-1,b=-1; for(let i=0;i<ND;i++) if(String(gun(i).getUTCFullYear())===YIL){ if(a<0) a=i; b=i; } if(a<0){ YIL=""; PEN.i0=0; PEN.n=ND; } else { PEN.i0=a; PEN.n=b-a+1; } };
const yilOk=s=>!YIL||String(s).slice(0,4)===YIL;

/* ---------- Özet sayfası satırları ---------- */
const OZ=V.oz, yI=OZ.findIndex(r=>r[0]==="Yıllara göre");
const oz=(l,yil)=>{ const a=yil?yI:0, b=yil?OZ.length:yI; for(let i=a;i<b;i++) if(OZ[i][0]===l) return OZ[i]; return [l,null,null,null,""]; };
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
const SEK=["genel","akis","operasyon","ekonomi","hedge","risk","varsayim"], CIZ={};
function goster(v){ if(!SEK.includes(v)) v="genel";
  for(const b of document.querySelectorAll(".tabs [data-v]")) b.setAttribute("aria-selected",String(b.dataset.v===v));
  for(const d of document.querySelectorAll(".v")) d.hidden=d.dataset.v!==v;
  if(!BZ) for(const id of ["o-kur","e-fu","h-eu","h-ku"]){ const e=$(id); if(e) e.closest(".ctl").hidden=true; }
  { const ys=$("yilsec"); if(ys) ys.style.visibility=(v==="akis"||v==="varsayim")?"hidden":"visible"; }
  if(!CIZ[v]){ CIZ[v]=1; ({genel,akis,operasyon,ekonomi,hedge,risk,varsayim})[v](); } }
{ const ys=$("yilsec"); if(ys){ const yz=()=>{ for(const b of ys.querySelectorAll("button")) b.setAttribute("aria-pressed",String(b.dataset.y===YIL)); };
  for(const b of ys.querySelectorAll("button")) b.onclick=()=>{ YIL=b.dataset.y; try{ localStorage.setItem("gts.yil",YIL); }catch{} penAyarla(); yz(); for(const k in CIZ) delete CIZ[k]; goster(location.hash.slice(1)||"genel"); };
  penAyarla(); yz(); } }
for(const b of document.querySelectorAll(".tabs [data-v]")) b.addEventListener("click",()=>{ if(location.hash!=="#"+b.dataset.v) location.hash=b.dataset.v; else goster(b.dataset.v); });
addEventListener("hashchange",()=>goster(location.hash.slice(1)));

/* ---------- GENEL ---------- */
function wfKart(baslik,K,toplam,alt){
  let cum=0, mn=0, mx=0; for(const [,v] of K){ cum+=v; mn=Math.min(mn,cum); mx=Math.max(mx,cum); } mn=Math.min(mn,toplam); mx=Math.max(mx,toplam);
  const rg=(mx-mn)||1, X=v=>(v-mn)/rg*100; cum=0; let h="";
  for(const [l,v] of K){ const a=cum, b=cum+v; cum=b; h+=`<span class="wl">${esc(l)}</span><span class="wb"><span class="z0" style="left:${X(0).toFixed(2)}%"></span><i style="left:${X(Math.min(a,b)).toFixed(2)}%;width:${Math.max(.5,Math.abs(X(b)-X(a))).toFixed(2)}%;background:${v>=0?C.pos:C.neg}"></i></span><span class="wv ${v>=0?"p":"n"}">${v>=0?"+":""}${usd(v)}</span>`; }
  h+=`<span class="wl t">Toplam</span><span class="wb"><span class="z0" style="left:${X(0).toFixed(2)}%"></span><i style="left:${X(Math.min(0,toplam)).toFixed(2)}%;width:${Math.max(.5,Math.abs(X(toplam)-X(0))).toFixed(2)}%;background:${C.gts}"></i></span><span class="wv t">${usd(toplam)}</span>`;
  return `<section><div class="head"><h2>${esc(baslik)}</h2><span class="sub">${alt}</span></div><div class="wf" role="img" aria-label="${esc(baslik)} köprüsü">${h}</div></section>`;
}
function genel(){
  { const y0=V.g0.slice(0,4), y1=String(new Date(Date.parse(V.g0+"T00:00:00Z")+(V.gm.length-1)*864e5).getUTCFullYear()); $("g-h").textContent=(y0===y1?y0:y0+"–"+y1)+" senaryo modeli"; }
  const Y=k=>oz(k,1), top=Y("Toplam (USD)"), sm=Y("Motorin satışı (t)"), sb=Y("Benzin satışı (t)"), ora=Y("Satış / hedef tonaj"), tem=Y("Tepe teminat bakiyesi (TL)"), gv=Y("Gemi varışı (adet, varış tarihine göre)");
  const kt=(l,v,s,c="")=>`<div class="kt ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
  const nk=j=>(Y("Net marj (USD)")[j]||0)-(Y("Vergi + beyanname maliyeti (USD)")[j]||0);
  if(YIL){ const j=YIL==="2027"?1:2;
    $("g-kpi").innerHTML=kt(YIL+" net kâr",usd(nk(j)),`hedge dahil, vergi sonrası · model toplamı ${usd(top[j])} (bölgesel avantaj dahil)`,nk(j)<0?"neg":"pos")
      +kt("Satış",ton(sm[j]+sb[j]),`${BZ?`motorin ${ton(sm[j])} · benzin ${ton(sb[j])}`:"yalnız motorin"}<br>hedefin ${pct(ora[j])}`)
      +kt("Gemi varışı",nf.format(gv[j]),`${YIL} varış tarihine göre`)
      +kt("Tepe teminat",nf1.format(tem[j]/1e9)+" milyar TL",`${YIL} ÖTV teminat mektubu tepe bakiyesi`); }
  else $("g-kpi").innerHTML=kt("İki yıl net kâr",usd(nk(3)),`2027 ${usd(nk(1))} · 2028 ${usd(nk(2))} · hedge dahil, vergi sonrası<br>model toplamı ${usd(top[3])} (bölgesel avantaj dahil)`,nk(3)<0?"neg":"pos")
    +kt("Satış",ton(sm[3]+sb[3]),`${BZ?`motorin ${ton(sm[3])} · benzin ${ton(sb[3])}`:"yalnız motorin"}<br>hedefin ${pct(ora[1])} (2027) · ${pct(ora[2])} (2028)`)
    +kt("Gemi varışı",nf.format(gv[3]),`${BZ?`motorin ${oz("Kargo sayısı (dönem varışı)")[1]} · benzin ${oz("Kargo sayısı (dönem varışı)")[2]} kargo · `:"motorin kargoları · "}2027 ${gv[1]} · 2028 ${gv[2]}`)
    +kt("Tepe teminat",nf1.format(tem[3]/1e9)+" milyar TL",`ÖTV teminat mektubu limiti · tepe vergi nakit ${nf1.format(oz("Tepe vergi nakit işletme sermayesi (TL)")[3]/1e9)} milyar TL`);
  if(!$("g-not")) $("g-kpi").insertAdjacentHTML("afterend",`<p class="not" id="g-not">Net kâr = net marj (hedge dahil) − vergi ve beyanname maliyeti; bölgesel navlun avantajı bayi tarafındaki değerdir, kâra dahil değildir. Sonuç tek bir fiyat yolundan gelir: <b id="g-yol"></b>. Parti boyutu, ikinci liman, vade ve hedge karşılaştırması ile iki yıllık Monte Carlo Risk sekmesindedir.</p>`);
  { const sn=gir("Fiyat senaryosu")||"Baz", yo=gir("Fiyat yolu"); $("g-yol").textContent=sn==="Makul"?"Makul senaryo (kullanıcı fiyat modeli)":`${sn} senaryosu, ${yo==="P50"?"P50 (günlük medyan)":"temsili yol"}`; }
  ticari();
  karlilik();
}

/* ---------- Kârlılık: kalemler halinde, hedge dahil net kâra kadar (kullanıcı 01.11.2026 18:23) ----------
   Kargo bazında (kargonun satışa hazır olduğu yıl); vergi ve bölgesel avantaj Özet "Yıllara göre" bloğundan. */
function karlilik(){
  const Y=k=>oz(k,1), yillar=[["2027",1],["2028",2]], kol=YIL?yillar.filter(x=>x[0]===YIL):yillar.concat([["Toplam",3]]);
  const gn=l=>{ const v=+gir(l); return isFinite(v)?v:0; }, EL=gn("GTS elleçleme tarifesi (USD/t)"), SY=gn("İthal kargo ek seyir (USD/t)"), PR=[gn("Alım primi / iskontosu – motorin (USD/t, CIF Med ±)"),gn("Alım primi / iskontosu – benzin (USD/t, CIF Med ±)")];
  const top=(y)=>{ const o={t:0,sat:0,al:0,nav:0,ik:0,br:0,fin:0,hb:0,hi:0,ht:0,net:0,kur:0,n:0,fd:0,ap:0,pr:0,el:0,sy:0};
    for(const [li,L] of [V.km,V.kb].entries()) for(const k of L){ if(y!=="Toplam"&&k[4].slice(0,4)!==y) continue; if(k.length<23) continue;
      o.t+=k[2]; o.al+=k[16]; o.nav+=k[17]; o.ik+=k[18]; o.br+=k[12]; o.fin+=k[15]; o.hb+=k[19]; o.hi+=k[20]; o.ht+=k[21]; o.net+=k[13]; o.kur+=k[22]; o.n++; if(k.length>=26){ o.fd+=(k[25]-k[9])*k[2]; o.ap+=k[9]*k[2]-(k[16]-k[17]-k[18]); o.pr+=PR[li]*k[2]; o.el+=EL*k[2]; o.sy+=SY*k[2]; } }
    o.sat=o.al+o.br; return o; };
  const T=kol.map(([y,j])=>{ const o=top(y); o.ver=Y("Vergi + beyanname maliyeti (USD)")[j]||0; o.bol=Y("Bölgesel navlun avantajı (USD)")[j]||0; o.nk=o.net-o.ver; o.mt=o.nk+o.bol; o.ad=y; return o; });
  if(!T[0].n){ $("g-kar").innerHTML=`<tbody><tr><td class="l">Bu paketteki model kalem ayrıntısı vermiyor.</td></tr></tbody>`; return; }
  // tür: h=hacim, ana=ana kalem (kalın), alt=bileşen (girintili), ara=ara toplam (kalın), son=net kâr, b=bilgi
  const R=[
    ["Satış hacmi",o=>o.t,"h","kargo tonu"],
    ["Satış geliri",o=>o.sat,"ana","Tüpraş vergisiz fiyatı ± satış farkı"],
    ["Ürün alışı",o=>-(o.al-o.nav-o.ik),"alt","CIF Med ± alım primi, elleçleme, ek seyir ve tahliye farkı dahil"],
    ["Gemi navlun farkı",o=>-o.nav,"alt","büyük gemi kazancı (+), küçük gemi farkı (−)"],
    ["İkinci liman (kısmi tahliye)",o=>-o.ik,"alt"],
    ["Brüt marj",o=>o.br,"ara"],
    ["Tüpraş primi",o=>o.br-o.fd-o.ap+o.nav+o.ik,"acl","satış fiyatı − satış dönemindeki CIF Med"],
    ["Stokta fiyat değişimi",o=>o.fd,"acl","satış dönemi CIF − fiyatlama günü CIF; düşen piyasada zarar"],
    ["Alım primi, elleçleme ve tahliye farkı",o=>o.ap,"acl","CIF Med ile ürün alışı arasındaki fark (navlun hariç)"],
    ["Alım primi / iskontosu",o=>-o.pr,"acl2","Ticari koşullar: CIF Med ± USD/t; prim (+) zarar, iskonto (−) kazanç"],
    ["GTS elleçleme tarifesi",o=>-o.el,"acl2",`${nf1.format(EL)} USD/t · Girdiler B48`],
    ["İthal kargo ek seyir",o=>-o.sy,"acl2",`${nf1.format(SY)} USD/t · Girdiler B49`],
    ["Tahliye farkı",o=>o.ap+o.pr+o.el+o.sy,"acl2","konşimento ile tahliye edilen ton farkı (%"+nf1.format(gn("Tahliye farkı (gemi B/L − tahliye, %)")*100)+"); tüm alış bedeline uygulanır"],
    ["Navlun farkı ve ikinci liman",o=>-o.nav-o.ik,"acl","Gemi navlun farkı + İkinci liman satırları"],
    ["Finansman",o=>-o.fin,"alt","stokta kalma ve müşteri vadesi"],
    ["Hedge öncesi marj",o=>o.br-o.fin,"ara"],
    ["Ürün hedge sonucu",o=>o.hb,"alt","ICE Gasoil; kilit fiyatı − satış dönemi CIF"],
    ["Hedge işlem maliyeti",o=>-o.hi,"alt"],
    ["Hedge teminat finansmanı",o=>-o.ht,"alt"],
    ["Net marj (hedge dahil)",o=>o.net,"ara"],
    ["Vergi ve beyanname",o=>-o.ver,"alt","ÖTV ve KDV finansmanı, teminat komisyonu, beyanname"],
    ["Net kâr",o=>o.nk,"son"],
    ["Bölgesel navlun avantajı",o=>o.bol,"b","bayi tarafındaki değer; kâra dahil değil"],
    ["Model toplamı",o=>o.mt,"b","net kâr + bölgesel avantaj"],
    ["Tahsilat süresinde kur farkı",o=>o.kur,"b","net marjın içinde"]];
  const son=T[T.length-1], mx=Math.max(1,...R.filter(r=>r[2]!=="h"&&r[0]!=="Satış geliri"&&r[0]!=="Ürün alışı").map(r=>Math.abs(r[1](son))));
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
    const v=f(son), w=t==="h"||l==="Satış geliri"||l==="Ürün alışı"?0:Math.min(100,Math.abs(v)/mx*100);
    h+=`<td class="l bar">${w?`<i class="${v<0?"n":"p"}${t==="ara"||t==="son"?" kal":""}" style="width:${w.toFixed(1)}%"></i>`:""}</td></tr>`; }
  $("g-kar").innerHTML=h+`</tbody>`;
  $("g-ksub").textContent=`kargo bazında, kargonun satışa hazır olduğu yıla · $/t kargo tonu başına · % satış gelirine oran${Object.keys(V.girdi||{}).length?" · sizin girdilerinizle":""}`;
}

/* girdiler.json: bir panelin anahtarlarını yenileriyle değiştirir, diğer panellerinkini korur */
function girdiYaz(anahtarlar,yeni){ const fs=require("fs"), path=require("path"), o={};
  for(const [k,v] of Object.entries(V.girdi||{})) if(!anahtarlar.includes(k)) o[k]=v; Object.assign(o,yeni);
  fs.mkdirSync(path.dirname(V.girdiYolu),{recursive:true}); if(Object.keys(o).length) fs.writeFileSync(V.girdiYolu,JSON.stringify(o,null,1)); else if(fs.existsSync(V.girdiYolu)) fs.unlinkSync(V.girdiYolu); }
/* ---------- Ticari koşullar: kullanıcı girdisi (Excel Özet G5:I14); masaüstünde model bu değerlerle yeniden hesaplanır ---------- */
function ticari(){
  const el=$("g-tic"), T=(V.tic||[]).filter(r=>r[1]!=="Değer");
  if(!T.length){ el.innerHTML=`<p class="not">Bu paketteki Excel modelinde ticari koşullar paneli yok (paket 57 ve sonrası).</p>`; return; }
  const yaz=typeof require==="function"&&V.girdiYolu&&window.gts, G=V.girdi||{}, TK=T.filter(r=>r[4]).map(r=>r[4]), nG=TK.filter(k=>k in G).length;
  const bir=l=>/USD\/t/.test(l)?"$/t":/TL\/m³/.test(l)?"TL/m³":/gün/i.test(l)?"gün":/\(t\)$/.test(l)?"ton":"";
  const onEk=l=>/COD/.test(l)?"COD ±":/Tüpraş ±/.test(l)?"Tüpraş ±":"";
  const adT=l=>l.replace(/ \((USD\/t|TL\/m³|gün|t)\)$/,"").replace(/: COD \+ gün$/,"").replace(/: Tüpraş ±$/,"");
  const f=v=>typeof v==="number"?(Math.abs(v)>=1e4?nf.format(v):String(v).replace(".",",")):"";
  let h="";
  for(const r of T){ if(r[1]==null&&r[2]==null){ h+=`<div class="tic-g">${esc(r[0])}</div>`; continue; }
    const id="tg-"+(r[4]||r[0]).replace(/[^\w]/g,""), deg=r[3], deg2=typeof deg==="number"&&deg!==r[1];
    const not=String(r[2]||"").replace(/\s*Girdiler B\d+(, B\d+)*\.?/g,"").trim();
    h+=`<div class="kt tic-k${deg2?" deg":""}" title="${esc(not)}"><label for="${id}">${esc(adT(r[0]))}</label>
      <div class="tic-i">${onEk(r[0])?`<em>${onEk(r[0])}</em>`:""}<input id="${id}" type="text" inputmode="decimal" data-h="${esc(r[4]||"")}" data-d="${deg??""}" value="${f(r[1])}"${r[5]?` data-bos="1" placeholder="boş = ${esc(f(T.find(x=>/^Motorin GTS partisi/.test(x[0]))?.[1]))}"`:""} ${yaz&&r[4]?"":"disabled"} aria-describedby="${id}-n"><em>${bir(r[0])}</em></div>
      <small id="${id}-n">${deg2?`<b>model varsayılanı ${f(deg)}</b>`:""}</small></div>`; }
  el.innerHTML=`<div class="tic">${h}</div><div class="tic-a">${yaz?`<button type="button" class="ana" id="tic-hesap" disabled>Modeli bu koşullarla hesapla</button>${nG?`<button type="button" class="btn" id="tic-sifir">Model varsayılanına dön</button>`:""}<span class="chip ${nG?"eski":"ok"}">${nG?`Sizin girdileriniz uygulanıyor (${nG})`:"Model varsayılanları"}</span><span class="not" id="tic-d"></span>`:`<span class="not">Değerleri masaüstü uygulamasında (GTS Dörtyol) girebilirsiniz; model sizin koşullarınızla yeniden hesaplanır.</span>`}</div>`;
  if(!yaz) return;
  const I=[...el.querySelectorAll("input[data-h]")], sayi=t=>{ const s=t.trim().replace(/\s/g,"").replace("−","-").replace(/\.(?=\d{3}(\D|$))/g,"").replace(",","."); return s===""?null:Number(s); }, oku=i=>{ const v=sayi(i.value); return v===null&&!i.dataset.bos?NaN:v; };
  const btn=$("tic-hesap"), d=$("tic-d");
  const kontrol=()=>{ let deg=false, hata=false; for(const i of I){ const v=oku(i), ilk=sayi(i.defaultValue);
      const ok=v===null||isFinite(v)&&(!i.dataset.bos||v>0); i.classList.toggle("hata",!ok); if(!ok){ hata=true; continue; } if(v===null?ilk!==null:ilk===null||Math.abs(v-ilk)>1e-12) deg=true; }
    btn.disabled=hata||!deg; d.textContent=hata?"Geçerli bir sayı girin.":deg?"Değişiklikler hesaplanmadı.":""; };
  for(const i of I){ i.addEventListener("input",kontrol); i.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!btn.disabled) btn.click(); }); }
  const kaydet=(o)=>girdiYaz(TK,o||{});
  btn.onclick=()=>{ const o={}; for(const i of I){ const v=oku(i), dv=i.dataset.d===""?null:Number(i.dataset.d); if(v===null) continue; if(dv===null||Math.abs(v-dv)>1e-12) o[i.dataset.h]=v; }
    try{ kaydet(o); }catch(e){ d.textContent="Girdiler kaydedilemedi: "+e.message; return; } btn.disabled=true; d.textContent="Hesaplanıyor…"; window.gts.yenile(); };
  const sf=$("tic-sifir"); if(sf) sf.onclick=()=>{ try{ kaydet(null); }catch(e){ d.textContent=e.message; return; } window.gts.yenile(); };
}

/* ---------- PAZAR VE AKIŞ ---------- */
const A=V.akis, VAD={REF:"Referans · 3,5 $/t, MR, 150 bin m³",TARIFE_2:"GTS tarifesi 2 $/t",TARIFE_5:"GTS tarifesi 5 $/t",RAKIP_MERSIN_YARI:"Mersin tarifesi yarıya iner",RAKIP_MERSIN_TAM:"Mersin tarifesi sıfırlanır",GEMI_LR1:"LR1 gemi",GEMI_LR2:"LR2 gemi",TANK_120:"Tank 120 bin m³",TANK_200:"Tank 200 bin m³",DEVIR_12:"Azami devir 12",GERCEKCI:"Gerçekçi: Mersin −%50, LR2, devir 12",GERCEKCI_200:"Gerçekçi + tank 200 bin m³"};
const S={sen:"HEDEF_150",vaka:"GERCEKCI_200",ku:"m",fu:"m",rs:0,ms:"Baz",acik:new Set(),hu:"m",hku:"m",hhep:false,hkhep:false};
const tAd=t=>{ const x=V.term[t]; return x?(x[0]==="T227"?"GTS Dörtyol":x[1]):"?"; };
const PJ=V.geo.proj, pj=(la,lo)=>[(lo-PJ.minx)*PJ.cos*PJ.sx,(PJ.maxy-la)*PJ.sx];
function akis(){
  const sel=$("a-vaka");
  const doldur=()=>{ const L=A.oz.filter(r=>r[0]===S.sen); if(!L.some(r=>r[1]===S.vaka)) S.vaka="REF"; let og="",h=""; for(const r of L){ if(r[2]!==og){ if(og) h+="</optgroup>"; h+=`<optgroup label="${esc(r[2])}">`; og=r[2]; } h+=`<option value="${esc(r[1])}">${esc(VAD[r[1]]||r[1])}</option>`; } sel.innerHTML=h+"</optgroup>"; sel.value=S.vaka; };
  sel.onchange=()=>{ S.vaka=sel.value; ciz(); };
  for(const b of $("a-sen").querySelectorAll("button")) b.onclick=()=>{ S.sen=b.dataset.s; for(const x of $("a-sen").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); doldur(); ciz(); };
  doldur(); ciz();
  function ciz(){
    const oi=A.oz.findIndex(r=>r[0]===S.sen&&r[1]===S.vaka), o=A.oz[oi];
    $("a-sub").textContent=`${S.sen==="BAZ_075"?"Baz · 0,75 Mt":"Hedef · 1,5 Mt"} · ${VAD[S.vaka]||S.vaka}`;
    const kt=(l,v,s,c="")=>`<div class="kt ${c}" style="grid-column:span 3"><span>${l}</span><b>${v}</b><small>${s}</small></div>`;
    $("a-kart").innerHTML=kt("GTS'ye kayan",ton(o[9]+o[10]),`motorin ${ton(o[9])} · benzin ${ton(o[10])}${o[12]>=0.5?` · <b style="color:${C.neg}">hedef açığı ${ton(o[12])}</b>`:""}`)
      +kt("Leg2 motorin",km(o[14]),`önce ${km(o[13])} · ortalama kısalma ${km(o[31])}`)
      +kt("Müşteri neti",usd(o[30]),`navlun tasarrufu ${usd(o[23])} · GTS geliri ${usd(o[29])}`,o[30]>=0?"pos":"neg")
      +kt("Azami tarife",nf1.format(o[33])+" $/t",`devir ${nf1.format(o[21])} / yıl · ${o[32]} şirket`);
    const KY=A.ky.filter(r=>r[0]===oi), IK=A.ik.filter(r=>r[0]===oi), TM=A.tm.filter(r=>r[0]===oi);
    harita(KY,IK,TM);
    const T=[...TM.filter(r=>r[4]>r[3]).sort((a,b)=>b[4]-a[4]),...TM.filter(r=>r[4]<=r[3]).sort((a,b)=>(a[4]-a[3])-(b[4]-b[3]))];
    $("a-term").innerHTML=`<thead><tr><th class="l">Terminal</th><th class="l">Ürün</th><th>Önce</th><th>Sonra</th><th>Değişim</th><th>%</th></tr></thead><tbody>`+T.map(r=>{ const d=r[4]-r[3]; return `<tr><td class="l"><b>${esc(tAd(r[1]))}</b> <span class="muted">· ${esc(V.term[r[1]]?V.term[r[1]][2]:"")}</span></td><td class="l">${r[2]?"Motorin":"Benzin"}</td><td>${ton(r[3])}</td><td>${ton(r[4])}</td><td class="${d>0?"p":"n"}"><b>${d>0?"+":""}${ton(d)}</b></td><td class="muted">${r[3]?pct(d/r[3]):"yeni"}</td></tr>`; }).join("")+`</tbody>`;
    const ls=T.filter(r=>r[4]<r[3]); $("a-tsub").textContent=`${ls.length} terminal × ürün kaybediyor · toplam kayıp ${ton(ls.reduce((a,r)=>a+r[3]-r[4],0))}`;
    const SM=new Map(); for(const r of KY){ const x=SM.get(r[1])||SM.set(r[1],{v:[0,0],it:0,ko:0,ks:0,il:new Map()}).get(r[1]); x.v[r[3]]+=r[6]; x.it+=r[7]; x.ko+=r[6]*r[8]; x.ks+=r[6]*r[9]; const y=x.il.get(r[2])||x.il.set(r[2],{v:[0,0],ko:0,ks:0}).get(r[2]); y.v[r[3]]+=r[6]; y.ko+=r[6]*r[8]; y.ks+=r[6]*r[9]; }
    const SL=[...SM].sort((a,b)=>(b[1].v[0]+b[1].v[1])-(a[1].v[0]+a[1].v[1]));
    const kk=(x)=>{ const t=x.v[0]+x.v[1]; return t?`${nf.format(x.ko/t)} → ${nf.format(x.ks/t)}`:""; };
    let h=`<thead><tr><th class="l">Şirket / il</th><th>Motorin</th><th>Benzin</th><th>İthal payı</th><th>Leg2 km önce → sonra</th></tr></thead><tbody>`;
    for(const [s,x] of SL){ const ac=S.acik.has(s); h+=`<tr class="top" data-s="${s}" aria-expanded="${ac}"><td class="l">${ac?"▾":"▸"} ${esc(V.sir[s]||"?")} <span class="muted">· ${x.il.size} il</span></td><td>${ton(x.v[1])}</td><td>${ton(x.v[0])}</td><td>${pct(x.v[1]?x.it/x.v[1]:0)}</td><td>${kk(x)}</td></tr>`;
      if(ac) for(const [i,y] of [...x.il].sort((a,b)=>(b[1].v[0]+b[1].v[1])-(a[1].v[0]+a[1].v[1]))) h+=`<tr><td class="l" style="padding-left:28px">${esc(V.il[i]||"?")}</td><td>${ton(y.v[1])}</td><td>${ton(y.v[0])}</td><td></td><td>${kk(y)}</td></tr>`; }
    const tb=$("a-sir"); tb.innerHTML=h+`</tbody>`; for(const tr of tb.querySelectorAll("tr[data-s]")) tr.onclick=()=>{ const s=+tr.dataset.s; S.acik.has(s)?S.acik.delete(s):S.acik.add(s); ciz(); };
    $("a-ssub").textContent=`${SM.size} şirket · satıra tıklayınca iller açılır`;
  }
}
function harita(KY,IK,TM){
  const G=V.geo, u=G.w/1000, add=(m,k,x)=>m.set(k,(m.get(k)||0)+x);
  const IV=new Map(), IU=new Map(); for(const r of KY){ add(IV,r[2],r[6]); const o=IU.get(r[2])||IU.set(r[2],[0,0,0,0]).get(r[2]); o[r[3]]+=r[6]; o[2]+=r[6]*r[8]; o[3]+=r[6]*r[9]; }
  const mx=Math.max(1,...IV.values());
  let m=""; for(const [n,d] of Object.entries(G.p)){ const x=IV.get(+n)||0; m+=`<path d="${d}" fill="${x>=0.5?`rgba(184,134,11,${(0.10+0.48*Math.sqrt(x/mx)).toFixed(2)})`:"var(--c0)"}" stroke="#fff" stroke-width="${(0.6*u).toFixed(2)}"><title>${esc(V.il[n]||"")}${x>=0.5?": "+ton(x):""}</title></path>`; }
  const gt=Object.keys(V.term).find(k=>V.term[k][0]==="T227"); let e="";
  if(gt!=null){ const [gx,gy]=pj(V.term[gt][3],V.term[gt][4]);
    for(const [i,x] of [...IV].sort((a,b)=>a[1]-b[1])){ const c=G.c&&G.c[i]; if(!c||x<0.02*mx) continue; if(Math.hypot(c[0]-gx,c[1]-gy)<4*u) continue;
      e+=`<path d="M${gx.toFixed(1)},${gy.toFixed(1)} Q${((gx+c[0])/2).toFixed(1)},${(Math.min(gy,c[1])-18*u).toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}" stroke="${C.gts}" stroke-opacity=".75" stroke-linecap="round" stroke-width="${(0.6*u+5*u*Math.sqrt(x/mx)).toFixed(2)}" fill="none"><title>GTS → ${esc(V.il[i]||"")}: ${ton(x)}</title></path>`; } }
  let dt=""; const mk=Math.max(1,...IK.map(r=>r[6])); for(const r of IK){ if(r[3]==null) continue; const [px,py]=pj(r[3],r[4]), sv=r[7]-r[8]; dt+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${Math.max(1.2*u,5*u*Math.sqrt(r[6]/mk)).toFixed(1)}" fill="${sv>=100?C.pos:sv>=50?"#5FA36F":"#A7C9AE"}" fill-opacity=".85" stroke="#fff" stroke-width="${(0.4*u).toFixed(2)}"><title>${esc(r[2])} · ${r[5]?"motorin":"benzin"} ${ton(r[6])} · ${nf.format(r[7])} → ${nf.format(r[8])} km</title></circle>`; }
  const TV=new Map(); for(const r of TM) add(TV,r[1],r[4]-r[3]); const mT=Math.max(1,...[...TV.values()].map(Math.abs)); let nd="", lb="";
  for(const [t,d] of [...TV].sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]))){ const x=V.term[t]; if(!x) continue; const [px,py]=pj(x[3],x[4]), r=Math.max(2.2*u,14*u*Math.sqrt(Math.abs(d)/mT)), g=d>0;
    nd+=`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="${g?C.gts:"#fff"}" fill-opacity="${g?".92":".65"}" stroke="${g?"#fff":C.neg}" stroke-width="${(1.2*u).toFixed(2)}"><title>${esc(tAd(t))}: ${g?"+":""}${ton(d)}</title></circle>`;
    if(g||Math.abs(d)>=0.3*mT) lb+=`<text x="${(px+(g?-r-4*u:r+3*u)).toFixed(1)}" y="${(py+(g?-r:3*u)).toFixed(1)}" text-anchor="${g?"end":"start"}" style="font:${(10*u).toFixed(1)}px var(--f-body);fill:var(--ink);paint-order:stroke;stroke:#fff;stroke-width:${(3*u).toFixed(1)}">${esc(tAd(t))}</text>`; }
  $("a-harita").innerHTML=`<svg viewBox="0 0 ${G.w} ${G.h}" role="img" aria-label="GTS'ye kayan hacim haritası">${m}<g>${e}</g><g>${dt}</g><g>${nd}</g><g style="pointer-events:none">${lb}</g></svg><div class="lg"><span><i style="background:${C.gts};height:4px"></i>GTS → il</span><span><i class="k" style="background:#fff;border:1.5px solid ${C.neg};border-radius:50%"></i>hacim kaybeden terminal</span>${IK.length?`<span><i class="k" style="background:${C.pos};border-radius:50%"></i>ilçe · Leg2 kısalması ≥ 100 km (koyu)</span>`:`<span class="muted">ilçe noktaları yalnız referans vakada</span>`}</div>`;
  const L=[...IU].sort((a,b)=>(b[1][0]+b[1][1])-(a[1][0]+a[1][1])), TT=KY.reduce((a,r)=>a+r[6],0);
  $("a-il").innerHTML=`<div class="r"><b>İllere göre</b><span class="muted">${L.length} il · ${ton(TT)}</span></div>`+L.slice(0,10).map(([i,o])=>{ const t=o[0]+o[1]; return `<div class="r"><span>${esc(V.il[i]||"?")}<br><small class="muted">${nf.format(o[2]/t)} → ${nf.format(o[3]/t)} km</small></span><b>${ton(t)}</b></div>`; }).join("")+(L.length>10?`<div class="r"><span class="muted">+${L.length-10} il</span><span class="muted">${ton(L.slice(10).reduce((a,[,o])=>a+o[0]+o[1],0))}</span></div>`:"");
  $("a-hsub").textContent="il rengi ve çizgi kalınlığı GTS'den ile giden ton";
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
  const sat=[["Motorin satışı (t)",ton],...(BZ?[["Benzin satışı (t)",ton]]:[]),["Satış / hedef tonaj",pct],["Gemi varışı (adet, varış tarihine göre)",nf.format],["Brüt marj (USD)",musd,1],["Finansman (USD)",x=>musd(-x),1],["Ürün hedge net (USD)",musd,1],["Net marj (USD)",musd,2],["Vergi + beyanname maliyeti (USD)",x=>musd(-x),1],["Bölgesel navlun avantajı (USD)",musd,1],["Toplam (USD)",musd,2],["Toplam (USD/t)",nf2.format],["Tepe teminat bakiyesi (TL)",x=>nf1.format(x/1e9)+" mlr TL"]];
  $("e-yil").classList.toggle("y27",YIL==="2027"); $("e-yil").classList.toggle("y28",YIL==="2028");
  $("e-yil").innerHTML=`<thead><tr><th class="l">Kalem</th><th>2027</th><th>2028</th><th>Toplam</th></tr></thead><tbody>`+sat.map(([l,f,t])=>{ const r=oz(l,1), neg=l.startsWith("Finansman")||l.startsWith("Vergi"); const cl=v=>t?((neg?-v:v)>=0?"p":"n"):""; return `<tr${t===2?' class="top"':""}><td class="l">${esc(l.replace(" (USD)","").replace("Finansman","Finansman (−)").replace("Vergi + beyanname maliyeti","Vergi ve beyanname (−)"))}</td>${[1,2,3].map(j=>`<td class="${cl(r[j])}">${t===2?"<b>":""}${f(r[j])}${t===2?"</b>":""}</td>`).join("")}</tr>`; }).join("")+`</tbody>`;
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
    try{ girdiYaz(KS,o); }catch(e){ d.textContent="Kaydedilemedi: "+e.message; return; } btn.disabled=true; d.textContent="Hesaplanıyor…"; window.gts.yenile(); };
  const sf=$("hg-sifir"); if(sf) sf.onclick=()=>{ try{ girdiYaz(KS,{}); }catch(e){ d.textContent=e.message; return; } window.gts.yenile(); };
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
  const et=()=>{ const L=A.filter(([u])=>S.hu==="b"?u==="Benzin":u==="Motorin"), N=S.hhep?L.length:20;
    $("h-etab").innerHTML=`<thead><tr><th>No</th><th class="l">Fiyatlama</th><th class="l">Satışa hazır</th><th>Ton</th><th>Oran</th><th>CIF fiyatlama $/t</th><th>Kilit $/t</th><th>Satış dönemi CIF $/t</th><th>Fark $/t</th><th>Brüt</th><th>Maliyet</th><th>Net</th></tr></thead><tbody>`
      +L.slice(0,N).map(([u,k])=>{ const f=k[24]-k[25]; return `<tr><td>${k[0]}</td><td class="l">${tk(k[23])}</td><td class="l">${tk(k[4])}</td><td>${ton(k[2])}</td><td>%${nf.format((k[26]||0)*100)}</td><td>${nf1.format(k[9])}</td><td>${nf1.format(k[24])}</td><td>${nf1.format(k[25])}</td><td class="${f>=0?"p":"n"}">${(f<0?"−":"+")+nf1.format(Math.abs(f))}</td><td class="${k[19]>=0?"p":"n"}">${usd(k[19])}</td><td class="n">${usd(-(k[20]+k[21]))}</td><td class="${k[14]>=0?"p":"n"}"><b>${usd(k[14])}</b></td></tr>`; }).join("")
      +(L.length>20?`<tr><td colspan="12" class="empty"><button type="button" class="btn" id="h-hep">${S.hhep?"İlk 20 kargo":`Tümü (${L.length})`}</button></td></tr>`:"")+`</tbody>`;
    const b=$("h-hep"); if(b) b.onclick=()=>{ S.hhep=!S.hhep; et(); }; };
  for(const b of $("h-eu").querySelectorAll("button")) b.onclick=()=>{ S.hu=b.dataset.u; for(const x of $("h-eu").querySelectorAll("button")) x.setAttribute("aria-pressed",String(x===b)); et(); };
  et();
  /* kur */
  const ke=sm(A,k=>k[30]), kf=sm(A,k=>k[22]), acik=kur&&kur[2]==="Açık";
  const yak=sm(A,k=>{ const tl=(k[31]||0)*k[2]; return k[29]&&k[28]?tl*(1/k[29]-1/k[28])*(kuro?kuro[2]:1):0; });
  const fw=A.reduce((a,[,k])=>a+(k[29]-k[28])*k[2],0)/(tT||1);
  $("h-kk").innerHTML=kt("Kur hedge",acik?"Açık":"Kapalı",`oran %${nf.format((kuro?kuro[2]:0)*100)} · satış günü TL tahsilatı tahsil gününe forward ile sabitlenir`,acik?"":"")
    +kt("Kur hedge etkisi (model)",usd(ke),acik?"satış gelirine dahil":"kur hedge kapalı",ke<0?"neg":ke>0?"pos":"")
    +kt("Tahsilat süresinde kur farkı",usd(kf),`hedgesiz; satış günü kuruna göre · net marjın içinde`,kf<0?"neg":"pos")
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
function iki(){
  const IZ=V.izg||[], M2=V.mc2||[], mm=v=>(v<0?"−":v>0?"+":"")+nf1.format(Math.abs(v)/1e6), cl=v=>v<0?"n":"p";
  $("r-iki").hidden=!IZ.length&&!M2.length; if(!IZ.length&&!M2.length) return;
  const vs=+gir("Satış vadesi (gün)")||17;
  const R=[...IZ].sort((a,b)=>(a[1]===b[1]?0:a[1]==="Açık"?-1:1)||a[4]-b[4]||a[2]-b[2]||a[3]-b[3]);
  const mx=Math.max(1,...R.map(r=>Math.abs(r[5]+r[6])));
  $("r-izg").innerHTML=`<thead><tr><th class="l">Ürün hedge</th><th>Vade</th><th>Parti</th><th>İkinci liman</th><th>Net kâr 2027<br><span>M $</span></th><th>2028</th><th>İki yıl</th><th class="l bar-h">iki yıl</th></tr></thead><tbody>`+R.map(r=>{ const t=r[5]+r[6], v=r[2]===40&&r[3]===60000&&r[4]===17&&r[1]==="Açık";
    return `<tr class="${v?"varsay":""}"><td class="l">${esc(r[1])}${v?' <span class="chip">varsayılan</span>':""}</td><td>${r[4]?nf.format(r[4])+" gün":"peşin"}</td><td>${nf.format(r[2])} kt</td><td>${r[3]?nf.format(r[3])+" $":"yok"}</td><td class="${cl(r[5])}">${mm(r[5])}</td><td class="${cl(r[6])}">${mm(r[6])}</td><td class="${cl(t)}"><b>${mm(t)}</b></td><td class="l bar"><i class="${t<0?"n":"p"}" style="width:${(Math.abs(t)/mx*100).toFixed(1)}%"></i></td></tr>`; }).join("")+`</tbody>`;
  const SO={Baz:0,"Ayı":1,"Boğa":2}, M=[...M2].sort((a,b)=>(SO[a[0]]??9)-(SO[b[0]]??9)||b[2]-a[2]);
  const cfg=c=>{ const m=/^(\d+)kt_L(\d+)k_V(\d+)/.exec(c); return m?`${m[1]} kt · ikinci liman ${+m[2]?m[2]+" bin $":"yok"} · ${+m[3]?"vade "+m[3]+" gün":"peşin"}`:c; };
  const hc=o=>`<td class="${cl(o[2])}">${mm(o[2])}</td><td class="muted">${mm(o[1])} … ${mm(o[3])}</td><td class="${o[4]>=.5?"n":""}"><b>%${nf.format(o[4]*100)}</b></td>`;
  $("r-mc2").innerHTML=`<thead><tr><th class="l">Senaryo</th><th class="l">Koşul</th><th>Yol</th><th>2027 medyan<br><span>M $</span></th><th>P10 … P90</th><th>Zarar olas.</th><th>2028 medyan</th><th>P10 … P90</th><th>Zarar olas.</th><th>İki yıl medyan</th><th>P10 … P90</th><th>Zarar olas.</th></tr></thead><tbody>`
    +M.map(r=>`<tr><td class="l"><b>${esc(r[0])}</b></td><td class="l">${esc(cfg(r[1]))}</td><td>${r[2]}</td>${hc(r[3])}${hc(r[4])}${hc(r[5])}</tr>`).join("")+`</tbody>`;
  $("r-izsub").textContent=`Makul fiyat yolu · net kâr (hedge dahil, vergi sonrası) · ${IZ.length} çalıştırma`;
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
  iki();
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
  const f=v=>v==null?"":typeof v==="number"?(Math.abs(v)>=1000?nf.format(v):Math.abs(v)<1&&v!==0?nf.format(v*1e4)/1e4+"":String(v).replace(".",",")):esc(v);
  $("v-gir").innerHTML=`<thead><tr><th class="l">Girdi</th><th>Değer</th><th class="l">Not</th></tr></thead><tbody>`+V.gir.slice(1).map(r=>r[1]==null&&r[2]==null?`<tr class="ara"><td colspan="3">${esc(r[0])}</td></tr>`:`<tr><td class="l" style="white-space:normal">${esc(r[0])}</td><td><b>${f(r[1])}</b></td><td class="l muted" style="white-space:normal">${r[2]!=null?f(r[2]):""}</td></tr>`).join("")+`</tbody>`;
  $("v-par").innerHTML=`<thead><tr><th class="l">Parametre</th><th class="l">Değer</th><th class="l">Kaynak</th></tr></thead><tbody>`+A.pr.map(r=>`<tr><td class="l">${esc(r[0])}</td><td class="l"><b>${esc(r[1])}</b></td><td class="l muted" style="white-space:normal">${esc(r[2])}</td></tr>`).join("")+`</tbody>`;
}

if(V.kaynak) $("meta").textContent=V.kaynak;
goster(location.hash.slice(1)||"genel");
let rzW=innerWidth, rzT; addEventListener("resize",()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ if(Math.abs(innerWidth-rzW)<40) return; rzW=innerWidth; const v=location.hash.slice(1)||"genel"; for(const k in CIZ) delete CIZ[k]; goster(v); },250); });
};
