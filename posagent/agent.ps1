# 베이프렌드 상담패드 → 포스 자동 입력 (11/16)
# 상담패드 [포스로 보내기] 주문을 슈파베이스(공기계 QR과 같은 주문 표)에서 받아, 포스 화면 오른쪽 아래 작은 창에 띄움.
# 직원이 [포스에 넣기]를 누르면 오케이포스 창을 앞으로 가져와 바코드를 스캐너처럼(숫자 + Enter) 대신 입력.
# 승인된 기기만 그 지점 주문을 읽음. 설정: 같은 폴더 설정.json
# 자동 업데이트: 5분마다 posagent/ver.txt 확인, 다르면 exit 8, 실행.cmd가 update.ps1로 새 판을 받아 다시 켬. 그 밖의 끝남(창 X, 오류)은 다시 안 켬
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
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint MapVirtualKey(uint code, uint type);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  public static void Key(byte vk, int ms) {
    byte sc = (byte)MapVirtualKey(vk, 0);
    keybd_event(vk, sc, 0, UIntPtr.Zero); System.Threading.Thread.Sleep(ms);
    keybd_event(vk, sc, 2, UIntPtr.Zero); System.Threading.Thread.Sleep(ms);
  }
  public static void Scan(string code, int ms) {
    foreach (char ch in code) { if (ch >= '0' && ch <= '9') Key((byte)ch, ms); }
    Key(0x0D, ms);
  }
}
"@
$HERE = Split-Path -Parent $MyInvocation.MyCommand.Path
$VER = "1116j"
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
$KEYMS = [int](CfgGet "키간격ms" 15)
$SVCKEY = [string](CfgGet "서비스키" "")   # 예: F5. 비어 있으면 서비스는 손으로 바꿈
$SVCVK = 0; if ($SVCKEY -match '^F([1-9]|1[0-2])$') { $SVCVK = 0x6F + [int]$Matches[1] }
$script:posHwnd = [IntPtr]::Zero   # 무선 바코드처럼 진짜 키보드 신호로 한 글자씩
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
$wa0 = [Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$W = [Math]::Min(300, [int]($wa0.Width * 0.22))
$f = New-Object Windows.Forms.Form
$f.Text = "포스 입력"; $f.TopMost = $true; $f.FormBorderStyle = "FixedToolWindow"; $f.ShowInTaskbar = $true
$f.ClientSize = New-Object Drawing.Size($W, 70); $f.StartPosition = "Manual"; $f.BackColor = [Drawing.Color]::White
$wa = [Windows.Forms.Screen]::PrimaryScreen.WorkingArea
function Place { $f.Left = $wa.Right - $f.Width - 6; $f.Top = $wa.Top + [int]($wa.Height * 0.09) }   # 포스 결제 버튼(오른쪽 아래)을 안 가리게 오른쪽 위
$font = { param($s, $b) New-Object Drawing.Font("Malgun Gothic", $s, $(if ($b) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular })) }
$lbTop = New-Object Windows.Forms.Label; $lbTop.SetBounds(8, 4, ($W - 16), 16); $lbTop.Font = & $font 8 $false; $lbTop.ForeColor = [Drawing.Color]::Gray
$lbMain = New-Object Windows.Forms.Label; $lbMain.SetBounds(8, 22, ($W - 16), 44); $lbMain.Font = & $font 9.5 $true
$btnGo = New-Object Windows.Forms.Button; $btnGo.Font = & $font 11 $true; $btnGo.BackColor = [Drawing.Color]::FromArgb(216, 31, 42); $btnGo.ForeColor = [Drawing.Color]::White; $btnGo.FlatStyle = "Flat"
$btnNext = New-Object Windows.Forms.Button; $btnNext.Font = & $font 8 $false
$btnDone = New-Object Windows.Forms.Button; $btnDone.Font = & $font 8 $false; $btnDone.Text = "이 주문 지우기"
$btnMini = New-Object Windows.Forms.Button; $btnMini.Font = & $font 8 $false; $btnMini.Text = "접기"; $btnMini.FlatStyle = "Flat"
$f.Controls.AddRange(@($lbTop, $lbMain, $btnGo, $btnNext, $btnDone, $btnMini))
$script:mini = $false
function MiniView {
  $n = @($script:orders).Count
  $lbTop.Text = $(if ($n) { "주문 $n 개 있어요, 펼치기" } else { "포스 입력, 펼치기" }); $lbTop.SetBounds(8, 4, ($W - 16), 18); $lbTop.ForeColor = $(if ($n) { [Drawing.Color]::FromArgb(216, 31, 42) } else { [Drawing.Color]::Gray })
  $lbMain.Visible = $false; $btnGo.Visible = $false; $btnNext.Visible = $false; $btnDone.Visible = $false; $btnMini.Visible = $false
  $f.ClientSize = New-Object Drawing.Size($W, 26); Place
}
$btnMini.Add_Click({ $script:mini = $true; Draw })
$lbTop.Add_Click({ if ($script:mini) { $script:mini = $false; Draw } })
$f.Add_FormClosing({ param($s2, $e2)
  if ($script:updating -or $env:VF_SNAP) { return }
  $r = [Windows.Forms.MessageBox]::Show("포스 입력을 끌까요?`n`n[예] 끄기 (주문이 와도 안 떠요)`n[아니요] 작게 접기 (주문 오면 다시 펼쳐져요)", "포스 입력", "YesNo")
  if ($r -ne "Yes") { $e2.Cancel = $true; $script:mini = $true; Draw }
})
function Small($txt) { $lbMain.Visible = $true; $btnMini.Visible = $false; $lbMain.Text = $txt; $lbMain.Height = 44; $btnGo.Visible = $false; $btnNext.Visible = $false; $btnDone.Visible = $false; $f.ClientSize = New-Object Drawing.Size($W, 70); Place }

