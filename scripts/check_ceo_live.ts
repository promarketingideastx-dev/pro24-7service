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
    const uid = 'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1'; // The new CEO UID

    console.log("=== USER DOC ===");
    const user = await db.collection('users').doc(uid).get();
    console.log(JSON.stringify(user.data(), null, 2));

    console.log("\n=== BUSINESS PUBLIC DOC ===");
    const bizPublic = await db.collection('businesses_public').doc(uid).get();
    if(bizPublic.exists) console.log(JSON.stringify(bizPublic.data(), null, 2));
    else console.log("NO PUBLIC BUSINESS DOC");

    console.log("\n=== BUSINESS PRIVATE DOC ===");
    const bizPrivate = await db.collection('businesses_private').doc(uid).get();
    if(bizPrivate.exists) console.log(JSON.stringify(bizPrivate.data(), null, 2));
    else console.log("NO PRIVATE BUSINESS DOC");

    console.log("\n=== GHOSTS CHECK ===");
    const users = await db.collection('users').get();
    for (const doc of users.docs) {
        const data = doc.data();
        if (data.email === 'promarketingideas.tx@gmail.com' && doc.id !== uid) {
            console.log(`GHOST USER SURVIVED: ${doc.id}`);
            await doc.ref.delete();
            console.log(`DELETED GHOST USER: ${doc.id}`);
        }
    }

    const biz = await db.collection('businesses_public').get();
    for (const doc of biz.docs) {
       const data = doc.data();
       if (data.name === 'Pro Marketing Ideas' || data.email === 'promarketingideas.tx@gmail.com' || data.email === 'javier.mercado.tx@gmail.com') {
            console.log(`GHOST BIZ SURVIVED: ${doc.id}`);
            await db.collection('businesses_public').doc(doc.id).delete();
            await db.collection('businesses_private').doc(doc.id).delete();
            await db.collection('businesses').doc(doc.id).delete();
            console.log(`DELETED GHOST BIZ: ${doc.id}`);
       }
    }
}

main().catch(console.error);
