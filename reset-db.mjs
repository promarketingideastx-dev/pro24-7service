import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync } from 'fs';

const serviceAccountConfig = './serviceAccountKey.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountConfig, 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({
        credential: cert(serviceAccount),
        storageBucket: 'service-marketplace-mvp-28884.firebasestorage.app'
    });
}

const auth = getAuth();
const db = getFirestore();
const bucket = getStorage().bucket();

// Helper para borrado en lote de colecciones enteras
async function deleteCollection(collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(500);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();
    if (snapshot.size === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

// Helper para borrar carpeta de storage
async function deleteStorageFolder(folderPath) {
    const [files] = await bucket.getFiles({ prefix: folderPath });
    for (const file of files) {
        await file.delete();
    }
}

async function executeTotalReset() {
    console.log('🔥 INICIANDO RESET TOTAL DEL ENTORNO 🔥');

    try {
        // 1. Borrar todos los usuarios de Firebase Auth en lotes de 1000
        console.log('1. Purgando Firebase Auth...');
        const listUsersResult = await auth.listUsers(1000);
        const uids = listUsersResult.users.map((userRecord) => userRecord.uid);
        if (uids.length > 0) {
            await auth.deleteUsers(uids);
            console.log(`   ✅ Eliminados ${uids.length} usuarios de Auth.`);
        } else {
            console.log('   ✅ Auth ya está vacío (0 usuarios).');
        }

        // 2. Limpiar todas las colecciones principales en Firestore (y sus subcolecciones manuales si aplica)
        console.log('\n2. Purgando Colecciones de Firestore...');
        
        // Users
        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
           await deleteCollection(`users/${userDoc.id}/favorites`);
        }
        await deleteCollection('users');
        console.log(`   ✅ /users -> Borrado (incluidas subcolecciones favorites).`);

        // Businesses (y derivados)
        await deleteCollection('businesses');
        console.log(`   ✅ /businesses -> Borrado.`);
        await deleteCollection('businesses_public');
        console.log(`   ✅ /businesses_public -> Borrado.`);
        await deleteCollection('businesses_private');
        console.log(`   ✅ /businesses_private -> Borrado.`);

        // Entidades transaccionales
        await deleteCollection('appointments');
        console.log(`   ✅ /appointments -> Borrado.`);
        await deleteCollection('reviews');
        console.log(`   ✅ /reviews -> Borrado.`);

        // 3. Purgar Firebase Storage
        console.log('\n3. Purgando Archivos en Storage...');
        await deleteStorageFolder('business_images/');
        console.log(`   ✅ business_images/ -> Vaciado.`);
        await deleteStorageFolder('portfolios/');
        console.log(`   ✅ portfolios/ -> Vaciado.`);
        await deleteStorageFolder('avatars/');
        console.log(`   ✅ avatars/ -> Vaciado.`);
        
        console.log('\n✅ RESET TOTAL COMPLETADO CON ÉXITO.');

        // Re-Verificación Final
        console.log('\n--- VERIFICACIÓN POST-RESET ---');
        const finalUsers = await auth.listUsers(10);
        console.log(`   Auth Users: ${finalUsers.users.length}`);
        
        const finalUsersDocs = await db.collection('users').count().get();
        console.log(`   Firestore /users: ${finalUsersDocs.data().count}`);
        
        const finalBizDocs = await db.collection('businesses').count().get();
        console.log(`   Firestore /businesses: ${finalBizDocs.data().count}`);

    } catch (error) {
        console.error('❌ ERROR CRÍTICO DURANTE EL RESET:', error);
    }
}

executeTotalReset();
