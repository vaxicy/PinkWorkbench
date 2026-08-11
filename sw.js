const CACHE_NAME = 'pink-workbench-v96';

self.addEventListener('install', event => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || '喝水提醒';
  const options = {
    body: data.body || '该喝几口水啦 💧',
    icon: './icon-192.png?v=96',
    badge: './icon-192.png?v=96',
    tag: data.tag || ('water-reminder-'+Date.now()),
    data: { url: './index.html#plan' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const target = list.find(client => 'focus' in client);
    if (target) return target.focus();
    if (clients.openWindow) return clients.openWindow('./index.html#plan');
  }));
});
