import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO NEGOCIO 'Pro Marketing Ideas' EN LA COLECCIÓN BUSINESSES...");
    const bizSnap = await db.collection('businesses').get();
    
    let found = false;
    for (const bDoc of bizSnap.docs) {
        const data = bDoc.data();
        if (data.brandName && data.brandName.toLowerCase().includes('pro marketing')) {
            found = true;
            console.log(`\n🏢 ¡NEGOCIO ENCONTRADO EN LA BD!`);
            console.log(`   ID Real en Firebase: ${bDoc.id}`);
            console.log(`   Brand Name: ${data.brandName}`);
            console.log(`   Slug: ${data.slug}`);
            console.log(`   Owner UID: ${data.ownerUid}`);
            console.log(`   Email (contactInfo): ${data.contactInfo?.email}`);
            console.log(`   Email (business email): ${data.email}`);
        }
    }
    
    if (!found) {
        console.log("\n❌ NO SE ENCONTRÓ NINGÚN NEGOCIO CON ESE NOMBRE.");
    }
    
    console.log("\n🔍 BUSCANDO USUARIOS CON CORREO 'promarketingideas.tx@gmail.com' (con punto)...");
    const uSnap = await db.collection('users').where('email', '==', 'promarketingideas.tx@gmail.com').get();
    
    if (uSnap.empty) {
        console.log("   ❌ NO HAY USUARIOS CON ESTE CORREO.");
    } else {
        uSnap.docs.forEach(uDoc => {
            console.log(`\n👤 USUARIO ENCONTRADO!`);
            console.log(`   ID Usuario (UID): ${uDoc.id}`);
            console.log(`   Email: ${uDoc.data().email}`);
            console.log(`   Role: ${uDoc.data().role}`);
            console.log(`   businessProfileId: ${uDoc.data().businessProfileId}`);
        });
    }

    process.exit(0);
}
run();
