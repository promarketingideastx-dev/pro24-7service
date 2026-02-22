// Script temporal para verificar/setear isAdmin en Firestore
// Uso: node scripts/set-admin.mjs <USER_EMAIL>
// Este script solo es para desarrollo local

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');

if (!serviceAccount.project_id) {
    console.log('❌ FIREBASE_ADMIN_KEY env var not set.');
    console.log('\n📋 Alternativa: Ve a Firebase Console y edita el documento manualmente:');
    console.log('   1. Abre https://console.firebase.google.com');
    console.log('   2. Selecciona el proyecto PRO24/7');
    console.log('   3. Ve a Firestore → Colección "users"');
    console.log('   4. Busca el documento de tu cuenta de admin');
    console.log('   5. Agrega el campo: isAdmin = true (boolean)');
    process.exit(0);
}
