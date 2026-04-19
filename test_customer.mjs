import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./safekey.json', 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

async function testCRM() {
    const businessId = 'PRyuyfXzLAMjLhhaPSbI7vZWAwt1';
    
    const snap = await db.collection('customers')
            .where('businessId', '==', businessId)
            .get();
            
    console.log(`Total customers: ${snap.docs.length}`);
    snap.docs.slice(0, 3).forEach(doc => {
       console.log(`Customer ${doc.id}: ${JSON.stringify(doc.data())}`);
    });
}
testCRM().catch(console.error);
