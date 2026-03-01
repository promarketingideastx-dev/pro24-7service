const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();

async function main() {
    try {
        const user = await auth.getUserByEmail('rivipro2012@yahoo.com');
        console.log("Firebase Auth User found:", user.uid);
    } catch (e) {
        console.log("Firebase Auth User NOT found:", e.message);
    }
    process.exit(0);
}

main().catch(console.error);
