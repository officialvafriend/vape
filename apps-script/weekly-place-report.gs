/**
 * 베이프렌드 자동화 오피스 — 주간 플레이스 순위 리포트
 *
 * 하는 일:
 *   날짜별로 흩어져 있는 플레이스 순위 시트(26.08.09, 26.08.10, ...)를 전부 읽어
 *   하나의 시계열로 합친 뒤, 지난주 대비 이탈·하락·정체를 자동 판정해서
 *   "이번 주에 손봐야 할 지점"만 뽑아 리포트 시트에 쓰고 메일로 보냅니다.
 *
 * 왜 필요하냐면:
 *   지금은 파일 8개를 눈으로 비교해야 부진 지점이 보입니다. 사람이 매주 할 일이 아니에요.
 *
 * 설치: apps-script/README.md 참고
 */

var CONFIG = {
  // 날짜별 순위 시트가 들어있는 드라이브 폴더
  RANK_FOLDER_ID: '1IO6QS_05lenXj7yDjEt-wjq7MJZ0JBkC',

  // 리포트를 쓸 시트. 비워두면 실행할 때 새로 만들고 ID를 로그에 찍어줍니다.
  REPORT_SHEET_ID: '',

  // 리포트 받을 메일. 비우면 메일 안 보냄.
  MAIL_TO: '',

  // 지난주로 볼 간격(일). 7 = 일주일 전과 비교.
  COMPARE_DAYS: 7,

  // 같은 순위가 이 횟수 이상 연속되면 '정체'로 봅니다.
  STALE_STREAK: 3
};

// 권외("5위 밖" 등)를 숫자로 다룰 때 쓰는 값
var OUT_OF_RANGE = 99;

/** 메뉴에서 수동 실행할 때 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('오피스')
    .addItem('주간 순위 리포트 생성', 'runWeeklyReport')
    .addToUi();
}

/** 트리거가 부르는 진입점 */
function runWeeklyReport() {
  var snapshots = loadSnapshots_(CONFIG.RANK_FOLDER_ID);
  if (snapshots.length < 2) {
    Logger.log('비교할 스냅샷이 2개 미만입니다. (' + snapshots.length + '개)');
    return;
  }

  var latest = snapshots[snapshots.length - 1];
  var base = pickBaseline_(snapshots, latest.date, CONFIG.COMPARE_DAYS);

  var rows = diff_(snapshots, base, latest);
  var sheetId = writeReport_(rows, base, latest, snapshots);

  if (CONFIG.MAIL_TO) sendMail_(rows, base, latest, sheetId);
  Logger.log('완료. 리포트 시트: ' + sheetId);
}

/* ---------------------------------------------------------------- 읽기 */

/**
 * 폴더의 스프레드시트를 전부 읽어 날짜순 스냅샷 배열로 만듭니다.
 * 파일명에서 yy.mm.dd 를 뽑아 날짜로 씁니다. (예: "26.08.09 플레이스순위")
 * 읽거나 해석할 수 없는 파일은 건너뛰고 로그에 남깁니다 — 조용히 빠뜨리지 않게.
 */
function loadSnapshots_(folderId) {
  var it = DriveApp.getFolderById(folderId).getFilesByType(MimeType.GOOGLE_SHEETS);
  var out = [];
  var skipped = [];

  while (it.hasNext()) {
    var f = it.next();
    var d = parseDateFromName_(f.getName());
    if (!d) { skipped.push(f.getName() + ' (날짜 못 읽음)'); continue; }

    try {
      var grid = readMatrix_(f.getId());
      if (!grid) { skipped.push(f.getName() + ' (표 형태 아님)'); continue; }
      out.push({ date: d, name: f.getName(), id: f.getId(), data: grid });
    } catch (e) {
      skipped.push(f.getName() + ' (' + e.message + ')');
    }
  }

  if (skipped.length) Logger.log('건너뛴 파일:\n - ' + skipped.join('\n - '));
  out.sort(function (a, b) { return a.date - b.date; });
  return out;
}

