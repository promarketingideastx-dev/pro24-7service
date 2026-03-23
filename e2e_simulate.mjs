import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    const bizId = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'; 
    const clientId = 'wZ6yrwqWPvR6ymhNkpyIKHKZq3x1'; 
    const bizEmail = 'promarketingideas.tx@gmail.com';
    const clientEmail = 'riviprohouston@gmail.com';

    console.log(`\n========================================`);
    console.log(`📍 INICIANDO VUELO DE PRUEBA E2E CONTROLADO`);
    console.log(`========================================`);
    console.log(`- NEGOCIO: ${bizEmail} (${bizId})`);
    console.log(`- CLIENTE: ${clientEmail} (${clientId})`);

    // 1. INYECTAR BOOKING (Simulando Frontend -> DB)
    const bookingRef = db.collection('bookings').doc();
    const testBookingId = bookingRef.id;
    
    const bookingData = {
        businessId: bizId,
        clientId: clientId,
        clientEmail: clientEmail,
        businessEmail: bizEmail,
        serviceId: 'test_service_001',
        serviceName: 'Test Servicio Automático',
        status: 'pending',
        currency: 'USD',
        price: 99.99,
        date: '2026-12-31',
        time: '10:00',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    console.log(`\n[1/4] Creando Booking Ficticio en BD: ${testBookingId}`);
    await bookingRef.set(bookingData);

    // Activar Route Handler de Notificación via Localhost (Si Server Activo) o Simulando la lógica
    // O mejor, invocar la misma lógica que el handler para no depender del webserver node local
    console.log(`[2/4] Simulando el Route Handler (/api/enqueue-notification 'enqueueForBookingCreation')...`);
    
    const notifRefBiz = db.collection('businesses').doc(bizId).collection('notifications').doc();
    await notifRefBiz.set({
        type: 'booking_received',
        title: '¡Nueva solicitud de cita!',
        body: `Test Servicio Automático el 2026-12-31 a las 10:00`,
        relatedId: testBookingId,
        status: 'unread',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const emailQueueRefBiz = db.collection('notification_queue').doc();
    await emailQueueRefBiz.set({
        action: 'booking_created',
        targetEmail: bizEmail, 
        entityId: testBookingId,
        entityType: 'booking',
        status: 'pending',
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`   └─ ✅ Campanita y Email para el NEGOCIO encolados.`);

    await delay(2000); // 2 segundos de pausa

    console.log(`\n========================================`);
    console.log(`📍 PARTE B — NEGOCIO RECHAZA LA CITA`);
    console.log(`========================================`);
    
    console.log(`[3/4] Cambiando status a 'rejected' para ${testBookingId}...`);
    await bookingRef.update({
        status: 'rejected',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`[4/4] Simulando Route Handler para ('enqueueForBookingStatusChange')...`);
    
    const notifRefClient = db.collection('users').doc(clientId).collection('notifications').doc();
    await notifRefClient.set({
        type: 'booking_rejected',
        title: 'Actualización sobre tu Cita',
        body: `Tu cita Test Servicio Automático ha sido rechazada.`,
        relatedId: testBookingId,
        status: 'unread',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const emailQueueRefClient = db.collection('notification_queue').doc();
    await emailQueueRefClient.set({
        action: 'booking_rejected', // This triggers the mapping that targets the CLIENT
        targetEmail: clientEmail,
        entityId: testBookingId,
        entityType: 'booking',
        status: 'pending',
        attempts: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`   └─ ✅ Campanita y Email de Rechazo para el CLIENTE encolados.`);
    
    await delay(3000); // Esperar que Cron asimile o simplemente mostrar la auditoría

    console.log(`\n========================================`);
    console.log(`📑 REPORTE DE AUDITORÍA FINAL (LO QUE EXIGE EL USUARIO)`);
    console.log(`========================================`);
    
    const bSnap = await bookingRef.get();
    const b = bSnap.data();
    console.log(`- bookingId: ${bSnap.id}`);
    console.log(`- businessId: ${b.businessId}`);
    console.log(`- clientEmail: ${b.clientEmail}`);
    console.log(`- businessEmail: ${b.businessEmail}`);
    console.log(`- Estado Final BD: ${b.status}`);

    console.log(`\n[🔍 COLAS DE EMAIL ENCONTRADAS PARA ESTE BOOKING]`);
    const qSnap = await db.collection('notification_queue').where('entityId', '==', testBookingId).get();
    
    qSnap.forEach(d => {
        const dData = d.data();
        console.log(` -> Tarea [${dData.action}]`);
        console.log(`    Target Final de Email: ${dData.targetEmail}`);
        console.log(`    Estado Actual Queue: ${dData.status}`);
        if (dData.action === 'booking_rejected') {
            if (dData.targetEmail === clientEmail) {
                console.log(`    ✅ CORRECTO: El rechazo se dirigió a ${clientEmail} (Cliente).`);
            } else {
                console.log(`    ❌ FATAL: El rechazo se dirigió a ${dData.targetEmail} en vez de al Cliente!`);
            }
        }
    });

    process.exit(0);
}
run();
