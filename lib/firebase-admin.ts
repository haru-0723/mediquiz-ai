import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

let adminApp: App | undefined;
let adminMessaging: Messaging | undefined;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  return adminApp;
}

export function getAdminMessaging(): Messaging {
  if (adminMessaging) return adminMessaging;
  adminMessaging = getMessaging(getAdminApp());
  return adminMessaging;
}
