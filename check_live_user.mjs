import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    console.log("==================================================");
    console.log("🔍 AUDITORÍA EN VIVO: riviprohouston@gmail.com / promarketingideas.tx@gmail.com");
    console.log("==================================================");
    
    // 1. Identificar Usuarios
    const clientUser = await admin.auth().getUserByEmail('riviprohouston@gmail.com').catch(() => null);
    const bizUser = await admin.auth().getUserByEmail('promarketingideas.tx@gmail.com').catch(() => null);

    if (!clientUser) return console.log("❌ Cliente no encontrado en Auth");
    if (!bizUser) return console.log("❌ Negocio no encontrado en Auth");

    console.log(`👤 Client UID: ${clientUser.uid}`);
    console.log(`🏢 Business Owner UID: ${bizUser.uid}`);

    // 2. Revisar FCM Tokens (PUSH)
    const clientDoc = await db.collection('users').doc(clientUser.uid).get();
    const bizDoc = await db.collection('users').doc(bizUser.uid).get();

    console.log("\n📲 [PUSH] Tokens Registrados:");
    console.log(`   Cliente (riviprohouston): ${clientDoc.data()?.fcmTokens?.length || 0} tokens`);
    if(clientDoc.data()?.fcmTokens?.length > 0) console.log(`      -> Ej: ${clientDoc.data().fcmTokens[0].substring(0, 20)}...`);
    
    console.log(`   Negocio (promarketingideas): ${bizDoc.data()?.fcmTokens?.length || 0} tokens`);
    if(bizDoc.data()?.fcmTokens?.length > 0) console.log(`      -> Ej: ${bizDoc.data().fcmTokens[0].substring(0, 20)}...`);

    // 3. Revisar Campanitas (IN-APP)
    console.log("\n🔔 [IN-APP] Últimas 3 Campanitas del Cliente:");
    const clientNotifs = await db.collection('users').doc(clientUser.uid).collection('notifications')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

    if (clientNotifs.empty) {
        console.log("   ❌ NO HAY campanitas para este usuario.");
    } else {
        clientNotifs.forEach(doc => {
            const d = doc.data();
            const date = d.createdAt ? d.createdAt.toDate().toLocaleString('es-HN') : 'Sin fecha';
            console.log(`   🔸 [${date}] TIPO: ${d.type} | LEÍDA: ${d.read} | Título: ${d.title}`);
        });
    }

    // 4. Últimos Bookings Reales
    console.log("\n📅 [BOOKINGS] Últimas 2 Citas entre estos dos usuarios:");
    const bookings = await db.collection('bookings')
        .where('clientId', '==', clientUser.uid)
        .get();

    // in-memory filter and sort
    const filtered = bookings.docs
        .map(b => ({ id: b.id, data: b.data() }))
        .filter(b => b.data.businessEmail === 'promarketingideas.tx@gmail.com')
        .sort((a, b) => (b.data.createdAt?.toMillis() || 0) - (a.data.createdAt?.toMillis() || 0))
        .slice(0, 2);

    if (filtered.length === 0) {
        console.log("   ❌ No hay citas recientes entre ellos.");
        process.exit(0);
    }

    const recentBookingIds = [];
    filtered.forEach(b => {
        recentBookingIds.push(b.id);
        console.log(`   🔹 ID: ${b.id} | Status: ${b.data.status} | Creada: ${b.data.createdAt?.toDate().toLocaleString()}`);
    });

    // 5. Revisar la COLA DE CORREOS (QUEUE) para estas citas
    console.log("\n📧 [EMAILS] Estado en la Cola de Notificaciones para riviprohouston@gmail.com:");
    const queue = await db.collection('notification_queue')
        .where('targetEmail', 'in', ['riviprohouston@gmail.com', 'promarketingideas.tx@gmail.com'])
        .get();

    if (queue.empty) {
        console.log("   ❌ NO HAY correos en cola para estas citas.");
    } else {
        const filteredQueue = queue.docs
            .map(q => ({ id: q.id, data: q.data() }))
            .sort((a, b) => (b.data.createdAt?.toMillis() || 0) - (a.data.createdAt?.toMillis() || 0))
            .slice(0, 10);

        filteredQueue.forEach(q => {
            const d = q.data;
            console.log(`   ✉️  Queue ID: ${q.id} (Entity: ${d.entityId})`);
            console.log(`      Target: ${d.targetEmail}`);
            console.log(`      Acción: ${d.type || d.action}`);
            console.log(`      Estado Cola: [${d.status?.toUpperCase()}]`);
            console.log(`      Intentos Fallidos: ${d.attempts}`);
            if (d.lastError) console.log(`      ⚠️ ERROR de Resend: ${d.lastError}`);
            if (d.sentAt) console.log(`      ✅ Enviado a Resend: ${d.sentAt.toDate().toLocaleString()}`);
            console.log(`      --`);
        });
    }

    process.exit(0);
}
run();
