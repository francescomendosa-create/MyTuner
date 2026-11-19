$ErrorActionPreference = 'Stop'
$outDir = Join-Path $PSScriptRoot '.ssl'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$store = Join-Path $outDir 'truststore.jks'
$keytool = 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe'
$cacerts = 'C:\Program Files\Android\Android Studio\jbr\lib\security\cacerts'
Copy-Item -Force $cacerts $store
$script:i = 0

function Import-HostChain {
  param([string]$Hostname)
  $tcp = New-Object System.Net.Sockets.TcpClient($Hostname, 443)
  $ssl = New-Object System.Net.Security.SslStream($tcp.GetStream(), $false, { param($s, $c, $ch, $e) $true })
  $ssl.AuthenticateAsClient($Hostname)
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($ssl.RemoteCertificate)
  $chain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
  [void]$chain.Build($cert)
  foreach ($el in $chain.ChainElements) {
    $cer = Join-Path $outDir ("cert-{0}.cer" -f $script:i)
    [IO.File]::WriteAllBytes($cer, $el.Certificate.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert))
    Write-Output ("CERT {0} {1}: {2}" -f $script:i, $Hostname, $el.Certificate.Subject)
    & $keytool -importcert -noprompt -alias ("chain-{0}" -f $script:i) -file $cer -keystore $store -storepass mytuner | Out-Null
    $script:i++
  }
  $ssl.Close()
  $tcp.Close()
}

Import-HostChain -Hostname 'dl.google.com'
Import-HostChain -Hostname 'repo.maven.apache.org'
Import-HostChain -Hostname 'maven.google.com'
Write-Output ("STORE=" + $store)
& $keytool -list -keystore $store -storepass mytuner | Select-Object -First 30
