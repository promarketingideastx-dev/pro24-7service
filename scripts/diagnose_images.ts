import * as admin from 'firebase-admin';
import { loadEnvConfig } from '@next/env';

// Load env vars the Next.js way
const projectDir = process.cwd();
loadEnvConfig(projectDir);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON as string))
    });
}

async function run() {
    try {
        const email = 'promarketingideas.tx@gmail.com';
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log(`\n=== DATA FOR: ${email} ===`);
        console.log('User ID (ownerId/businessId):', userRecord.uid);

        const db = admin.firestore();
        const publicDoc = await db.collection('businesses').doc(userRecord.uid).get();
        console.log('\n--- PUBLIC PROFILE (businesses/{businessId}) ---');
        console.log(JSON.stringify(publicDoc.data() || {}, null, 2));

        const privateDoc = await db.collection('businesses').doc(userRecord.uid).collection('private').doc('data').get();
        console.log('\n--- PRIVATE PROFILE (businesses/{businessId}/private/data) ---');
        console.log(JSON.stringify(privateDoc.data() || {}, null, 2));

        const bucketMatch = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        console.log('\nBucket:', bucketMatch);

        const bucket = admin.storage().bucket(bucketMatch);

        const [files1] = await bucket.getFiles({ prefix: `business/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (business/${userRecord.uid}/) ---`);
        files1.forEach(file => console.log(file.name));

        const [files2] = await bucket.getFiles({ prefix: `businesses/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (businesses/${userRecord.uid}/) ---`);
        files2.forEach(file => console.log(file.name));

        console.log('\n===================================\n');
    } catch (e) {
        console.error('Error fetching data:', e);
    }
}

run();
