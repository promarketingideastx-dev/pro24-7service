import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccountConfig = './serviceAccountKey.json';
const serviceAccount = JSON.parse(readFileSync(serviceAccountConfig, 'utf8'));

if (!initializeApp.apps?.length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const auth = getAuth();
const db = getFirestore();

async function bootstrapCEO() {
    const ceoEmail = 'promarketingideas.tx@gmail.com';
    console.log(`🚀 INICIANDO BOOTSTRAP DE CEO PARA: ${ceoEmail}`);

    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(ceoEmail);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('⚠️ LA CUENTA CEO AÚN NO EXISTE EN FIREBASE AUTH.');
                console.log('Debes ir AHORA a la app (https://www.pro247ya.com) y crear la cuenta usando este correo de forma normal.');
                console.log('Una vez que la cuenta exista, corre este script nuevamente para otorgar los permisos de admin.');
                return;
            }
            throw error;
        }

        console.log(`✅ Cuenta encontrada en Auth. UID: ${userRecord.uid}`);

        // Set Custom Claims (Backend Security)
        await auth.setCustomUserClaims(userRecord.uid, { admin: true });
        console.log(`✅ Custom Claims de Auth configurados (admin: true).`);

        // Configure Firestore Document
        const userRef = db.collection('users').doc(userRecord.uid);
        const docSnap = await userRef.get();
        
        if (docSnap.exists) {
            await userRef.update({
                'roles.admin': true,
                 role: 'admin'
            });
            console.log(`✅ Documento Firestore users/${userRecord.uid} actualizado con rol de admin.`);
        } else {
            console.error('❌ ERROR CRÍTICO: La cuenta existe en Auth pero NO en Firestore. Hubo un error al registrarse o se borró manual.');
            return;
        }

        console.log('\n✅ BOOTSTRAP DE CEO COMPLETADO EXITOSAMENTE.');
        console.log('Para que los cambios surtan efecto en el frontend de la persona, debe CERRAR SESIÓN y volver a ENTRAR.');

    } catch (error) {
        console.error('❌ Error durante Bootstrap:', error);
    }
}

bootstrapCEO();
