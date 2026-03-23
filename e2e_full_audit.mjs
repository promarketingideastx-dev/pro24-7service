import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRoute(endpoint, payload) {
    try {
        const res = await fetch(`http://localhost:3000/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        return { status: res.status, data };
    } catch(e) {
        return { status: 500, error: e.message };
    }
}

async function run() {
    console.log("==================================================");
    console.log("🚀 INICIANDO AUDITORIA FORENSE E2E (CREAR, CONFIRMAR, RECHAZAR)");
    console.log("==================================================");

    const bizId = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'; 
    const clientId = 'wZ6yrwqWPvR6ymhNkpyIKHKZq3x1'; 
    const bizEmail = 'promarketingideas.tx@gmail.com';
    const clientEmail = 'riviprohouston@gmail.com';

    // ==========================================
    // ESCENARIO 1: CREAR Y CONFIRMAR
    // ==========================================
    console.log("\n[ESCENARIO 1] -> CREACIÓN Y CONFIRMACIÓN");
    const book1Ref = db.collection('bookings').doc();
    const b1Id = book1Ref.id;
    
    // 1. Crear
    await book1Ref.set({
        businessId: bizId, clientId: clientId, clientEmail: clientEmail, businessEmail: bizEmail,
        serviceId: 'svr_001', serviceName: 'Audit Confirmed Service', status: 'pending', currency: 'USD',
        price: 50, date: '2026-12-01', time: '10:00',
        createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[A. CREACIÓN] Booking ID: ${b1Id}`);
    
    // Trigger Creation Route
    const resA = await fetchRoute('enqueue-notification', {
        action: 'enqueueForBookingCreation',
        payload: { bookingId: b1Id, businessId: bizId, businessName: 'Pro Marketing Ideas', clientName: 'Rivi Pro' }
    });
    console.log(`  └─ /api/enqueue-notification (Creation) -> HTTP ${resA.status} | Respuesta:`, JSON.stringify(resA.data));
    
    // Trigger Client Created Email Route
    const resA2 = await fetchRoute('enqueue-notification', {
        action: 'enqueueForClientBookingCreated',
        payload: { bookingId: b1Id, clientId: clientId, clientEmail: clientEmail, businessName: 'Pro Marketing Ideas' }
    });
    console.log(`  └─ /api/enqueue-notification (Client Creation) -> HTTP ${resA2.status} | Respuesta:`, JSON.stringify(resA2.data));

    await delay(1500);

    // 2. Confirmar
    await book1Ref.update({ status: 'confirmed', notesBusiness: '¡Claro que sí, te esperamos!' });
    console.log(`\n[B. CONFIRMACIÓN] Status cambiado a confirmed`);
    
    const resB = await fetchRoute('enqueue-notification', {
        action: 'enqueueForBookingStatusChange',
        payload: { bookingId: b1Id, newStatus: 'confirmed', clientId, clientEmail, businessName: 'Pro Marketing Ideas' }
    });
    console.log(`  └─ /api/enqueue-notification (Confirmed) -> HTTP ${resB.status} | Respuesta:`, JSON.stringify(resB.data));

    await delay(1500);

    // ==========================================
    // ESCENARIO 2: CREAR Y RECHAZAR
    // ==========================================
    console.log("\n[ESCENARIO 2] -> CREACIÓN Y RECHAZO");
    const book2Ref = db.collection('bookings').doc();
    const b2Id = book2Ref.id;
    
    // 1. Crear
    await book2Ref.set({
        businessId: bizId, clientId: clientId, clientEmail: clientEmail, businessEmail: bizEmail,
        serviceId: 'svr_002', serviceName: 'Audit Rejected Service', status: 'pending', currency: 'USD',
        price: 50, date: '2026-12-02', time: '14:00',
        createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[A. CREACIÓN] Booking ID: ${b2Id}`);
    
    // Trigger Creation Route
    await fetchRoute('enqueue-notification', {
        action: 'enqueueForBookingCreation',
        payload: { bookingId: b2Id, businessId: bizId, businessName: 'Pro Marketing Ideas', clientName: 'Rivi Pro' }
    });
    
    await fetchRoute('enqueue-notification', {
        action: 'enqueueForClientBookingCreated',
        payload: { bookingId: b2Id, clientId: clientId, clientEmail: clientEmail, businessName: 'Pro Marketing Ideas' }
    });

    await delay(1500);

    // 2. Rechazar
    await book2Ref.update({ status: 'canceled', notesBusiness: 'Lo siento, no tenemos cupo a esa hora.' });
    console.log(`\n[C. RECHAZO] Status cambiado a canceled`);
    
    const resC = await fetchRoute('enqueue-notification', {
        action: 'enqueueForBookingStatusChange',
        payload: { bookingId: b2Id, newStatus: 'canceled', clientId, clientEmail, businessName: 'Pro Marketing Ideas' }
    });
    console.log(`  └─ /api/enqueue-notification (Canceled) -> HTTP ${resC.status} | Respuesta:`, JSON.stringify(resC.data));

    await delay(2000);

    // ==========================================
    // RECOLECCION DE EVIDENCIA EN COLA
    // ==========================================
    console.log("\n==================================================");
    console.log("📊 EVIDENCIA RECOLECTADA EN LA COLA (notification_queue)");
    console.log("==================================================");
    
    const snapQueue = await db.collection('notification_queue')
        .where('entityId', 'in', [b1Id, b2Id])
        .get();

    snapQueue.forEach(doc => {
        const d = doc.data();
        console.log(`📨 [Queue ID: ${doc.id}]`);
        console.log(`    Booking Asignado: ${d.entityId === b1Id ? 'b1Id (Confirmado)' : 'b2Id (Rechazado)'}`);
        console.log(`    Tipo / Action:    ${d.type || d.action}`);
        console.log(`    Target Email:     ${d.targetEmail}`);
        console.log(`    Status Queue:     ${d.status}`);
        console.log(`    Intentos:         ${d.attempts}`);
        console.log(`    -------------`);
    });

    process.exit(0);
}
run();