/** "26.08.09 플레이스순위" -> Date(2026-08-09) */
function parseDateFromName_(name) {
  var m = String(name).match(/(\d{2})[.\-\/](\d{2})[.\-\/](\d{2})/);
  if (!m) return null;
  var y = 2000 + Number(m[1]);
  var d = new Date(y, Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 첫 시트를 {store: {keyword: rank}} 로 바꿉니다.
 * 1행 = 키워드 헤더, A열 = 매장명.
 */
function readMatrix_(fileId) {
  var sh = SpreadsheetApp.openById(fileId).getSheets()[0];
  var v = sh.getDataRange().getValues();
  if (v.length < 2) return null;

  var header = v[0];
  var keywords = [];
  for (var c = 1; c < header.length; c++) {
    var k = String(header[c] || '').trim();
    if (k) keywords.push({ col: c, kw: k });
  }
  if (!keywords.length) return null;

  var stores = {};
  for (var r = 1; r < v.length; r++) {
    var store = String(v[r][0] || '').trim();
    if (!store) continue;
    var row = {};
    for (var i = 0; i < keywords.length; i++) {
      row[keywords[i].kw] = parseRank_(v[r][keywords[i].col]);
    }
    stores[store] = row;
  }
  return Object.keys(stores).length ? stores : null;
}

/**
 * 셀 값을 순위 숫자로.
 *   "1위" -> 1 / "5위 밖" -> 99(권외) / "-" 또는 빈칸 -> null(추적 안 함)
 */
function parseRank_(raw) {
  if (raw === null || raw === undefined) return null;
  var s = String(raw).trim();
  if (!s) return null;
  if (s === '-' || s === '–' || s === '—' || s === '\\-') return null;
  if (s.indexOf('밖') >= 0) return OUT_OF_RANGE;
  var m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

/* ---------------------------------------------------------------- 비교 */

/** latest 로부터 days 일 이전에서 가장 가까운 스냅샷 */
function pickBaseline_(snapshots, latestDate, days) {
  var target = new Date(latestDate.getTime() - days * 86400000);
  var best = snapshots[0];
  var bestGap = Math.abs(snapshots[0].date - target);
  for (var i = 0; i < snapshots.length; i++) {
    if (snapshots[i].date >= latestDate) continue;
    var gap = Math.abs(snapshots[i].date - target);
    if (gap < bestGap) { best = snapshots[i]; bestGap = gap; }
  }
  return best;
}

/** 지점×키워드마다 판정 한 줄씩 */
function diff_(snapshots, base, latest) {
  var pairs = collectPairs_([base, latest]);
  var rows = [];

  for (var i = 0; i < pairs.length; i++) {
    var store = pairs[i].store, kw = pairs[i].kw;
    var prev = at_(base, store, kw);
    var cur = at_(latest, store, kw);
    if (prev === null && cur === null) continue;

    var v = verdict_(prev, cur);

    if (v.tag === '유지' && cur !== 1) {
      // 몇 번째 같은 자리인지 — 오래 굳어 있으면 정체로 올림
      var streak = streakOf_(snapshots, store, kw, cur);
      if (streak >= CONFIG.STALE_STREAK) {
        v = { tag: '정체', sev: 3,
              action: '최근 ' + streak + '회 측정 내내 ' + cur + '위 — 글 안 쓰면 안 움직입니다' };
      }
    }

    // 시작과 끝만 보면 조용해 보여도 주중에 뺏겼다 되찾은 경우가 있습니다.
    // 자리싸움 중이라는 신호라 놓치면 안 됩니다.
    var swing = swingBetween_(snapshots, store, kw, base.date, latest.date);
    if (swing && (v.tag === '유지' || v.tag === '1위 유지')) {
      v = { tag: v.tag + '(흔들림)', sev: 3,
            action: '기간 중 ' + fmt_(swing.worst) + '까지 밀렸다 회복 — 자리싸움 중' };
    } else if (swing) {
      v.action += ' / 기간 중 ' + fmt_(swing.worst) + '까지 밀린 적 있음';
    }

    rows.push({
      store: store, kw: kw, prev: prev, cur: cur,
      tag: v.tag, sev: v.sev, action: v.action
    });
  }

  rows.sort(function (a, b) {
    if (a.sev !== b.sev) return a.sev - b.sev;
    return a.store < b.store ? -1 : 1;
  });
  return rows;
}

function collectPairs_(snaps) {
  var seen = {}, out = [];
  for (var s = 0; s < snaps.length; s++) {
    var data = snaps[s].data;
    for (var store in data) {
      for (var kw in data[store]) {
        var key = store + '||' + kw;
        if (seen[key]) continue;
        seen[key] = true;
        out.push({ store: store, kw: kw });
      }
    }
  }
  return out;
}

function at_(snap, store, kw) {
  if (!snap.data[store]) return null;
  var v = snap.data[store][kw];
  return v === undefined ? null : v;
}

/** 판정. sev 가 작을수록 급합니다. */
function verdict_(prev, cur) {
  if (prev !== null && cur === null) {
    return { tag: '이탈', sev: 1, action: '지난주 ' + fmt_(prev) + ' → 이번주 기록 없음. 제일 먼저 확인' };
  }
  if (cur === OUT_OF_RANGE) {
    return { tag: '권외', sev: 1, action: '순위권 밖. 이 키워드로 글 발행 필요' };
  }
  if (prev === null && cur !== null) {
    return { tag: '신규', sev: 5, action: '새로 잡힘 (' + fmt_(cur) + ')' };
  }
  if (cur > prev) {
    return { tag: '하락', sev: 2, action: fmt_(prev) + ' → ' + fmt_(cur) + ' (' + (cur - prev) + '계단 하락)' };
  }
  if (cur < prev) {
    return { tag: '상승', sev: 6, action: fmt_(prev) + ' → ' + fmt_(cur) };
  }
  if (cur === 1) return { tag: '1위 유지', sev: 7, action: '유지 중' };
  return { tag: '유지', sev: 4, action: fmt_(cur) + ' 유지' };
}

function fmt_(r) {
  if (r === null) return '없음';
  return r === OUT_OF_RANGE ? '권외' : r + '위';
}

/**
 * base~latest 사이에 순위가 흔들렸는지.
 * 시작·끝보다 나빴던 적이 있으면 그 최악값을 돌려줍니다.
 */
function swingBetween_(snapshots, store, kw, fromDate, toDate) {
  var worst = null;
  var ends = [];
  for (var i = 0; i < snapshots.length; i++) {
    var s = snapshots[i];
    if (s.date < fromDate || s.date > toDate) continue;
    var r = at_(snapshots[i], store, kw);
    if (r === null) continue;
    if (s.date.getTime() === fromDate.getTime() || s.date.getTime() === toDate.getTime()) ends.push(r);
    if (worst === null || r > worst) worst = r;
  }
  if (worst === null || !ends.length) return null;
  var endWorst = Math.max.apply(null, ends);
  return worst > endWorst ? { worst: worst } : null;
}

/** 최근부터 거슬러 올라가며 같은 순위가 몇 번 연속인지 */
function streakOf_(snapshots, store, kw, rank) {
  var n = 0;
  for (var i = snapshots.length - 1; i >= 0; i--) {
    if (at_(snapshots[i], store, kw) !== rank) break;
    n++;
  }
  return n;
}

/* ---------------------------------------------------------------- 출력 */

function writeReport_(rows, base, latest, snapshots) {
  var ss;
  if (CONFIG.REPORT_SHEET_ID) {
    ss = SpreadsheetApp.openById(CONFIG.REPORT_SHEET_ID);
  } else {
    ss = SpreadsheetApp.create('베이프렌드 주간 플레이스 리포트');
    Logger.log('리포트 시트를 새로 만들었습니다. CONFIG.REPORT_SHEET_ID 에 넣어두세요: ' + ss.getId());
  }

  var title = '주간리포트 ' + ymd_(latest.date);
  var old = ss.getSheetByName(title);
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet(title, 0);

  sh.getRange(1, 1).setValue(
    ymd_(base.date) + ' → ' + ymd_(latest.date) + ' 비교 · 스냅샷 ' + snapshots.length + '개'
  ).setFontWeight('bold');

  var head = ['지점', '키워드', '지난주', '이번주', '판정', '할 일'];
  sh.getRange(2, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setBackground('#1F3864').setFontColor('#ffffff');

  if (!rows.length) {
    sh.getRange(3, 1).setValue('변동 없음');
    return ss.getId();
  }

  var body = rows.map(function (r) {
    return [r.store, r.kw, fmt_(r.prev), fmt_(r.cur), r.tag, r.action];
  });
  sh.getRange(3, 1, body.length, head.length).setValues(body);

  // 급한 것부터 눈에 띄게
  for (var i = 0; i < rows.length; i++) {
    var bg = rows[i].sev === 1 ? '#ffd9d9'
           : rows[i].sev === 2 ? '#ffe9cc'
           : rows[i].sev === 3 ? '#fff6cc' : null;
    if (bg) sh.getRange(3 + i, 1, 1, head.length).setBackground(bg);
  }

  sh.setFrozenRows(2);
  for (var c = 1; c <= head.length; c++) sh.autoResizeColumn(c);
  return ss.getId();
}

function sendMail_(rows, base, latest, sheetId) {
  var urgent = rows.filter(function (r) { return r.sev <= 3; });
  var subject = '[베이프렌드] 주간 플레이스 리포트 ' + ymd_(latest.date) +
                ' — 확인 필요 ' + urgent.length + '건';

  var lines = [
    ymd_(base.date) + ' → ' + ymd_(latest.date) + ' 비교',
    ''
  ];

  if (!urgent.length) {
    lines.push('이번 주는 이탈·하락·정체 없습니다.');
  } else {
    urgent.forEach(function (r) {
      lines.push('[' + r.tag + '] ' + r.store + ' / ' + r.kw + ' — ' + r.action);
    });
  }

  lines.push('', '전체 리포트: https://docs.google.com/spreadsheets/d/' + sheetId + '/edit');
  MailApp.sendEmail(CONFIG.MAIL_TO, subject, lines.join('\n'));
}

function ymd_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
