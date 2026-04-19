const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const key = require('./serviceAccountKey.json');
if (!require('firebase-admin').apps.length) initializeApp({ credential: cert(key) });
const db = getFirestore();

async function run() {
    const businessId = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'; // Known from QA
    const fallbackQ = db.collection('bookings').where('businessId', '==', businessId);
    const snap = await fallbackQ.get();
    const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const visibleItems = items.filter(b => b.hiddenByBusiness !== true);
    visibleItems.sort((a, b) => {
        if (a.date === b.date) return (b.time || '').localeCompare(a.time || '');
        return (b.date || '').localeCompare(a.date || '');
    });
    console.log(JSON.stringify(visibleItems.map(v => ({id: v.id, date: v.date, time: v.time, status: v.status})), null, 2));
}
run().catch(console.error);
