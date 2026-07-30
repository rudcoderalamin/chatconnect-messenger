const admin = require('firebase-admin');

/**
 * Initializes Firebase Admin using a service account.
 *
 * Get the service account JSON from:
 * Firebase Console → Project Settings → Service Accounts → Generate New Private Key
 *
 * For local dev: save it as `firebase-service-account.json` in the project root
 * and set FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json in .env
 *
 * For production (e.g. Railway/Render): paste the full JSON content into a single
 * env var FIREBASE_SERVICE_ACCOUNT_JSON instead of using a file.
 */
function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    credential = admin.credential.cert(serviceAccount);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(require('path').resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    credential = admin.credential.cert(serviceAccount);
  } else {
    throw new Error(
      'Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env'
    );
  }

  admin.initializeApp({ credential });
  console.log('[Firebase] Admin SDK initialized');
  return admin;
}

module.exports = initFirebaseAdmin();
