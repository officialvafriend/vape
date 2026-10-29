// 상담패드 B안 오프라인 저장 (10/27): 크롬이 '앱 설치'로 받아 주려면 이 파일이 있어야 하고, 한 번 열면 인터넷이 끊겨도 열린다.
// 화면, 데이터(재고, 상품)는 '인터넷 먼저, 안 되면 저장본', 사진과 글꼴은 '저장본 먼저'. 지금 판(sw.js) 저장본은 건드리지 않음(이름 앞머리 vf-b-).
const V = "vf-b-v28";
const CORE = ["./", "./brand.css", "./data.js", "./pos.js", "./goods.js", "./lung.js", "./devinfo.js", "./JsBarcode.all.min.js", "./qrcode.js", "./manifest-b.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE))); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("vf-b-") && k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
const put = (req, r) => { if (r && (r.ok || r.type === "opaque")) { const cp = r.clone(); caches.open(V).then((c) => c.put(req, cp)); } return r; };
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return; // 재고 확인 요청(디스코드) 등은 그대로
  const u = new URL(e.request.url);
  if (u.hostname === "api.github.com" || u.hostname.endsWith("discord.com")) return; // 재고 확인 답은 늘 새로
  const still = /\.(png|jpe?g|webp|woff2?|ttf)$/i.test(u.pathname) || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|hangeul\.pstatic\.net/.test(u.hostname);
  if (still) { e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => put(e.request, r)))); return; }
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then((r) => put(e.request, r))
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match("./"))));
});
