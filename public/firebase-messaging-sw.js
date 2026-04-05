/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDi11YYZC38mBq5V_YULoozCU_MSQ_HE14',
  authDomain: 'dellauti-5413f.firebaseapp.com',
  projectId: 'dellauti-5413f',
  storageBucket: 'dellauti-5413f.appspot.com',
  messagingSenderId: '974528720387',
  appId: '1:974528720387:web:55e4b29cc0144168902836',
  measurementId: 'G-YXXLQH5REQ'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload?.notification?.title || 'Nuevo turno reservado';
  const notificationBody = payload?.notification?.body || 'Tienes una nueva reserva pendiente.';

  const clickLink = payload?.fcmOptions?.link || payload?.data?.url || '/shift-admin';

  self.registration.showNotification(notificationTitle, {
    body: notificationBody,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: {
      clickLink
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification?.data?.clickLink || '/shift-admin', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return Promise.resolve();
    })
  );
});
