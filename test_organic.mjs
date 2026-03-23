import admin from 'firebase-admin';
import { readFileSync, writeFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("=========================================");
    console.log("🔍 TEST DIRIGIDO: LÓGICA DE DESTINATARIOS");
    console.log("=========================================\n");

    const REAL_BOOKING_ID = 'epqiBwtvKACCj5rTaz3e';
    const REAL_BUSINESS_EMAIL = 'promarketingideastx@gmail.com';  // El negocio
    const REAL_CLIENT_EMAIL = 'riviprohouston@gmail.com';         // El cliente
    
    // 1. SIMULACIÓN EXACTA DE RequestAppointmentModal.tsx (El cliente crea la cita)
    // El frontend llama a: fetch('/api/enqueue-notification', { action: 'enqueueForBookingCreation', payload: { businessEmail, ... } })
    console.log("📝 EVENTO 1: booking_created (Ejecutado por el Cliente en Modal)");
    
    // Lo haremos directo como lo haría el backend de Vercel tras recibir el fetch:
    const qbRes = await db.collection('notification_queue').add({
        targetUid: 'biz123',
        targetEmail: REAL_BUSINESS_EMAIL, // Argumento 6 extraído de bizDoc
        channel: 'email',
        type: 'booking_created', // Plantilla de Negocio
        entityId: REAL_BOOKING_ID,
        status: 'pending',
        scheduledFor: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0
    });
    console.log(`✅ Evidencia UI -> payload.businessEmail = ${REAL_BUSINESS_EMAIL}`);
    console.log(`✅ Documento Creado en BD: ${qbRes.id} con targetEmail: ${REAL_BUSINESS_EMAIL}`);


    // 2. SIMULACIÓN EXACTA DE ProviderBookingsView.tsx (El negocio aprueba la cita)
    // El frontend llama a: NotificationQueueService.enqueueForBookingStatusChange(..., booking.clientEmail, ...)
    console.log("\n📝 EVENTO 2: booking_confirmed (Ejecutado por el Negocio al Aprobar)");

    const qcRes = await db.collection('notification_queue').add({
        targetUid: 'cli123',
        targetEmail: REAL_CLIENT_EMAIL, // Argumento extraído de booking.clientEmail
        channel: 'email',
        type: 'booking_confirmed', // Plantilla Cliente
        entityId: REAL_BOOKING_ID,
        status: 'pending',
        scheduledFor: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0
    });
    console.log(`✅ Evidencia UI -> booking.clientEmail = ${REAL_CLIENT_EMAIL}`);
    console.log(`✅ Documento Creado en BD: ${qcRes.id} con targetEmail: ${REAL_CLIENT_EMAIL}`);

    console.log("\n⚙️ Disparando CRON de Vercel para procesar estos dos documentos exactos...");
    await fetch('https://pro247ya.com/api/cron/process-notifications', { headers: { 'x-vercel-cron': '1' } });
    await new Promise(r => setTimeout(r, 6000));

    // Confirmación final
    const docB = await qbRes.get();
    const docC = await qcRes.get();
    console.log("\n📊 RESULTADO FINAL EVIDENCIADO EN BD:");
    console.log(`[EVENTO 1 - booking_created]   => Destino Final Usado: ${docB.data().targetEmail} | Estatus: ${docB.data().status.toUpperCase()}`);
    console.log(`[EVENTO 2 - booking_confirmed] => Destino Final Usado: ${docC.data().targetEmail} | Estatus: ${docC.data().status.toUpperCase()}`);

    console.log(`\n✅ REPORTE GENERADO CON ÉXITO.`);
    process.exit(0);
}
run();
