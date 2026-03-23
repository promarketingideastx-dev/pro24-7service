import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO USUARIOS CON CORREO DEL TESTER...");
    const uSnap = await db.collection('users').where('email', '==', 'promarketingideastx@gmail.com').get();
    
    for (const uDoc of uSnap.docs) {
        console.log(`👤 Usuario encontrado: ${uDoc.id} | Email: ${uDoc.data().email}`);
        console.log(`   BusinessProfileId activo: ${uDoc.data().businessProfileId}`);
        
        if (uDoc.data().businessProfileId) {
            const bizSnap = await db.collection('businesses').doc(uDoc.data().businessProfileId).get();
            console.log(`   Negocio Vinculado - ID: ${bizSnap.id}`);
            console.log(`   Negocio - ownerUid: ${bizSnap.data()?.ownerUid}`);
            console.log(`   Negocio - email: ${bizSnap.data()?.email}`);
        }
    }
    
    process.exit(0);
}
run();
