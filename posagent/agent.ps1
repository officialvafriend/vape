# 베이프렌드 상담패드 → 포스 자동 입력 (11/16)
# 상담패드 [포스로 보내기] 주문을 슈파베이스(공기계 QR과 같은 주문 표)에서 받아, 포스 화면 오른쪽 아래 작은 창에 띄움.
# 직원이 [포스에 넣기]를 누르면 오케이포스 창을 앞으로 가져와 바코드를 스캐너처럼(숫자 + Enter) 대신 입력.
# 승인된 기기만 그 지점 주문을 읽음. 설정: 같은 폴더 설정.json
# 자동 업데이트: 5분마다 posagent/ver.txt 확인, 다르면 창을 닫고 실행.cmd가 update.ps1로 새 판을 받아 다시 켬
param([switch]$Test)
$ErrorActionPreference = "Stop"
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}   # 옛 윈도우 TLS 1.2
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
Add-Type @"
using System; using System.Runtime.InteropServices;
public class W32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
$HERE = Split-Path -Parent $MyInvocation.MyCommand.Path
$VER = "1116d"
$WEB = "https://officialvafriend.github.io/vape/posagent/"
$SB = "https://bjjlmnkyhedtutogzliq.supabase.co/rest/v1/rpc/"; $KEY = "sb_publishable_i8rfcm_zAnwV75joN58FCw_8tHgFUKr"
$cfgPath = Join-Path $HERE "설정.json"
$cfg = New-Object psobject
try { if (Test-Path $cfgPath) { $cfg = [IO.File]::ReadAllText($cfgPath, [Text.Encoding]::UTF8) | ConvertFrom-Json } } catch {}
function CfgGet($k, $d) { if ($cfg.PSObject.Properties[$k] -and "$($cfg.$k)" -ne "") { $cfg.$k } else { $d } }
$BRANCH = CfgGet "지점" "본점"
$TITLE = CfgGet "포스창이름" "OKPOS|오케이포스|포스"
$GAP = [int](CfgGet "입력간격ms" 150)
$SEP = CfgGet "구분" "{ENTER}"
$devPath = Join-Path $env:APPDATA "vf-posagent-dev.txt"
if (Test-Path $devPath) { $DEV = (Get-Content $devPath -Raw).Trim() } else { $DEV = -join ((1..18) | ForEach-Object { "{0:x2}" -f (Get-Random -Max 256) }); Set-Content $devPath $DEV }
$SHORT = $DEV.Substring(0, 6).ToUpper()
function Web { $w = New-Object Net.WebClient; $w.Encoding = [Text.Encoding]::UTF8; $w }
function Rpc($fn, $body) {
  $w = Web; $w.Headers.Add("apikey", $KEY); $w.Headers.Add("Authorization", "Bearer $KEY"); $w.Headers.Add("Content-Type", "application/json; charset=utf-8")
  $r = $w.UploadString($SB + $fn, "POST", ($body | ConvertTo-Json -Compress)); if ($r) { $r | ConvertFrom-Json }
}
function Won($n) { "{0:N0}원" -f [int]$n }

# ── 작은 창 ──
$W = 300
$f = New-Object Windows.Forms.Form
$f.Text = "포스 입력"; $f.TopMost = $true; $f.FormBorderStyle = "FixedToolWindow"; $f.ShowInTaskbar = $true
$f.ClientSize = New-Object Drawing.Size($W, 70); $f.StartPosition = "Manual"; $f.BackColor = [Drawing.Color]::White
$wa = [Windows.Forms.Screen]::PrimaryScreen.WorkingArea
function Place { $f.Left = $wa.Right - $f.Width - 6; $f.Top = $wa.Bottom - $f.Height - 6 }
$font = { param($s, $b) New-Object Drawing.Font("Malgun Gothic", $s, $(if ($b) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular })) }
$lbTop = New-Object Windows.Forms.Label; $lbTop.SetBounds(8, 4, ($W - 16), 16); $lbTop.Font = & $font 8 $false; $lbTop.ForeColor = [Drawing.Color]::Gray
$lbMain = New-Object Windows.Forms.Label; $lbMain.SetBounds(8, 22, ($W - 16), 44); $lbMain.Font = & $font 9.5 $true
$btnGo = New-Object Windows.Forms.Button; $btnGo.Font = & $font 11 $true; $btnGo.BackColor = [Drawing.Color]::FromArgb(216, 31, 42); $btnGo.ForeColor = [Drawing.Color]::White; $btnGo.FlatStyle = "Flat"
$btnNext = New-Object Windows.Forms.Button; $btnNext.Font = & $font 8 $false
$btnDone = New-Object Windows.Forms.Button; $btnDone.Font = & $font 8 $false; $btnDone.Text = "이 주문 지우기"
$f.Controls.AddRange(@($lbTop, $lbMain, $btnGo, $btnNext, $btnDone))
function Small($txt) { $lbMain.Text = $txt; $lbMain.Height = 44; $btnGo.Visible = $false; $btnNext.Visible = $false; $btnDone.Visible = $false; $f.ClientSize = New-Object Drawing.Size($W, 70); Place }

