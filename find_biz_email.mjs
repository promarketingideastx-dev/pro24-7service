import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    const bizSnap = await db.collection('businesses').limit(1).get();
    const data = bizSnap.docs[0].data();
    writeFileSync('biz_log.txt', JSON.stringify(data, null, 2));
    console.log("Written to biz_log.txt");
    process.exit(0);
}
run();
