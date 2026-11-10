# Enerji Akış kurulumu: uygulamayı kullanıcı klasörüne kopyalar, masaüstü ve Başlat menüsü kısayolu oluşturur (yönetici izni gerekmez)
$ErrorActionPreference = 'Stop'
$kaynak = Split-Path -Parent $MyInvocation.MyCommand.Path
$hedef = Join-Path $env:LOCALAPPDATA 'Programs\Enerji Akis'
Get-Process -Name 'Enerji Akis' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500
if ($kaynak -ne $hedef) {
  if (Test-Path $hedef) { Remove-Item $hedef -Recurse -Force }
  New-Item -ItemType Directory -Path $hedef -Force | Out-Null
  Copy-Item -Path (Join-Path $kaynak '*') -Destination $hedef -Recurse -Force
}
$exe = Join-Path $hedef 'Enerji Akis.exe'; $ico = Join-Path $hedef 'Enerji Akis.ico'
$ws = New-Object -ComObject WScript.Shell
$yerler = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'))
foreach ($y in $yerler) {
  $k = $ws.CreateShortcut((Join-Path $y 'Enerji Akış.lnk'))
  $k.TargetPath = $exe; $k.WorkingDirectory = $hedef; $k.IconLocation = "$ico,0"; $k.Description = 'Enerji Akış'
  $k.Save()
}
Write-Host ''
Write-Host 'Enerji Akış kuruldu:' $hedef -ForegroundColor Green
Write-Host 'Masaüstü ve Başlat menüsünde kısayol oluşturuldu. Verileriniz ve ayarlarınız korunur.'
Start-Process $exe
