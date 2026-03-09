const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function run() {
    try {
        const user = await admin.auth().getUserByEmail('promarketingideas.tx@gmail.com');
        const db = admin.firestore();
        const doc = await db.collection('businesses').doc(user.uid).get();
        if (!doc.exists) {
            console.log("DOCUMENT DOES NOT EXIST FOR UID:", user.uid);
        } else {
            console.log("DOCUMENT DATA:", JSON.stringify(doc.data(), null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}
run();
