import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const adminDb = admin.firestore();

async function main() {
    console.log("=== USERS IN FIRESTORE FOR: promarketingideas.tx@gmail.com ===");
    const users = await adminDb.collection('users').where('email', '==', 'promarketingideas.tx@gmail.com').get();
    users.forEach(doc => {
        console.log(`\nDoc ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    console.log("\n=== BUSINESSES_PUBLIC IN FIRESTORE MATCHING SCREENSHOT NAMES ===");
    const businesses = await adminDb.collection('businesses_public').get();
    businesses.forEach(doc => {
        const data = doc.data();
        if (data.name === 'Pro Marketing Ideas' || data.name === 'RIVIPRO' || data.name === 'MJ RIOS') {
             console.log(`\nBusiness Doc ID: ${doc.id}`);
             console.log(JSON.stringify(data, null, 2));
        }
    });
}

main().catch(console.error);
