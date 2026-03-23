import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 LISTANDO TODOS LOS NEGOCIOS EN LA BD...");
    const bizSnap = await db.collection('businesses').get();
    
    for (const bDoc of bizSnap.docs) {
        const data = bDoc.data();
        console.log(`\n🏢 ID: ${bDoc.id}`);
        console.log(`   Nombre (name): ${data.name}`);
        console.log(`   Nombre Corto (brandName): ${data.brandName}`);
        console.log(`   Propietario (ownerUid): ${data.ownerUid}`);
        console.log(`   Teléfono: ${data.phone}`);
        console.log(`   Email (root): ${data.email}`);
        console.log(`   Email (contactInfo): ${data.contactInfo?.email}`);
    }
    
    console.log(`\nTotal Negocios: ${bizSnap.size}`);
    process.exit(0);
}
run();
