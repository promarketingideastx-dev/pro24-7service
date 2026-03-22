import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function auditProduction() {
    console.log("=== AUDITORÍA DE PRODUCCIÓN ===");
    
    // 1. Obtener los últimos 3 bookings creados
    console.log("\n--- Últimas 3 Citas Generadas ---");
    const bookingsSnap = await db.collection('bookings')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();
        
    let latestBookingId = null;
    let latestBusinessId = null;

    if (bookingsSnap.empty) {
        console.log("No se encontraron citas recientes.");
    } else {
        bookingsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`\nBooking ID: ${doc.id}`);
            console.log(`Business ID: ${data.businessId}`);
            console.log(`Service Name: ${data.serviceName}`);
            console.log(`Total Amount: ${data.totalAmount}`);
            console.log(`Currency: ${data.currency}`);
            console.log(`Status: ${data.status}`);
            console.log(`Created At:`, data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt);
            
            if (!latestBookingId) {
                latestBookingId = doc.id;
                latestBusinessId = data.businessId;
            }
        });
    }

    // 2. Obtener la cola de notificaciones para el último booking
    if (latestBookingId) {
        console.log(`\n--- Cola de Notificaciones (bookingId: ${latestBookingId}) ---`);
        const queueSnap = await db.collection('notification_queue')
            .where('entityId', '==', latestBookingId)
            .get();
            
        if (queueSnap.empty) {
            console.log(`[ALERTA] No se encontró NINGÚN documento en notification_queue para la cita ${latestBookingId}.`);
            console.log("Esto confirma que la inyección falló o el endpoint no se llamó.");
        } else {
            queueSnap.forEach(doc => {
                const data = doc.data();
                console.log(`\nNotif ID ${doc.id}`);
                console.log(`  Type: ${data.type}`);
                console.log(`  TargetUID: ${data.targetUid}`);
                console.log(`  Status: ${data.status}`);
                console.log(`  Attempts: ${data.attempts}`);
                console.log(`  ScheduledFor:`, data.scheduledFor?.toDate ? data.scheduledFor.toDate() : data.scheduledFor);
            });
        }
    }

    // 3. Revisar el servicio correspondiente a la última cita
    if (latestBookingId && latestBusinessId) {
        const bookingData = bookingsSnap.docs[0].data();
        if (bookingData.serviceId) {
            console.log(`\n--- Moneda Real del Servicio (ID: ${bookingData.serviceId}) ---`);
            const svcSnap = await db.collection('businesses').doc(latestBusinessId)
                .collection('services').doc(bookingData.serviceId).get();
            
            if (svcSnap.exists) {
                console.log(`Service Name: ${svcSnap.data().name}`);
                console.log(`Service Currency: ${svcSnap.data().currency}`);
                console.log(`Service Price: ${svcSnap.data().price}`);
            } else {
                console.log("Servicio no encontrado.");
            }
        }
    }
    
    process.exit(0);
}

auditProduction();
