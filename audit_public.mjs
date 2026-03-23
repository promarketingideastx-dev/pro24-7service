import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO EN businesses_public...");
    const snap = await db.collection('businesses_public').get();
    
    let found = false;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.name && data.name.toLowerCase().includes('pro marketing')) {
            found = true;
            console.log(`\n🏢 ¡ENCONTRADO EN businesses_public!`);
            console.log(`   ID: ${d.id}`);
            console.log(`   Nombre (name): ${data.name}`);
            console.log(`   Email: ${data.email}`);
            console.log(`   Owner UID: ${data.ownerUid}`);
            console.log(`   Teléfono: ${data.phone}`);
            
            // Check cross-reference in private businesses
            const pDoc = await db.collection('businesses').doc(d.id).get();
            console.log(`   \n🔎 ESTADO EN LA COLECCIÓN PRIVADA 'businesses':`);
            if (pDoc.exists) {
                console.log(`      El documento existe pero ¿tiene email?: ${pDoc.data()?.email ?? 'NO IDEAL/INDIFINIDO'}`);
                console.log(`      ownerUid privado: ${pDoc.data()?.ownerUid ?? 'INDEFINIDO'}`);
            } else {
                console.log(`      EL DOCUMENTO NO EXISTE EN LA COLECCIÓN PRIVADA.`);
            }
        }
    }
    
    if (!found) console.log("   ❌ NO SE ENCONTRÓ EN businesses_public TAMPOCO.");
    process.exit(0);
}
run();
