import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function runQAEmails() {
    console.log("=== INYECTANDO QUEUE REAL PARA QA DE RESEND ===");
    
    // Create a real mock booking
    const bookingRef = await db.collection('bookings').add({
        businessId: "QA_BIZ_EMAIL",
        clientId: "QA_CLI_EMAIL",
        serviceId: "QA_SRV_EMAIL",
        serviceName: "Corte de Pelo QA",
        date: "2026-10-10",
        time: "15:00",
        duration: 30,
        status: "pending",
        paymentStatus: "pending",
        totalAmount: 25,
        depositAmount: 0,
        remainingAmount: 25,
        currency: "USD",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Inject business name mock since businesses might not exist
    await db.collection('businesses').doc('QA_BIZ_EMAIL').set({ name: "Barbería Vercel QA" }, { merge: true });

    const targetEmail = "javier.mercado.tx@gmail.com"; 

    const queueRef = db.collection('notification_queue');
    
    await queueRef.add({
        entityId: bookingRef.id,
        targetEmail: targetEmail,
        businessEmail: targetEmail,
        type: "booking_created",
        channel: "email",
        status: "pending",
        attempts: 0,
        scheduledFor: admin.firestore.Timestamp.now()
    });

    await queueRef.add({
        entityId: bookingRef.id,
        targetEmail: targetEmail,
        businessEmail: targetEmail,
        type: "booking_confirmed",
        channel: "email",
        status: "pending",
        attempts: 0,
        scheduledFor: admin.firestore.Timestamp.now()
    });

    await queueRef.add({
        entityId: bookingRef.id,
        targetEmail: targetEmail,
        businessEmail: targetEmail,
        type: "booking_canceled",
        channel: "email",
        status: "pending",
        attempts: 0,
        scheduledFor: admin.firestore.Timestamp.now()
    });

    console.log("✅ 3 Correos encolados exitosamente a:", targetEmail);
    console.log("Puedes disparar el CRON ahora.");
    process.exit(0);
}

runQAEmails();
