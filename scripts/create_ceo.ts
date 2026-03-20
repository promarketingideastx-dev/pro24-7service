import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const auth = admin.auth();
const db = admin.firestore();

const CEO_EMAIL = 'promarketingideas.tx@gmail.com';
const CEO_PASS  = 'Pro24-7Admin2026!'; // Generic secure password for hand-off

async function bootstrapCEO() {
    console.log(`\n[ STEP 1: AUTHENTICATION GENERATION ]`);
    let userRecord;
    try {
        userRecord = await auth.createUser({
            email: CEO_EMAIL,
            emailVerified: true,
            password: CEO_PASS,
            displayName: 'Javier Mercado (CEO)',
            disabled: false,
        });
        console.log(`✅ CEO Auth created with UID: ${userRecord.uid}`);
    } catch (e: any) {
        console.error(`❌ Failed to create Auth user: ${e.message}`);
        process.exit(1);
    }

    console.log(`\n[ STEP 2: CUSTOM CLAIMS INJECTION ]`);
    try {
        await auth.setCustomUserClaims(userRecord.uid, {
            admin: true,
            ceo: true
        });
        console.log(`✅ Super-Admin Custom Claims bound to UID securely.`);
    } catch (e: any) {
        console.error(`❌ Failed to set claims: ${e.message}`);
        process.exit(1);
    }

    console.log(`\n[ STEP 3: FIRESTORE BASE IDENTITY ]`);
    try {
        const userDoc = {
            uid: userRecord.uid,
            email: CEO_EMAIL,
            firstName: 'Javier',
            lastName: 'Mercado',
            phone: '',
            photoUrl: '',
            country: 'Honduras',
            accountStatus: 'active',
            emailVerified: true,
            role: 'client', // Legacy fallback
            roles: {
                admin: true,
                ceo: true,
                client: false, 
                provider: false 
                // Notice: Explicitly NOT provider to avoid mixed onboarding flows
            },
            isAdmin: true,   // Legacy fallback
            legacyTrusted: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userRecord.uid).set(userDoc, { merge: false });
        console.log(`✅ Firestore Identity document materialized successfully.`);
    } catch (e: any) {
        console.error(`❌ Failed to write to Firestore: ${e.message}`);
        process.exit(1);
    }

    console.log(`\n[ SUCCESS: OPTION C ARCHITECTURE FULLY IMPLEMENTED ]`);
    console.log(`Email: ${CEO_EMAIL}`);
    console.log(`Temp Password: ${CEO_PASS}`);
    console.log(`You may now log in to the App to be securely routed to /admin.`);
}

bootstrapCEO().then(() => process.exit(0)).catch(console.error);
