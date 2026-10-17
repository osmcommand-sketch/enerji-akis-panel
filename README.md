# Enerji Akış – arayüz güncellemeleri

Enerji Akış masaüstü uygulaması (Windows) her açılışta bu repodan arayüzünü günceller; yeniden kurulum gerekmez.

- `manifest.json`: sürüm, notlar ve her dosyanın SHA-256 özeti. `manifest.sig`: Ed25519 imzası (uygulama, gömülü açık anahtarla doğrular; imza tutmazsa güncellemeyi almaz).
- `ui/`, `pipeline.js`, `res/`: arayüz, veri hattı ve harita kaynakları.
- Repoda veri yoktur; veritabanı kullanıcının bilgisayarında kalır ve uygulama tarafından yerel olarak okunur.

Hazırlayan: Software Development Team (SDT).
