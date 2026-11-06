# Enerji Akış – arayüz güncellemeleri

Enerji Akış masaüstü uygulaması (Windows) her açılışta bu repodan arayüzünü günceller; yeniden kurulum gerekmez.

- `manifest.json`: sürüm, notlar ve her dosyanın SHA-256 özeti. `manifest.sig`: Ed25519 imzası (uygulama, gömülü açık anahtarla doğrular; imza tutmazsa güncellemeyi almaz).
- `ui/`, `pipeline.js`, `res/`: arayüz, veri hattı ve harita kaynakları.
- Repoda veri yoktur; veritabanı kullanıcının bilgisayarında kalır ve uygulama tarafından yerel olarak okunur.

Hazırlayan: Software Development Team (SDT).

## GTS Dörtyol proje panosu (`gts/`)

GTS Dörtyol masaüstü uygulaması aynı yöntemle `gts/` klasöründen güncellenir: `gts/manifest.json` (Ed25519 imzalı `gts/manifest.sig`), `gts/ui/`, `gts/gts_pipeline.js`, `gts/pipeline.js`, `gts/res/`. Repoda veri yoktur; uygulama PDM teslimat paketini kullanıcının bilgisayarında okur.

## Masaüstü kabuğu (`kabuk/`)

Kabuk 2 (06.11.2026): Electron ana süreci (`ortak.js`), veri hattı iş parçacıkları (`is_gts.js`, `is_enerji.js`) ve paketleme (`paketle.sh`). Güncellemeler yeni Ed25519 anahtarıyla imzalanır (`yayinla.js`); kabuk 1 kurulumları yeni imzayı doğrulayamaz, bir kez yeniden kurulum gerekir. Özel anahtar repoda yoktur.
