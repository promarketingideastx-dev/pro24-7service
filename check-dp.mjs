import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccountPath = './serviceAccountKey.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const auth = getAuth();
const db = getFirestore();

async function checkAccount() {
    const email = 'dp@mjrios.com';
    console.log(`--- Buscando a ${email} ---`);
    try {
        const userRecord = await auth.getUserByEmail(email);
        console.log('✅ ENCONTRADO EN AUTH:');
        console.log(`UID: ${userRecord.uid}`);
        console.log(`Email: ${userRecord.email}`);
        console.log(`Creado: ${userRecord.metadata.creationTime}`);

        const docRef = await db.collection('users').doc(userRecord.uid).get();
        if (docRef.exists) {
            console.log('\n✅ ENCONTRADO EN FIRESTORE (users/{uid}):');
            console.log(JSON.stringify(docRef.data(), null, 2));
        } else {
            console.log('\n❌ NO ENCONTRADO EN FIRESTORE (Fantasma parcial)');
        }
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log('❌ NO ENCONTRADO EN AUTH (El correo no existe en Firebase)');
        } else {
            console.log('Error:', error);
        }
    }
}

checkAccount();
