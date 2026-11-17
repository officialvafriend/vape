/* 관리자웹 알림 일꾼(서비스 워커). 정식 주소에서는 /vape/admin/sw.js 로 올라간다.
   하는 일은 둘뿐이다: 알림이 오면 띄우기, 알림을 누르면 관리자웹 열기. 화면을 저장해 두거나 요청을 가로채지 않는다(새 판이 늦게 뜨는 일이 없게). */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  e.waitUntil(self.registration.showNotification("베이프렌드 관리자", { body: "새 글이나 업무가 있어요", tag: "adm-new", renotify: true, data: { url: self.registration.scope } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || self.registration.scope);
  })());
});
