import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

let serviceAccountString = readFileSync('./safekey.json', 'utf8').replace(/\n(?!})/g, '\\n').replace(/\\\\n/g, '\\n');
const serviceAccount = JSON.parse(serviceAccountString);

const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

async function testServicesEmployees() {
    const businessId = 'PRyuyfXzLAMjLhhaPSbI7vZWAwt1';
    
    try {
        console.log("Fetching services...");
        const servicesRef = db.collection(`businesses/${businessId}/services`);
        const snapshot = await servicesRef.where('active', '==', true).get(); // guessing the query?
        console.log("Services fetched");
    } catch(e) { console.error("SERVICES ERROR:", e.message) }
    
    try {
        console.log("Fetching employees...");
        const snapshot = await db.collection(`businesses/${businessId}/employees`).get();
        console.log("Employees fetched");
    } catch (e) { console.error("EMPLOYEES ERROR:", e.message) }
}
testServicesEmployees().catch(console.error);
