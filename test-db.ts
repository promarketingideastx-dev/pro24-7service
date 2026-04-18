import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'promarketingideastx-dev'
    });
}
const db = admin.firestore();

async function run() {
    try {
        const hnSnap = await db.collection('businesses_public').where('country', '==', 'HN').limit(1).get();
        const usSnap = await db.collection('businesses_public').where('country', '==', 'US').limit(1).get();

        console.log("=== HN Business ===");
        if (!hnSnap.empty) {
            const h = hnSnap.docs[0].data();
            console.log("Name:", h.name);
            console.log("PaymentSettings:", h.paymentSettings || 'UNDEFINED');
        } else {
            console.log("No HN business found");
        }

        console.log("\n=== US Business ===");
        if (!usSnap.empty) {
            const u = usSnap.docs[0].data();
            console.log("Name:", u.name);
            console.log("PaymentSettings:", u.paymentSettings || 'UNDEFINED');
        } else {
            console.log("No US business found");
        }
    } catch (e) {
        console.error(e);
    }
}
run();
