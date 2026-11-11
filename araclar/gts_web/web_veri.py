# Masaüstü veri hattı çıktısını (O) web panosu verisine çevirir: python3 web_veri.py <O.json> <onceki_web.json> <çıktı.json>
import json,sys
O=json.load(open(sys.argv[1])); W=json.load(open(sys.argv[2]))
for k in ('girdi','girdiYolu','hesap','riskHesap','riskEski','minAlimModel'): O.pop(k,None)
for k in ('ilc','stok_opt','term'): O[k]=W[k]          # DB'den, GTS modelinden bağımsız (paket 88'de DB yalnız MC tabloları değişti)
for r in O["tic"]:
    for i in (3,4,6):
        if len(r)>i: r[i]=None
wh={r[0]:r[1] for r in W.get('hgir',[])}
for r in O.get('hgir',[]): r[1]=wh.get(r[0],r[1])
json.dump(O,open(sys.argv[3],'w'),ensure_ascii=False,separators=(',',':')); print(len(O))
