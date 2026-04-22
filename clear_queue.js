const admin = require('firebase-admin');
const fs = require('fs');

const envPath = '.env.local';
let serviceAccountStr = '';
const text = fs.readFileSync(envPath, 'utf8');
text.split('\n').forEach(line => {
    if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON=')) {
        let val = line.substring('FIREBASE_SERVICE_ACCOUNT_JSON='.length).trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
        serviceAccountStr = val.replace(/\\n/g, '\n');
    }
});

const serviceAccount = JSON.parse(serviceAccountStr);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function cleanQueue() {
    console.log('[CleanQueue] Iniciando limpieza de correos atrasados...');
    try {
        const queueRef = db.collection('notification_queue');
        const snapshot = await queueRef.where('status', '==', 'pending').get();
        
        if (snapshot.empty) {
            console.log('[CleanQueue] No hay correos pendientes viejos.');
            process.exit(0);
        }

        console.log(`[CleanQueue] Encontrados ${snapshot.size} correos pendientes para purgar...`);
        const batch = db.batch();
        
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'canceled',
                reason: 'system_wipe_migration',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        console.log(`[CleanQueue] Completado. ${snapshot.size} correos desactivados y marcados como canceled.`);
        process.exit(0);
    } catch (err) {
        console.error('[CleanQueue] Error:', err);
        process.exit(1);
    }
}

cleanQueue();
