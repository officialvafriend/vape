// 메뉴판 오프라인 저장: 한 번 열면 인터넷이 끊겨도(크롬 공룡 화면 대신) 메뉴판이 열린다.
// 화면 파일은 '인터넷 먼저, 안 되면 저장본', 상품 사진은 '저장본 먼저'.
const V = "vf-menu-test-v89";
const CORE = ["./", "./brand.css", "./data.js", "./pos.js", "./goods.js", "./devinfo.js", "./JsBarcode.all.min.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V && k.startsWith("vf-menu-test-v")).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // 디스코드 신호 등은 그대로
  const img = u.pathname.includes("/img/");
  if (img) {
    e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; })));
    return;
  }
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("./")))
  );
});
