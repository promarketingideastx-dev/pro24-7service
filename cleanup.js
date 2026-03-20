const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function run() {
    const uid = '3LwdusPdlBXzppFzFuSzq0130Jp2';
    console.log("Removing providerOnboardingStatus from user:", uid);
    
    await db.collection('users').doc(uid).update({
        providerOnboardingStatus: FieldValue.delete()
    });
    
    console.log("Field deleted successfully. Validating...");
    const userDoc = await db.collection('users').doc(uid).get();
    const data = userDoc.data();
    
    if (data && !('providerOnboardingStatus' in data)) {
        console.log("SUCCESS: providerOnboardingStatus is no longer in the document.");
    } else {
        console.log("FAILED to verify deletion.");
    }
    
    process.exit(0);
}

run().catch(console.error);
