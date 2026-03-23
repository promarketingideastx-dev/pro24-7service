import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 BUSCANDO EL ÚLTIMO BOOKING CREADO PARA AUDITAR SILENCIOS...");
    const snap = await db.collection('bookings').orderBy('createdAt', 'desc').limit(1).get();
    if (snap.empty) {
        console.log("No bookings found.");
        return process.exit(0);
    }
    const bDoc = snap.docs[0];
    const bData = bDoc.data();
    console.log(`🎟️ Booking ID: ${bDoc.id}`);
    console.log(`   Client Email: ${bData.clientEmail}`);
    console.log(`   Business ID: ${bData.businessId}`);
    console.log(`   Client ID: ${bData.clientId}`);
    console.log(`   Creado: ${bData.createdAt.toDate().toISOString()}`);

    console.log("\n📦 BUSCANDO NOTIFICATION QUEUE:");
    const qSnap = await db.collection('notification_queue').where('entityId', '==', bDoc.id).get();
    if (qSnap.empty) console.log("   ❌ NO HAY DOCUMENTOS EN LA COLA.");
    else {
        qSnap.docs.forEach(d => console.log(`   ✅ ID: ${d.id} | Tipo: ${d.data().type} | Target: ${d.data().targetEmail} | Status: ${d.data().status}`));
    }

    console.log("\n🔔 BUSCANDO CAMPANITAS IN-APP AL NEGOCIO:");
    const bizNotif = await db.collection('businesses').doc(bData.businessId).collection('notifications')
        .where('relatedId', '==', bDoc.id).get();
    if (bizNotif.empty) console.log("   ❌ NO HAY CAMPANITAS IN-APP PARA EL NEGOCIO.");
    else {
        bizNotif.docs.forEach(d => console.log(`   ✅ ID: ${d.id} | Tipo: ${d.data().type} | Título: ${d.data().title}`));
    }

    console.log("\n📲 BUSCANDO CAMPANITAS IN-APP AL CLIENTE:");
    const cliNotif = await db.collection('users').doc(bData.clientId).collection('notifications')
        .where('relatedId', '==', bDoc.id).get();
    if (cliNotif.empty) console.log("   ❌ NO HAY CAMPANITAS IN-APP PARA EL CLIENTE.");
    else {
        cliNotif.docs.forEach(d => console.log(`   ✅ ID: ${d.id} | Tipo: ${d.data().type} | Título: ${d.data().title}`));
    }
    
    process.exit(0);
}
run();
