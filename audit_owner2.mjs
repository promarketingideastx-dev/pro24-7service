import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO USUARIO riviprohouston@gmail.com...");
    const uSnap = await db.collection('users').where('email', '==', 'riviprohouston@gmail.com').get();
    
    for (const uDoc of uSnap.docs) {
        console.log(`👤 Usuario encontrado: ${uDoc.id}`);
        console.log(`   BusinessProfileId activo: ${uDoc.data().businessProfileId}`);
        
        if (uDoc.data().businessProfileId) {
            const bizSnap = await db.collection('businesses').doc(uDoc.data().businessProfileId).get();
            console.log(`   Negocio - ownerUid: ${bizSnap.data()?.ownerUid}`);
            console.log(`   Negocio - email: ${bizSnap.data()?.email}`);
        }
    }
    
    process.exit(0);
}
run();