$script:orders = @(); $script:idx = 0; $script:svcLeft = $null; $script:state = "boot"; $script:busy = $false; $script:errMsg = ""; $script:tick = 0
function Cur { if ($script:orders.Count) { $script:orders[[Math]::Min($script:idx, $script:orders.Count - 1)] } }
function Draw {
  $lbTop.Text = "$BRANCH  기기 $SHORT  v$VER"
  if ($script:state -eq "wait") { Small "승인 기다리는 중`n기기 코드 $SHORT 를 관리자에게 알려 주세요"; return }
  if ($script:state -eq "err") { Small "연결 안 됨, 다시 시도 중`n$($script:errMsg)"; return }
  $o = Cur
  if (-not $o) { Small "주문 기다리는 중"; return }
  $who = ""; if ($o.cust) { $p = "$($o.cust.ph)"; if ($p.Length -ge 4) { $who = " $($o.cust.nm) ****$($p.Substring($p.Length - 4))" } }
  $sv = @($o.svc).Count
  if ($script:svcLeft -ne $null -and $script:svcLeft.id -eq $o.id) {
    $lbMain.Text = "결제 상품 넣었어요. 서비스 $sv 개 남음`n넣은 뒤 마지막 $sv 개를 서비스로 바꿔 주세요"
    $btnGo.Text = "서비스 $sv 개 넣기"
  } else {
    $lbMain.Text = "$([int]$o.id % 1000)번$who`n$($o.summary)`n합계 $(Won $o.total)" + $(if ($sv) { " (서비스 $sv 개 따로)" } else { "" })
    $btnGo.Text = "포스에 넣기 ($(@($o.codes).Count)개)"
  }
  $lbMain.Height = 62; $btnGo.SetBounds(8, 88, ($W - 16), 40); $btnGo.Visible = $true
  $half = [int](($W - 22) / 2)
  if ($script:orders.Count -gt 1) { $btnNext.Text = "다음 ($($script:idx + 1)/$($script:orders.Count))"; $btnNext.SetBounds(8, 132, $half, 26); $btnNext.Visible = $true; $btnDone.SetBounds((14 + $half), 132, $half, 26) }
  else { $btnNext.Visible = $false; $btnDone.SetBounds(8, 132, ($W - 16), 26) }
  $btnDone.Visible = $true; $f.ClientSize = New-Object Drawing.Size($W, 164); Place
}
function PosWindow { Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match $TITLE -and $_.Id -ne $PID } | Select-Object -First 1 }
function TypeCodes($codes) {
  $p = PosWindow
  if (-not $p) { [Windows.Forms.MessageBox]::Show("오케이포스 판매 화면을 찾지 못했어요.`n포스 판매 화면을 열어 주세요.", "포스 입력") | Out-Null; return $false }
  [W32]::ShowWindow($p.MainWindowHandle, 9) | Out-Null; [W32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Start-Sleep -Milliseconds 400
  $i = 0
  foreach ($c in $codes) {
    if (-not ("$c" -match '^[0-9]{4,20}$')) { continue }   # 숫자 바코드만
    if ([W32]::GetForegroundWindow() -ne $p.MainWindowHandle) { [Windows.Forms.MessageBox]::Show("포스 창이 바뀌어서 멈췄어요. $i 개 넣었어요.", "포스 입력") | Out-Null; return $false }
    [Windows.Forms.SendKeys]::SendWait("$c$SEP"); $i++; $lbMain.Text = "넣는 중 $i / $(@($codes).Count)`n마우스, 키보드 잠시 그대로"; $f.Refresh(); Start-Sleep -Milliseconds $GAP
  }
  return $true
}
function Finish($o, $msg) { if (-not $Test) { Rpc "qr_done" @{ p_dev = $DEV; p_id = $o.id } | Out-Null }; $script:svcLeft = $null; $script:orders = @($script:orders | Where-Object { $_.id -ne $o.id }); $script:idx = 0; [Windows.Forms.MessageBox]::Show($msg, "포스 입력") | Out-Null }
$btnGo.Add_Click({
  if ($script:busy) { return }; $o = Cur; if (-not $o) { return }; $script:busy = $true
  try {
    if ($script:svcLeft -ne $null -and $script:svcLeft.id -eq $o.id) {
      if (TypeCodes @($o.svc)) { Finish $o "다 넣었어요. 마지막 $(@($o.svc).Count)개를 서비스로 바꾸고, 포스 금액이 $(Won $o.total) 인지 확인해 주세요." }
    } else {
      $ok = [Windows.Forms.MessageBox]::Show("포스 판매 화면이 비어 있나요?`n다른 손님 결제 중이면 [아니요]를 누르고 먼저 끝내 주세요.", "포스 입력", "YesNo")
      if ($ok -eq "Yes" -and (TypeCodes @($o.codes))) {
        if (@($o.svc).Count) { $script:svcLeft = $o } else { Finish $o "다 넣었어요. 포스 금액이 $(Won $o.total) 인지 확인해 주세요." }
      }
    }
  } catch { [Windows.Forms.MessageBox]::Show("넣다가 멈췄어요: $($_.Exception.Message)", "포스 입력") | Out-Null }
  $script:busy = $false; $f.Activate(); Draw
})
$btnNext.Add_Click({ if ($script:orders.Count) { $script:idx = ($script:idx + 1) % $script:orders.Count; $script:svcLeft = $null; Draw } })
$btnDone.Add_Click({ $o = Cur; if (-not $o) { return }
  if ([Windows.Forms.MessageBox]::Show("$([int]$o.id % 1000)번 주문을 지울까요? (포스에 안 넣고 끝내기)", "포스 입력", "YesNo") -ne "Yes") { return }
  if (-not $Test) { try { Rpc "qr_done" @{ p_dev = $DEV; p_id = $o.id } | Out-Null } catch {} }
  $script:orders = @($script:orders | Where-Object { $_.id -ne $o.id }); $script:idx = 0; $script:svcLeft = $null; Draw })

# ── 2초마다 새 주문, 5분마다 새 판 확인 ──
$t = New-Object Windows.Forms.Timer; $t.Interval = 2000
$t.Add_Tick({
  if ($script:busy) { return }
  $script:tick++
  if (-not $Test -and $script:tick % 150 -eq 0 -and -not $script:orders.Count) {
    try { $v = (Web).DownloadString($WEB + "ver.txt?" + [DateTime]::Now.Ticks).Trim(); if ($v -and $v -ne $VER) { $script:updating = $true; $t.Stop(); $f.Close(); return } } catch {}
  }
  if ($Test) { if ($script:state -eq "boot") { $script:state = "ok"; $script:orders = @([pscustomobject]@{ id = 1042; codes = @("2999901866007", "2999901866007", "2999901863006"); svc = @("2999901868001"); summary = "말론S 블랙, 빌런 자두 x2, 메가킥 샤인 외"; total = 147000; cust = [pscustomobject]@{ nm = "클로드98"; ph = "01012341234" } }); Draw
      if ($env:VF_SNAP) { $bm = New-Object Drawing.Bitmap($f.Width, $f.Height); $f.DrawToBitmap($bm, (New-Object Drawing.Rectangle(0, 0, $f.Width, $f.Height))); $bm.Save($env:VF_SNAP); $f.Close() } }; return }
  try {
    $h = Rpc "qr_hello" @{ p_dev = $DEV; p_branch = $BRANCH; p_label = "포스PC $env:COMPUTERNAME" }
    if (-not ("$h".StartsWith("ok:"))) { if ($script:state -ne "wait") { $script:state = "wait"; Draw }; return }
    $list = @(Rpc "qr_pending" @{ p_dev = $DEV } | ForEach-Object { $_ })
    $before = ($script:orders | ForEach-Object { $_.id }) -join ","; $script:orders = $list; $after = ($list | ForEach-Object { $_.id }) -join ","
    $was = $script:state; $script:state = "ok"
    if ($before -ne $after -or $was -ne "ok") { if ($script:idx -ge $list.Count) { $script:idx = 0 }; Draw; if ($list.Count -and $before -ne $after) { [System.Media.SystemSounds]::Asterisk.Play(); $f.Activate() } }
  } catch { $m = "$($_.Exception.Message)"; if ($m.Length -gt 60) { $m = $m.Substring(0, 60) }; if ($script:state -ne "err" -or $script:errMsg -ne $m) { $script:errMsg = $m; $script:state = "err"; Draw } }
})
$script:updating = $false
$t.Start(); Draw
[Windows.Forms.Application]::Run($f)
if (-not $script:updating) { exit 9 }   # 직원이 창을 닫으면 진짜 끔 (실행.cmd가 다시 안 켬)
