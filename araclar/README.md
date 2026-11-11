# Araçlar (SDT derleme ve test betikleri)

Kural (kullanıcı 11.11.2026): kod değişikliği olan her iş, GitHub'a gönderilmeden ya da kullanıcıya zip teslim edilmeden bitmiş sayılmaz.
Bu klasör, daha önce yalnız oturumun geçici çalışma alanında duran betikleri içerir. **Veri içermez**; şirket verisi taşıyan dosyalar
(veri gömülü şablon, önceki web verisi `W86.json`, paket çıktıları) kullanıcıya zip olarak teslim edilir, buraya konmaz.

## gts_web/ – GTS Dörtyol web panosu
1. `GTS_GIRDI_DIR=<girdi klasörü> node calistir.js <repo>/gts <paket.zip> O.json` – masaüstü veri hattını Node'da çalıştırır (iki model dosyası).
2. `python3 web_veri.py O.json W86.json W.json` – web verisine çevirir (`W86.json`: DB'den gelen, modelden bağımsız `ilc`, `stok_opt`, `term`).
3. `python3 web_derle.py sablon.html W.json <repo>/gts/ui/pano.js "Veri: Enerji Master DB paket NN · GG.AA.YYYY" cikti.html`
`sablon_verisiz.html`: yayındaki sayfanın veri bloğu boşaltılmış hâli. HTML / CSS değişiklikleri hem `gts/ui/index.html` hem şablona işlenir.

## ana_panel/ – Enerji Akış Haritası web sayfası
`S=<sql.js'in bulunduğu klasör> node ana_derle.js <yayındaki sayfa.html> <enerji_master_2026.db> <çıktı.html> "Veri: Enerji Master DB paket NN · GG.AA.YYYY"`
Yayındaki sayfanın `data` ve `tahsis` JSON bloklarını `pipeline.js` çıktısıyla değiştirir. `kars.js <eski.html> <yeni.html>` iki sürümün verisini karşılaştırır.

## test/ – sayfa testleri (Playwright)
`node sayfa.js <html>` duman testi; `nav_test`, `itt_alt_test`, `ak_test`, `rk_test`, `nk_test`, `tic_test`, `risk_test`, `ia_satir`: sayfa bazlı.
`ORNEK=40 node motor_test.js <repo>/gts/res <model.xlsx>`: hesap motorunu Excel'in kayıtlı değerleriyle karşılaştırır.

## e2e/ – masaüstü kabuk testleri (Electron + xvfb)
`xvfb-run -a node kabuk_test.js <electron> "GTS Dörtyol" <paket.zip> <ev klasörü> gts`; `itt_kabuk3.js <electron> <ev klasörü>` ITT sekmelerini gezer.

## Ceyhan Etki Alanı paneli
Veri: PDM betikleri `model.py → stage2.py → aggregate.py` (`out/data.json`); sayfada `const D = {...}` bloğu değiştirilir. Betikler kullanıcıdadır.
