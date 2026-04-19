const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const key = require('./serviceAccountKey.json');
if (!require('firebase-admin').apps.length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function run() {
    const snap = await db.collection('bookings').orderBy('createdAt', 'desc').limit(10).get();
    const docs = snap.docs.map(d => {
        const item = d.data();
        return {
            id: d.id,
            businessId: item.businessId,
            status: item.status,
            date: item.date,
            time: item.time,
            serviceName: item.serviceName
        }
    });
    console.log(JSON.stringify(docs, null, 2));
}
run();
