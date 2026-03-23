import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function run() {
    const bizId = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1';
    console.log(`🔍 SINCRONIZANDO NEGOCIO ${bizId}...`);
    
    const pDoc = await db.collection('businesses_public').doc(bizId).get();
    if (!pDoc.exists) {
        console.log("❌ NO SE ENCONTRÓ EN businesses_public.");
        process.exit(1);
    }
    
    const pData = pDoc.data();
    
    // The target private document data
    const privateData = {
        name: pData.name || null,
        ownerUid: pData.ownerUid || null,
        email: pData.email || 'promarketingideas.tx@gmail.com', // fallback to valid owner email
        contactInfo: pData.contactInfo || { email: 'promarketingideas.tx@gmail.com', phone: pData.phone || '' },
        phone: pData.phone || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Also, grab the User to copy FCM tokens to the private business root if needed 
    // or just let the business read it from the user document, but usually businesses don't duplicate tokens.
    // Let's just create the private document correctly.

    await db.collection('businesses').doc(bizId).set(privateData, { merge: true });
    
    console.log(`✅ SINCRONIZACIÓN EXITOSA.`);
    
    const newDoc = await db.collection('businesses').doc(bizId).get();
    console.log(`   DATOS ACTUALIZADOS EN 'businesses':`);
    console.log(`   - name: ${newDoc.data().name}`);
    console.log(`   - ownerUid: ${newDoc.data().ownerUid}`);
    console.log(`   - email: ${newDoc.data().email}`);
    
    process.exit(0);
}
run();
