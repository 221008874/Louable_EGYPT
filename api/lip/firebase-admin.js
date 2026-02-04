// api/lib/firebase-admin.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db = null;
let isConfigured = false;

try {
  if (getApps().length === 0) {
    // Check if we have credentials
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const hasIndividualCreds = !!(process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL);
    
    if (!hasServiceAccount && !hasIndividualCreds) {
      console.log('⚠️ Firebase credentials not found - running without database');
    } else {
      let serviceAccount;
      
      if (hasServiceAccount) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        serviceAccount = {
          projectId: process.env.FIREBASE_PROJECT_ID || 'louable-b4c1a',
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };
      }

      initializeApp({
        credential: cert(serviceAccount),
      });
      
      db = getFirestore();
      isConfigured = true;
      console.log('✅ Firebase Admin initialized');
    }
  } else {
    db = getFirestore();
    isConfigured = true;
  }
} catch (error) {
  console.error('❌ Firebase init error:', error.message);
  // Don't throw - let the API continue without Firebase
}

// Export safe db that won't crash if not configured
export const safeDb = db || {
  collection: () => ({
    add: async (data) => {
      console.log('Firebase not configured - order not saved:', data.orderId);
      return { id: 'no-firebase-' + Date.now() };
    }
  })
};

export const firebaseAvailable = isConfigured;