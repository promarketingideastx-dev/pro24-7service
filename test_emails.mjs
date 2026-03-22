import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Inicializar BD
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

const BIZ_EMAIL = 'soporte@pro247ya.com';
const CLI_EMAIL = 'promarketingideastx@gmail.com'; // Puedes cambiarlo si gustas

async function runEmailTest() {
    console.log("🚀 INICIANDO TEST CONTROLADO DE EMAIL (AISLADO)\n");

    try {
        // 1. Inyectar Prueba Cliente -> Negocio (El cliente creó una cita, avisar al negocio)
        console.log("📦 1. Encolando [Cliente -> Negocio] (booking_created)...");
        const bizTargetRef = await db.collection('notification_queue').add({
            targetUid: 'TEST_BIZ_UID',
            targetEmail: BIZ_EMAIL,
            channel: 'email',
            type: 'booking_created', // Plantilla Negocio
            entityId: 'epqiBwtvKACCj5rTaz3e',
            status: 'pending',
            scheduledFor: admin.firestore.FieldValue.serverTimestamp(), // Inmediato
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Creado Doc ID: ${bizTargetRef.id} dirigido a ${BIZ_EMAIL}`);

        // 2. Inyectar Prueba Negocio -> Cliente (El negocio aprobó la cita, avisar al cliente)
        console.log("📦 2. Encolando [Negocio -> Cliente] (booking_confirmed)...");
        const cliTargetRef = await db.collection('notification_queue').add({
            targetUid: 'TEST_CLI_UID',
            targetEmail: CLI_EMAIL,
            channel: 'email',
            type: 'booking_confirmed', // Plantilla Cliente
            entityId: 'epqiBwtvKACCj5rTaz3e',
            status: 'pending',
            scheduledFor: admin.firestore.FieldValue.serverTimestamp(), // Inmediato
            attempts: 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ Creado Doc ID: ${cliTargetRef.id} dirigido a ${CLI_EMAIL}\n`);

        // 3. Detonar el CRON Real en local (o apuntar a PROD)
        console.log("⚙️ 3. Disparando el Cronjob de PROD (https://pro247ya.com/api/cron/process-notifications)...");
        const cronRes = await fetch('https://pro247ya.com/api/cron/process-notifications', {
            method: 'GET',
            headers: {
                'x-vercel-cron': '1'
            }
        });
        
        console.log(`   Cron Respuesta HTTP: ${cronRes.status} ${cronRes.statusText}`);
        
        let cronJson = {};
        try {
            cronJson = await cronRes.json();
            console.log(`   Rendimiento del Cron:`, cronJson);
        } catch(e) {
             console.log("   (Cron no devolvió JSON o dio timeout)");
        }

        // 4. Pausar unos 3 segundos para darle tiempo a Firestore a actualizar
        console.log("\n⏳ Esperando 5 segundos para consolidación...");
        await new Promise(r => setTimeout(r, 5000));

        // 5. Verificar estado final
        console.log("\n🔍 4. Verificando resultados reales en la Base de Datos...");
        
        const bDoc = await bizTargetRef.get();
        const cDoc = await cliTargetRef.get();

        const bData = bDoc.data();
        const cData = cDoc.data();

        console.log("\n--- RESULTADO CLIENTE -> NEGOCIO ---");
        console.log(`ID: ${bDoc.id}`);
        console.log(`Target: ${bData.targetEmail}`);
        console.log(`Type: ${bData.type}`);
        console.log(`Status Final: [${bData.status.toUpperCase()}]`);
        if (bData.lastError) console.log(`Falla reportada: ${bData.lastError}`);

        console.log("\n--- RESULTADO NEGOCIO -> CLIENTE ---");
        console.log(`ID: ${cDoc.id}`);
        console.log(`Target: ${cData.targetEmail}`);
        console.log(`Type: ${cData.type}`);
        console.log(`Status Final: [${cData.status.toUpperCase()}]`);
        if (cData.lastError) console.log(`Falla reportada: ${cData.lastError}`);
        
        console.log("\n✅ PRUEBA FINALIZADA.");
    } catch (e) {
        console.error("❌ ERROR CRÍTICO EN EL TEST:", e);
    }

    process.exit(0);
}

runEmailTest();
