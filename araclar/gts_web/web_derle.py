# GTS web panosu: yayındaki sayfayı şablon alır; veri JSON'unu ve pano betiğini değiştirir.
# python3 web_derle.py <sablon.html> <veri.json> <pano.js> <kaynak metni> <çıktı.html>
import sys,re,json
sab,veri,pano,kay,out=sys.argv[1:]
h=open(sab,encoding='utf-8').read()
V=open(veri,encoding='utf-8').read().replace('</','<\\/')
a=h.index('<script id="veri" type="application/json">'); b=h.index('</script>',a)
h=h[:a]+'<script id="veri" type="application/json">'+V+h[b:]
c=h.index('<script>\n"use strict";\nwindow.GTSPano'); d=h.index('\nGTSPano(JSON.parse(',c)
h=h[:c]+'<script>\n'+open(pano,encoding='utf-8').read().rstrip()+'\n\n'+h[d+1:]
h=re.sub(r'Veri: Enerji Master DB paket \d+[^<"]*',kay,h)
open(out,'w',encoding='utf-8').write(h); print(len(h))
