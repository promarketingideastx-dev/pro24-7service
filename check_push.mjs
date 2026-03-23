import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO TOKENS DE PUSH PARA EL NEGOCIO LtmEbB7ga0Vu4iEZEVDrrXpYjuj1");
    const bizSnap = await db.collection('businesses').doc('LtmEbB7ga0Vu4iEZEVDrrXpYjuj1').get();
    console.log("FCM Tokens (Business Root):", bizSnap.data()?.fcmTokens);
    
    // Also check the owner's users document
    if (bizSnap.data()?.ownerUid) {
        const uSnap = await db.collection('users').doc(bizSnap.data()?.ownerUid).get();
        console.log("FCM Tokens (Owner User):", uSnap.data()?.fcmTokens);
    }
    
    process.exit(0);
}
run();
