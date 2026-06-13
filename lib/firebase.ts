import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            'AIzaSyAQTishxb78pQBh-UoXJpFTHiIaGKkUhik',
  authDomain:        'mediquiz-ai-ec88a.firebaseapp.com',
  projectId:         'mediquiz-ai-ec88a',
  storageBucket:     'mediquiz-ai-ec88a.firebasestorage.app',
  messagingSenderId: '599937901456',
  appId:             '1:599937901456:web:4cfce5e7cf6d54b3254915',
  measurementId:     'G-DVSFWEQ7PK',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export async function requestFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/',
    });
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token ?? null;
  } catch (e) {
    console.error('[FCM] トークン取得失敗:', e);
    return null;
  }
}
