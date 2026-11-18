/* 관리자웹 알림 일꾼(서비스 워커). 정식 주소에서는 /vape/admin/sw.js 로 올라간다.
   하는 일은 둘뿐이다: 알림이 오면 띄우기, 알림을 누르면 관리자웹 열기. 화면을 저장해 두거나 요청을 가로채지 않는다(새 판이 늦게 뜨는 일이 없게).
   알림에 글이 실려 오면(누가 무엇을 올렸는지, 내용 앞부분) 그대로 띄우고, 안 실려 오면 "새 글이나 업무가 있어요"만 띄운다. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("push", (e) => {
  let d = null;
  try { d = e.data ? e.data.json() : null; } catch (x) { d = null; }
  const t = d && d.t ? String(d.t).slice(0, 60) : "베이프렌드 관리자", b = d && d.b ? String(d.b).slice(0, 160) : "새 글이나 업무가 있어요", room = d && +d.room > 0 ? +d.room : 0;
  e.waitUntil(self.registration.showNotification(t, { body: b, tag: room ? "adm-r" + room : "adm-new", renotify: true, data: { url: self.registration.scope, room } }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const room = (e.notification.data && e.notification.data.room) || 0;
  e.waitUntil((async () => {
    const cs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cs) if ("focus" in c) { if (room) c.postMessage({ admOpenRoom: room }); return c.focus(); }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || self.registration.scope);
  })());
});
