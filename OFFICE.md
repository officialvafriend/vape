# 베이프렌드 자동화 오피스 만드는 법

`office.html` 이 그 오피스예요. 폰에서 열면 됩니다.

---

## 1. 지금 우리 구조 (이미 다 있음)

```
   구글 시트          Apps Script            정적 HTML
  (= 데이터베이스)  →  ( = 서버 / API )  →  (= 화면, GitHub Pages)
   기기 / 액상 /       /exec 주소 하나로      admin*.html  (직원용)
   일회용 3장          읽기 · 쓰기 다 함      index/liquid/disposable.html (손님용)
                                             warehouse / storage.html (창고)
                                             office.html  (← 새로 만든 허브)
```

서버도, 데이터베이스도, 배포도 **돈 안 들고 이미 돌아가는 중**입니다.
자동화 오피스에 필요한 건 새 기술이 아니라 **이 조각들을 한 화면에 모으고, 사람이 눈으로 하던 점검을 코드한테 시키는 것** 뿐이에요.

### API 사용법 (외울 필요 있는 건 이거 3줄)

```js
var SCRIPT_URL = "https://script.google.com/macros/s/AKfycby7.../exec";

// 읽기
fetch(SCRIPT_URL)                      // 기기
fetch(SCRIPT_URL + '?sheet=liquid')    // 액상
fetch(SCRIPT_URL + '?sheet=disposable')// 일회용

// 저장 / 삭제
fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify({ action:'save',   sheet:'liquid', item:{...} }) })
fetch(SCRIPT_URL, { method:'POST', body: JSON.stringify({ action:'delete', sheet:'liquid', id:'liq_123' }) })
```

---

## 2. 오피스가 해주는 일

| 기능 | 설명 |
|---|---|
| 등록 현황 | 기기 / 액상 / 일회용 몇 개인지 실시간 |
| **자동 점검** | 사진 빠진 항목, 보관 위치 빈 액상, 이름 중복 등을 매번 알아서 검사 |
| 바로가기 | 관리자 · 고객용 · 창고 · 원본 JSON 전부 한 곳에 |
| 토큰 관리 | 사진 업로드용 GitHub 토큰을 여기서 등록 / 삭제 |

> 시트를 못 불러왔을 때는 **"이상 없음"이 아니라 "확인 못함"** 으로 표시돼요.
> 데이터가 0건이라 문제도 0건인 걸 "깨끗하다"고 착각하면 그게 제일 위험하니까요.

---

## 3. 점검 항목 추가하는 법 ← 여기가 핵심

`office.html` 안의 `RULES` 배열에 **한 덩어리만 붙이면** 끝이에요.

```js
var RULES = [
  // ... 기존 규칙들 ...
  {
    name: '설명 없는 기기',              // 화면에 뜰 이름
    desc: '손님이 뭔지 몰라요',           // 밑에 깔릴 작은 글씨
    from: 'dev',                        // dev(기기) | liq(액상) | dis(일회용) | all(전체)
    find: function(list){               // 문제 있는 애들만 걸러내기
      return list.filter(function(d){ return !(d.desc||'').trim(); });
    },
    label: function(d){ return d.n; }   // 목록에 뭘 보여줄지
  }
];
```

바로 써먹을 만한 아이디어:

```js
// 가격 0원이거나 이상한 값
find: function(l){ return l.filter(function(d){ return !/[0-9]/.test(d.dp||''); }); }

// 같은 보관 위치에 너무 많이 몰린 액상 (창고 정리 신호)
find: function(l){
  var c={}; l.forEach(function(d){ if(d.loc) c[d.loc]=(c[d.loc]||0)+1; });
  return l.filter(function(d){ return c[d.loc] > 15; });
}

// 이벤트가 '없음'인 채로 오래 방치된 일회용
find: function(l){ return l.filter(function(d){ return (d.event||'')==='없음'; }); }
```

---

## 4. 진짜 "자동"으로 만들기 — Apps Script 트리거

지금 오피스는 **열어봐야** 알려줘요. 안 열어봐도 알려주게 하려면
Apps Script 에디터에서 함수 하나 만들고 **트리거(시간 기반)** 를 걸면 됩니다.

```js
// Apps Script 편집기에 추가
function 매일점검() {
  var sh = SpreadsheetApp.getActive().getSheetByName('liquid');
  var rows = sh.getDataRange().getValues();
  var head = rows.shift();
  var locCol = head.indexOf('loc');
  var nCol   = head.indexOf('n');

  var 빠진거 = rows.filter(function(r){ return !String(r[locCol]||'').trim(); })
                  .map(function(r){ return r[nCol]; });

  if (빠진거.length) {
    MailApp.sendEmail(
      'official.vafriend@gmail.com',
      '[베이프렌드] 보관 위치 빠진 액상 ' + 빠진거.length + '개',
      빠진거.join('\n')
    );
  }
}
```

거는 법: Apps Script 편집기 → 왼쪽 ⏰ **트리거** → 트리거 추가 →
함수 `매일점검`, 유형 **시간 기반**, **일 단위 타이머**, 오전 9~10시 → 저장.

이러면 아침마다 메일이 알아서 옵니다. 이게 자동화 오피스의 완성형이에요.

응용:
- `MailApp.sendEmail` 대신 **카톡 알림** 은 카카오 API 토큰이 필요해서 좀 복잡하고,
  가장 쉬운 건 메일 + 구글 캘린더 일정 자동 생성(`CalendarApp.createEvent`)입니다.
- 매주 시트를 통째로 복사해두는 **자동 백업** 도 트리거로 5줄이면 돼요:
  `SpreadsheetApp.getActive().copy('백업_' + new Date().toISOString().slice(0,10))`

---

## 5. 다음에 뭐 붙이면 좋냐면

1. **입출고 기록 시트** — 지금은 "무엇이 있다"만 있고 "얼마나 남았다"가 없어요.
   `stock` 시트 한 장 + 관리자에서 +/- 버튼 → 오피스에서 "재고 3개 이하" 자동 점검.
2. **판매 로그** — 뭐가 잘 나가는지 시트에 쌓으면 오피스에 "이번 주 top 5"를 띄울 수 있어요.
3. **admin 페이지 로그인** — 지금 관리자 페이지는 주소만 알면 누구나 들어옵니다.
   Apps Script 쪽에서 비밀번호(`?key=`)를 검사하게 하는 게 제일 간단해요.

## ⚠️ 지금 알아둘 보안 사항

- `admin*.html` 은 **아무나 주소만 알면 열 수 있고, 저장·삭제까지 됩니다.** (1번 우선순위)
- GitHub 토큰은 브라우저(localStorage)에만 있고 코드에는 안 박혀 있어요 — 이건 잘 돼 있습니다.
  공용 PC에서 쓰면 오피스 화면 **설정 → 삭제** 를 꼭 눌러주세요.