$script:orders = @(); $script:idx = 0; $script:svcLeft = $null; $script:state = "boot"; $script:busy = $false; $script:errMsg = ""; $script:tick = 0
function Cur { if ($script:orders.Count) { $script:orders[[Math]::Min($script:idx, $script:orders.Count - 1)] } }
function Draw {
  if ($script:mini) { MiniView; return }
  $lbTop.Text = "$BRANCH  기기 $SHORT  v$VER"; $lbTop.ForeColor = [Drawing.Color]::Gray; $lbTop.SetBounds(8, 4, ($W - 60), 16)
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
    $btnGo.Text = "포스에 넣기 ($(@($o.codes).Count + $sv)개)"
  }
  $lbMain.Visible = $true; $lbMain.Height = 62; $btnGo.SetBounds(8, 88, ($W - 16), 40); $btnGo.Visible = $true; $btnMini.SetBounds(($W - 50), 2, 44, 20); $btnMini.Visible = $true
  $half = [int](($W - 22) / 2)
  if ($script:orders.Count -gt 1) { $btnNext.Text = "다음 ($($script:idx + 1)/$($script:orders.Count))"; $btnNext.SetBounds(8, 132, $half, 26); $btnNext.Visible = $true; $btnDone.SetBounds((14 + $half), 132, $half, 26) }
  else { $btnNext.Visible = $false; $btnDone.SetBounds(8, 132, ($W - 16), 26) }
  $btnDone.Visible = $true; $f.ClientSize = New-Object Drawing.Size($W, 164); Place
}
$SKIP = 'explorer|cmd|powershell|pwsh|conhost|notepad|chrome|msedge|whale|firefox|iexplore|kakaotalk|code|cursor'
function PosWindow { Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.Id -ne $PID -and $_.ProcessName -notmatch "^($SKIP)$" -and ($_.MainWindowTitle -match $TITLE -or $_.ProcessName -match 'okpos') } | Sort-Object { if ($_.ProcessName -match 'okpos') { 0 } else { 1 } } | Select-Object -First 1 }
function IsLocked($p) { try { $null = $p.Handle; $false } catch { $true } }   # 포스가 관리자 권한이면 손이 안 닿음
function FgName($h) { try { $pid2 = [uint32]0; [W32]::GetWindowThreadProcessId($h, [ref]$pid2) | Out-Null; (Get-Process -Id $pid2).ProcessName } catch { "?" } }
# 무선 바코드처럼: 3초 세는 동안 직원이 포스 판매 화면을 누르고, 그때 눌려 있는 화면에 그대로 침
function TypeCodes($codes, $nsvc) {
  $fg = [IntPtr]::Zero
  if ($script:posHwnd -ne [IntPtr]::Zero -and [W32]::IsWindow($script:posHwnd)) {
    if ([W32]::IsIconic($script:posHwnd)) { [W32]::ShowWindow($script:posHwnd, 9) | Out-Null }
    [W32]::SetForegroundWindow($script:posHwnd) | Out-Null; Start-Sleep -Milliseconds 400
    if ([W32]::GetForegroundWindow() -eq $script:posHwnd) { $fg = $script:posHwnd }
  }
  if ($fg -eq [IntPtr]::Zero) {
    for ($k = 3; $k -ge 1; $k--) { $lbMain.Text = "$k 초 뒤에 넣어요`n지금 포스 숫자 칸을 한 번 눌러 주세요"; $f.Refresh(); $e = [DateTime]::Now.AddSeconds(1); while ([DateTime]::Now -lt $e) { [Windows.Forms.Application]::DoEvents(); Start-Sleep -Milliseconds 30 } }
    $fg = [W32]::GetForegroundWindow()
    if ($fg -eq $f.Handle) { [Windows.Forms.MessageBox]::Show("포스 화면을 안 눌렀어요.`n다시 [포스에 넣기]를 누르고, 3초 안에 포스 숫자 칸을 눌러 주세요.", "포스 입력") | Out-Null; return $false }
  }
  $script:fgName = FgName $fg
  if ($script:fgName -match "^($SKIP)$") { $script:posHwnd = [IntPtr]::Zero; [Windows.Forms.MessageBox]::Show("포스가 아닌 창($($script:fgName))이 눌려 있어서 멈췄어요.`n다시 [포스에 넣기]를 누르고, 3초 안에 포스 숫자 칸을 눌러 주세요.", "포스 입력") | Out-Null; return $false }
  $i = 0; $n = @($codes).Count; $firstSvc = $n - $nsvc
  foreach ($c in $codes) {
    if (-not ("$c" -match '^[0-9]{4,20}$')) { $i++; continue }   # 숫자 바코드만
    if ([W32]::GetForegroundWindow() -ne $fg) { [Windows.Forms.MessageBox]::Show("화면이 바뀌어서 멈췄어요. $i 개 넣었어요.", "포스 입력") | Out-Null; return $false }
    [W32]::Scan("$c", $KEYMS)
    if ($SVCVK -and $i -ge $firstSvc) { Start-Sleep -Milliseconds 250; [W32]::Key([byte]$SVCVK, $KEYMS) }
    $i++; $lbMain.Text = "넣는 중 $i / $n`n마우스, 키보드 잠시 그대로"; $f.Refresh(); Start-Sleep -Milliseconds $GAP
  }
  $script:posHwnd = $fg   # 다음 주문부터는 이 화면에 바로
  return $true
}
function Finish($o, $msg) { if (-not $Test) { Rpc "qr_done" @{ p_dev = $DEV; p_id = $o.id } | Out-Null }; $script:svcLeft = $null; $script:orders = @($script:orders | Where-Object { $_.id -ne $o.id }); $script:idx = 0; [Windows.Forms.MessageBox]::Show($msg, "포스 입력") | Out-Null }
$btnGo.Add_Click({
  if ($script:busy) { return }; $o = Cur; if (-not $o) { return }; $script:busy = $true
  try {
    $ok = [Windows.Forms.MessageBox]::Show("포스 판매 화면이 비어 있나요?`n다른 손님 결제 중이면 [아니요]를 누르고 먼저 끝내 주세요.`n`n[예]를 누르면 바로 넣어요. (처음엔 3초 안에 포스 숫자 칸을 한 번 눌러 주세요)", "포스 입력", "YesNo")
    $all = @(@($o.codes) + @($o.svc) | Where-Object { $_ })
    $nsv = @($o.svc | Where-Object { $_ }).Count
    if ($ok -eq "Yes" -and (TypeCodes $all $nsv)) {
      $sv = @($o.svc).Count
      Finish $o ("다 넣었어요 ($(@($all).Count)개, 넣은 곳: $($script:fgName))." + $(if ($sv -and -not $SVCVK) { "`n마지막 $sv 개를 서비스로 바꿔 주세요." } elseif ($sv) { "`n서비스 $sv 개도 처리했어요. 맞는지 봐 주세요." } else { "" }) + "`n포스 금액이 $(Won $o.total) 인지 확인해 주세요.")
    }
  } catch { [Windows.Forms.MessageBox]::Show("넣다가 멈췄어요: $($_.Exception.Message)", "포스 입력") | Out-Null }
  $script:busy = $false; Draw
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
    if ($before -ne $after -or $was -ne "ok") { if ($script:idx -ge $list.Count) { $script:idx = 0 }; Draw; if ($list.Count -and $before -ne $after) { $script:mini = $false; Draw; [System.Media.SystemSounds]::Asterisk.Play() } }
  } catch { $m = "$($_.Exception.Message)"; if ($m.Length -gt 60) { $m = $m.Substring(0, 60) }; if ($script:state -ne "err" -or $script:errMsg -ne $m) { $script:errMsg = $m; $script:state = "err"; Draw } }
})
$script:updating = $false
$t.Start(); Draw
[Windows.Forms.Application]::Run($f)
if ($script:updating) { exit 8 }   # 새 판 받으러 갈 때만 8 (실행.cmd가 그때만 다시 켬)
exit 9   # 창 닫기, 오류 모두 그냥 끝
