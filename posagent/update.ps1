# 새 판 받기: 사이트의 agent.ps1이 정상 파일이면 바꿔 끼움. 인터넷이 안 되면 그냥 지금 판으로 켬
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
try {
  $w = New-Object Net.WebClient
  $b = $w.DownloadData("https://officialvafriend.github.io/vape/posagent/agent.ps1?" + [DateTime]::Now.Ticks)
  $s = [Text.Encoding]::UTF8.GetString($b)
  if ($b.Length -gt 3000 -and $s.Contains('$VER = "') -and $s.Contains('Application]::Run')) {
    $cur = Join-Path $here "agent.ps1"
    $old = if (Test-Path $cur) { [IO.File]::ReadAllBytes($cur) } else { @() }
    if ([Convert]::ToBase64String($old) -ne [Convert]::ToBase64String($b)) { [IO.File]::WriteAllBytes($cur, $b) }
  }
} catch {}