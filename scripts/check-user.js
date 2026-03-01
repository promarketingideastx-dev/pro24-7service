const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function main() {
    console.log("Looking for rivipro2012@yahoo.com...");

    // Find user in users collection
    const usersSnap = await db.collection('users').where('email', '==', 'rivipro2012@yahoo.com').get();

    if (usersSnap.empty) {
        console.log("User not found in 'users' collection.");
    } else {
        usersSnap.forEach(doc => {
            console.log(`Found in 'users' -> ID: ${doc.id}, data:`, doc.data());
        });
    }

    // Find any business in businesses_public
    const bizSnap = await db.collection('businesses_public').get();
    bizSnap.forEach(doc => {
        const d = doc.data();
        if (d.email === 'rivipro2012@yahoo.com' || (d.ownerEmail && d.ownerEmail === 'rivipro2012@yahoo.com')) {
            console.log(`Found in 'businesses_public' -> ID: ${doc.id}, name: ${d.name}`);
        }
    });

    console.log("Done checking.");
    process.exit(0);
}

main().catch(console.error);
