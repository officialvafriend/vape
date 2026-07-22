# PPOM 스티키 구매 서랍장

`ppom-sticky-purchase-drawer.php`를 Code Snippets 플러그인에 "PHP Snippet" /
"Only run on site front-end"로 등록하세요.

## 사용법

1. **상품 페이지에서만 노출** — `is_product()`로 감싸져 있어서 블로그/장바구니/체크아웃 등
   다른 페이지에는 트리거 바와 오버레이가 아예 출력되지 않습니다. PPOM 옵션(select)이 없는
   상품 페이지에서도 자동으로 숨겨집니다.

2. **상품별 필수 선택 수량** — 상품 편집 화면의 "일반" 탭에 "서랍장 필수 선택 수량" 입력란이
   추가됩니다. 이벤트 액상 상품마다 다른 병 수(예: 3+1=4, 2+3=5)를 넣어두면 그 수량 이상
   선택해야 장바구니/구매 버튼이 활성화됩니다. 비워두면 1병 이상 선택 시 바로 활성화됩니다.

3. **UI/UX 개선점**
   - 실시간 진행률 바 + 안내 문구("N병 더 선택하면 구매할 수 있어요")
   - 드래그 핸들을 아래로 끌거나 닫기(X) 버튼, 오버레이 탭, ESC 키로 서랍장 닫기
   - iOS Safari 안전영역(`env(safe-area-inset-bottom)`) 대응
   - `setInterval` 폴링 대신 `MutationObserver`로 PPOM 가격 요약 박스를 즉시 제거(배터리/성능 개선)
   - `role="dialog"`, `aria-modal`, `aria-hidden`, `aria-expanded` 등 접근성 속성 추가
   - 클래스명을 `vf-` 접두사로 통일해 테마/다른 플러그인과의 충돌 최소화

## 참고

- 데스크톱(≥768px)에서는 서랍장을 만들지 않고 PPOM 기본 UI가 그대로 노출됩니다.
- `$cartForm.find('button, a.button, input[type="submit"]')`로 액션 버튼들을 모두
  하단 액션 영역으로 옮기므로, 장바구니 담기/바로구매 버튼 마크업이 바뀌면 선택자도 함께
  점검해주세요.
