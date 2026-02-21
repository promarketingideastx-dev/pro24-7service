/**
 * Seed: Set admin role for a specific email
 * Run: node scripts/set-admin.js
 *
 * Requires: firebase-admin + service account key
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const TARGET_EMAIL = 'promarketingideas.tx@gmail.com';

async function setAdminByEmail(email) {
    try {
        // 1. Find user by email in Firebase Auth
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;

        console.log(`✓ Found user: ${email} → UID: ${uid}`);

        // 2. Set isAdmin: true in Firestore
        await admin.firestore().collection('users').doc(uid).set(
            { isAdmin: true, adminSetAt: new Date().toISOString() },
            { merge: true }
        );

        // 3. Set custom claim (optional, for Firestore rules)
        await admin.auth().setCustomUserClaims(uid, { isAdmin: true });

        console.log(`✅ Admin role granted to: ${email}`);
        console.log(`   UID: ${uid}`);
        console.log(`   Firestore: users/${uid}.isAdmin = true`);
        console.log(`   Auth claim: isAdmin = true`);
        console.log('');
        console.log('👉 Now navigate to /admin in the app.');

    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.code === 'auth/user-not-found') {
            console.error(`   No user with email: ${email}`);
        }
    }

    process.exit(0);
}

setAdminByEmail(TARGET_EMAIL);
