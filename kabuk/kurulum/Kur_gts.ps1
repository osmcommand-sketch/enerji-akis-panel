# GTS Dörtyol kurulumu: uygulamayı kullanıcı klasörüne kopyalar, masaüstü ve Başlat menüsü kısayolu oluşturur (yönetici izni gerekmez)
$ErrorActionPreference = 'Stop'
$kaynak = Split-Path -Parent $MyInvocation.MyCommand.Path
$hedef = Join-Path $env:LOCALAPPDATA 'Programs\GTS Dortyol'
Get-Process -Name 'GTS Dortyol' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
if ($kaynak -ne $hedef) {
  if (Test-Path $hedef) { Remove-Item $hedef -Recurse -Force }
  New-Item -ItemType Directory -Path $hedef -Force | Out-Null
  Copy-Item -Path (Join-Path $kaynak '*') -Destination $hedef -Recurse -Force
}
$exe = Join-Path $hedef 'GTS Dortyol.exe'; $ico = Join-Path $hedef 'GTS Dortyol.ico'
$ws = New-Object -ComObject WScript.Shell
$yerler = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))
foreach ($y in $yerler) {
  $k = $ws.CreateShortcut((Join-Path $y 'GTS Dörtyol.lnk'))
  $k.TargetPath = $exe; $k.WorkingDirectory = $hedef; $k.IconLocation = "$ico,0"; $k.Description = 'GTS Dörtyol'
  $k.Save()
}
Write-Host ''
Write-Host 'GTS Dörtyol kuruldu:' $hedef -ForegroundColor Green
Write-Host 'Masaüstü ve Başlat menüsünde kısayol oluşturuldu. Verileriniz ve ayarlarınız korunur.'
Start-Process $exe
