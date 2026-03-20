import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({ credential: cert(serviceAccount) });
}

const uid = 'QMBk3t6C5ndI7V4xbzLJxZ4x2Dw2';

async function deleteAccount() {
    try {
        await getFirestore().collection('users').doc(uid).delete();
        console.log('✅ Eliminado de Firestore');
        await getAuth().deleteUser(uid);
        console.log('✅ Eliminado de Auth');
    } catch (e) {
        console.log('Error:', e);
    }
}

deleteAccount();
