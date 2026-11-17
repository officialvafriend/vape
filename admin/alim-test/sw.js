/* VF 알림 시험용. 알림을 받아서 띄우는 일만 함. 화면 저장(캐시)은 안 함. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  const at = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "VF 알림 시험", {
      body: d.body || "PC에서 보낸 알림이 도착했어요 (" + at + ")",
      icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || "vf-test-push", renotify: true, data: { url: d.url || "./" }
    }),
    /* 화면이 열려 있으면 화면에도 "도착" 한 줄 */
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((L) => L.forEach((c) => c.postMessage({ vfPush: at })))
  ]));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((L) => {
    for (const c of L) { if ("focus" in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
