const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

async function run() {
    const user = await admin.auth().getUserByEmail('promarketingideas.tx@gmail.com');
    const db = admin.firestore();
    const doc = await db.collection('businesses').doc(user.uid).get();
    console.log(JSON.stringify(doc.data(), null, 2));
}
run();
