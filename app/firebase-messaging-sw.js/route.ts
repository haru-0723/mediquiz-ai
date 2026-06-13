import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    apiKey:            'AIzaSyAQTishxb78pQBh-UoXJpFTHiIaGKkUhik',
    authDomain:        'mediquiz-ai-ec88a.firebaseapp.com',
    projectId:         'mediquiz-ai-ec88a',
    storageBucket:     'mediquiz-ai-ec88a.firebasestorage.app',
    messagingSenderId: '599937901456',
    appId:             '1:599937901456:web:4cfce5e7cf6d54b3254915',
  };

  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'MediQuiz AI';
  const body  = (payload.notification && payload.notification.body)  || '';
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return clients.openWindow('/today');
    })
  );
});
`;

  return new NextResponse(sw, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/',
    },
  });
}
