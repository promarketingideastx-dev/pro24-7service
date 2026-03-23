import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    try {
        const bDoc = await db.collection('bookings').doc('epqiBwtvKACCj5rTaz3e').get();
        const bData = bDoc.data();
        console.log("Booking Details:");
        console.log(" - clientEmail:", bData.clientEmail);
        console.log(" - clientId:", bData.clientId);
        console.log(" - businessId:", bData.businessId);

        const bizSnap = await db.collection('businesses').doc(bData.businessId).get();
        console.log("\nBusiness full data:");
        console.log(JSON.stringify(bizSnap.data(), null, 2));

        const uSnap = await db.collection('users').doc(bizSnap.data()?.ownerUid || '').get();
        console.log("\nBusiness Owner User Email:", uSnap.data()?.email);

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
