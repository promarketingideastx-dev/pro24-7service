import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("🔍 RASTREANDO CITA RECIENTE EN MEMORIA SIN INDEX...");

    const bizId = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'; 
    const clientId = 'wZ6yrwqWPvR6ymhNkpyIKHKZq3x1'; 

    const bookingsSnap = await db.collection('bookings')
        .where('businessId', '==', bizId)
        .get();

    const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const targetBookings = bookings.filter(b => b.clientId === clientId);
    
    if (targetBookings.length === 0) {
        console.log("❌ No se encontró ninguna cita reciente vinculada al usuario y negocio específico.");
        return process.exit(0);
    }

    targetBookings.sort((a, b) => {
        const tA = a.createdAt?.toMillis?.() || 0;
        const tB = b.createdAt?.toMillis?.() || 0;
        return tB - tA;
    });

    const b = targetBookings[0];
    
    console.log(`\n========================================`);
    console.log(`📍 PARTE A — DATOS DE LA CITA RECIENTE`);
    console.log(`========================================`);
    console.log(`- bookingId: ${b.id}`);
    console.log(`- businessId: ${b.businessId}`);
    console.log(`- serviceId: ${b.serviceId}`);
    console.log(`- clientEmail guardado: ${b.clientEmail || 'N/A'}`);
    console.log(`- businessEmail guardado: ${b.businessEmail || 'N/A'}`);
    console.log(`- Status Actual: ${b.status}`);

    console.log(`\n========================================`);
    console.log(`🔔 AUDITORIA DE NOTIFICACIONES PRIVADAS`);
    console.log(`========================================`);
    
    // Check Client notifications
    const clientNotifs = await db.collection('users').doc(clientId).collection('notifications')
        .where('relatedId', '==', b.id).get();
    console.log(`- Campanita Cliente: ${clientNotifs.size > 0 ? '✅ SÍ (' + clientNotifs.size + ' encontradas)' : '❌ NO'}`);
    clientNotifs.forEach(n => console.log(`   └─ Tipo: ${n.data().type}, Título: ${n.data().title}`));

    // Check Business notifications
    const bizNotifs = await db.collection('businesses').doc(bizId).collection('notifications')
        .where('relatedId', '==', b.id).get();
    console.log(`- Campanita Negocio: ${bizNotifs.size > 0 ? '✅ SÍ (' + bizNotifs.size + ' encontradas)' : '❌ NO'}`);
    bizNotifs.forEach(n => console.log(`   └─ Tipo: ${n.data().type}, Título: ${n.data().title}`));

    console.log(`\n========================================`);
    console.log(`📧 AUDITORIA DE CORREOS EN COLA (notification_queue)`);
    console.log(`========================================`);
    
    const emailQueue = await db.collection('notification_queue')
        .where('entityId', '==', b.id).get();
    
    if (emailQueue.empty) {
        console.log("- ❌ NO HAY CORREOS EN LA COLA PARA ESTE BOOKING.");
    } else {
        emailQueue.forEach(d => {
            const data = d.data();
            console.log(`\n📨 TAREA ID: ${d.id}`);
            console.log(`   - Acción/Template: ${data.action || data.template}`);
            console.log(`   - Target Email EXACTO: ${data.targetEmail}`);
            console.log(`   - Status en Queue: ${data.status}`);
            console.log(`   - Intentos: ${data.attempts || 0}`);
            if (data.error) console.log(`   - Error: ${data.error}`);
            
            if (data.action === 'booking_rejected' || data.template === 'booking_rejected') {
                if (data.targetEmail === 'riviprohouston@gmail.com') {
                    console.log(`   ✅ VALIDADO: El correo de rechazo apunta correctamente al Cliente.`);
                } else {
                    console.log(`   ❌ ERROR: El correo de rechazo NO apunta al cliente.`);
                }
            }
        });
    }
}
run();
