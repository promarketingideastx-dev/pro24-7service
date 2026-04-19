const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const key = require('./serviceAccountKey.json');
if (!require('firebase-admin').apps.length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function run() {
    const snap = await db.collection('bookings').orderBy('createdAt', 'asc').limit(5).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(JSON.stringify(docs, null, 2));
}
run();
