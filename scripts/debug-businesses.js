/**
 * DIAGNOSTIC: Print all businesses_public documents to diagnose visibility issues
 * Run: node scripts/debug-businesses.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    const snap = await db.collection('businesses_public').get();
    console.log(`\n📊 Total businesses_public: ${snap.size}\n`);

    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log('─'.repeat(60));
        console.log(`ID:           ${doc.id}`);
        console.log(`name:         ${d.name}`);
        console.log(`status:       ${d.status ?? '(undefined)'}`);
        console.log(`country:      ${d.country ?? '(undefined)'}`);
        console.log(`countryCode:  ${d.countryCode ?? '(undefined)'}`);
        console.log(`category:     ${d.category ?? '(undefined)'}`);
        console.log(`subcategory:  ${d.subcategory ?? '(undefined)'}`);
        console.log(`subcategories:${JSON.stringify(d.subcategories ?? [])}`);
        console.log(`tags:         ${JSON.stringify((d.tags || []).slice(0, 3))}${(d.tags || []).length > 3 ? '…' : ''}`);
        console.log(`location:     ${JSON.stringify(d.location)}`);
        console.log(`updatedAt:    ${d.updatedAt?.toDate?.() ?? d.updatedAt}`);
    });

    console.log('\n' + '─'.repeat(60));
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
