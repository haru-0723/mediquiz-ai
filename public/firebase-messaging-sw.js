importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAQTishxb78pQBh-UoXJpFTHiIaGKkUhik',
  authDomain:        'mediquiz-ai-ec88a.firebaseapp.com',
  projectId:         'mediquiz-ai-ec88a',
  storageBucket:     'mediquiz-ai-ec88a.firebasestorage.app',
  messagingSenderId: '599937901456',
  appId:             '1:599937901456:web:4cfce5e7cf6d54b3254915',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  if (!title) return;
  self.registration.showNotification(title, {
    body: body ?? '',
    icon: '/icon-192.png',
  });
});
