/**
 * CLEANUP: Elimina todos los negocios y usuarios de Firestore/Auth,
 * EXCEPTO los emails en KEEP_EMAILS.
 *
 * Run: node scripts/cleanup-data.js
 * Requires: serviceAccountKey.json en la raíz del proyecto
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

// ── Emails a conservar ─────────────────────────────────────────────────────
const KEEP_EMAILS = new Set([
    'promarketingideas.tx@gmail.com',
    'abigail220795@gmail.com',
    'directorguty@gmail.com',
]);
// ──────────────────────────────────────────────────────────────────────────

const COLLECTIONS_TO_CLEAN = [
    'businesses_public',
    'businesses_private',
    'businesses',
];

async function getKeepUids() {
    const keepUids = new Set();
    for (const email of KEEP_EMAILS) {
        try {
            const user = await auth.getUserByEmail(email);
            keepUids.add(user.uid);
            console.log(`✓ Conservando: ${email} → UID: ${user.uid}`);
        } catch (e) {
            console.warn(`⚠️  No encontrado en Auth: ${email}`);
        }
    }
    return keepUids;
}

async function deleteCollection(collectionName, keepUids) {
    const snap = await db.collection(collectionName).get();
    let deleted = 0;
    const batch = db.batch();

    for (const docSnap of snap.docs) {
        if (!keepUids.has(docSnap.id)) {
            batch.delete(docSnap.ref);
            deleted++;
        }
    }

    if (deleted > 0) {
        await batch.commit();
    }
    console.log(`🗑️  ${collectionName}: eliminados ${deleted} docs`);
}

async function deleteFirestoreUsers(keepUids) {
    const snap = await db.collection('users').get();
    let deleted = 0;
    const batch = db.batch();

    for (const docSnap of snap.docs) {
        if (!keepUids.has(docSnap.id)) {
            batch.delete(docSnap.ref);
            deleted++;
        }
    }

    if (deleted > 0) {
        await batch.commit();
    }
    console.log(`🗑️  users: eliminados ${deleted} docs`);
}

async function deleteAuthUsers(keepUids) {
    let deleted = 0;
    let pageToken;

    do {
        const listResult = await auth.listUsers(1000, pageToken);
        const toDelete = listResult.users
            .filter(u => !keepUids.has(u.uid))
            .map(u => u.uid);

        if (toDelete.length > 0) {
            const result = await auth.deleteUsers(toDelete);
            deleted += result.successCount;
            if (result.failureCount > 0) {
                console.warn(`⚠️  ${result.failureCount} errores al eliminar de Auth`);
            }
        }

        pageToken = listResult.pageToken;
    } while (pageToken);

    console.log(`🗑️  Firebase Auth: eliminados ${deleted} usuarios`);
}

async function main() {
    console.log('\n🚨 INICIANDO LIMPIEZA DE DATOS\n');
    console.log('Conservando:', [...KEEP_EMAILS].join(', '));
    console.log('─'.repeat(50));

    const keepUids = await getKeepUids();
    console.log(`\nUIDs a conservar: ${keepUids.size}`);
    console.log('─'.repeat(50));

    // 1. Limpiar colecciones de negocios
    for (const col of COLLECTIONS_TO_CLEAN) {
        await deleteCollection(col, keepUids);
    }

    // 2. Limpiar colección de usuarios en Firestore
    await deleteFirestoreUsers(keepUids);

    // 3. Limpiar Firebase Authentication
    await deleteAuthUsers(keepUids);

    console.log('\n✅ Limpieza completada.\n');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
});
