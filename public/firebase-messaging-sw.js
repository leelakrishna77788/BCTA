/* global importScripts, firebase, clients */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// These values are injected by the build process or should be replaced manually
// Note: For a simpler implementation without advanced build setup, we hardcode the config here
// based on the .env values found in the project.
const firebaseConfig = {
  apiKey: "AIzaSyAcMEqzr8OOELhx_glMBG7CfyOXuP88BLQ",
  authDomain: "bcta-ee7a5.firebaseapp.com",
  projectId: "bcta-ee7a5",
  storageBucket: "bcta-ee7a5.firebasestorage.app",
  messagingSenderId: "453989635192",
  appId: "1:453989635192:web:8ba82f3141ace4bfabc98d",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/leaning_avatar.png', // Fallback icon
    badge: '/leaning_avatar.png',
    tag: 'bcta-notif', // prevents duplicates
    renotify: true,
    data: {
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
