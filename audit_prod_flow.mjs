import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function runAudit() {
    console.log("🔍 AUDITORÍA FORENSE DE FLUJO REAL (PRODUCCIÓN)\n");
    
    // 1. Fetch the last 2 recent real bookings
    const bookingsSnap = await db.collection('bookings')
        .orderBy('createdAt', 'desc')
        .limit(2)
        .get();

    for (const bDoc of bookingsSnap.docs) {
        const booking = bDoc.data();
        console.log(`=========================================`);
        console.log(`🎟️ BOOKING ID: ${bDoc.id}`);
        console.log(`   Creado: ${booking.createdAt?.toDate ? booking.createdAt.toDate().toISOString() : booking.createdAt}`);
        console.log(`   Client Email Grabado en Booking (booking.clientEmail): ${booking.clientEmail}`);
        
        // 2. Fetch Business Email
        const bizSnap = await db.collection('businesses').doc(booking.businessId).get();
        const bizEmail = bizSnap.data()?.email || 'NOT FOUND';
        console.log(`   Business Email Grabado en Profile (business.email): ${bizEmail}`);
        
        console.log(`\n📦 RASTREANDO DOCUMENTOS EN NOTIFICATION_QUEUE:`);
        // 3. Find all notifications produced for this booking
        const qSnap = await db.collection('notification_queue')
            .where('entityId', '==', bDoc.id)
            .get();
            
        if (qSnap.empty) {
            console.log(`   ❌ No hay notificaciones encoladas para esta cita.`);
        } else {
            for (const qDoc of qSnap.docs) {
                const qData = qDoc.data();
                console.log(`   ---`);
                console.log(`   🔔 Doc ID: ${qDoc.id}`);
                console.log(`   Tipo de Plantilla: ${qData.type}`);
                console.log(`   Target Email (Destinatario Final): ${qData.targetEmail}`);
                console.log(`   Status: ${qData.status}`);
            }
        }
        console.log("");
    }
    
    process.exit(0);
}

runAudit();
