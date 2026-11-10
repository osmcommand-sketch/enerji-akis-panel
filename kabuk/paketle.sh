#!/bin/bash
# Windows paketi: bash kabuk/paketle.sh <gts|enerji> <electron-win32-x64.zip> <çıktı klasörü> [linux]
set -e
U=$1; EZ=$2; OUT=$3; HED=${4:-win32}
R=$(cd "$(dirname "$0")/.." && pwd)
if [ "$U" = gts ]; then AD="GTS Dortyol"; KAN="$R/gts"; MAIN=main_gts.js; PN=gts-dortyol; else AD="Enerji Akis"; KAN="$R"; MAIN=main_enerji.js; PN=enerji-akis; fi
SUR=$(node -e "console.log(require('$KAN/manifest.json').surum)")
D="$OUT/$AD"; rm -rf "$D"; mkdir -p "$D"; (cd "$D" && unzip -q "$EZ")
if [ "$HED" = win32 ]; then mv "$D/electron.exe" "$D/$AD.exe"; fi
A="$D/resources/app"; mkdir -p "$A/icerik" "$A/node_modules"
cp "$R"/kabuk/{ortak.js,zip.js,is_gts.js,is_enerji.js,$MAIN} "$A/"
[ -f "$R/kabuk/ikon/$PN.png" ] && cp "$R/kabuk/ikon/$PN.png" "$A/ikon.png" && cp "$R/kabuk/ikon/$PN.ico" "$D/$AD.ico"
cat > "$A/package.json" <<J
{ "name": "$PN", "productName": "$AD", "version": "$SUR", "main": "$MAIN" }
J
cp -r "$(dirname "$0")/../../nm_kabuk/node_modules/sql.js" "$A/node_modules/" 2>/dev/null || cp -r "$NM/sql.js" "$A/node_modules/"
node -e "const M=require('$KAN/manifest.json'),fs=require('fs'),p=require('path');for(const f of Object.keys(M.dosyalar)){fs.mkdirSync(p.dirname(p.join('$A/icerik',f)),{recursive:true});fs.copyFileSync(p.join('$KAN',f),p.join('$A/icerik',f));}fs.copyFileSync('$KAN/manifest.json','$A/icerik/manifest.json')"
echo "$D $SUR"
