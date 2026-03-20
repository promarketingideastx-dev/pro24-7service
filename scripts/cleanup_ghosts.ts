import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function main() {
    console.log("=== INICIANDO LIMPIEZA DE FANTASMAS Y CORRECCIONES ===");

    // 1. Delete ghost user doc 'lI0lRgyYF2gO85M2pUuP0q4N3u83'
    try {
        await db.collection('users').doc('lI0lRgyYF2gO85M2pUuP0q4N3u83').delete();
        console.log("✅ Ghost User Document 'lI0lRgyYF2gO85M2pUuP0q4N3u83' deleted from 'users'");
    } catch(e) {
        console.error("Error deleting ghost user:", e);
    }

    // 2. Add 'country_code' to the correct new admin 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'
    try {
        await db.collection('users').doc('LtmEbB7ga0Vu4iEZEVDrrXpYjuj1').update({
            country_code: 'HN'
        });
        console.log("✅ Added country_code: 'HN' to legit ADMIN document 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'");
    } catch(e) {
        console.error("Error updating admin doc:", e);
    }

    // 3. Delete 'Ke1Y5ApFdpeRcwqRTaV7x6fGn8o2' (Pro Marketing Ideas ghost business)
    const ghostBiz1 = 'Ke1Y5ApFdpeRcwqRTaV7x6fGn8o2';
    await db.collection('businesses').doc(ghostBiz1).delete();
    await db.collection('businesses_public').doc(ghostBiz1).delete();
    await db.collection('businesses_private').doc(ghostBiz1).delete();
    console.log(`✅ Ghost Business ${ghostBiz1} removed completely.`);

    // 4. Delete '8H7C7x7K5p6xZ0yTIfqI' (Pro Marketing Ideas ghost auto-id business)
    const ghostBiz2 = '8H7C7x7K5p6xZ0yTIfqI';
    await db.collection('businesses').doc(ghostBiz2).delete();
    await db.collection('businesses_public').doc(ghostBiz2).delete();
    await db.collection('businesses_private').doc(ghostBiz2).delete();
    console.log(`✅ Ghost Business ${ghostBiz2} removed completely.`);

    console.log("LIMPIEZA FINALIZADA.");
}

main().catch(console.error);
