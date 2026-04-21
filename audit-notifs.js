const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const fiveMinsAgo = new Date(Date.now() - 30 * 60 * 1000); // last 30 mins just in case
  console.log("Checking business_notifications collection group for items created after", fiveMinsAgo);

  const snapshot = await db.collectionGroup('items').where('createdAt', '>=', fiveMinsAgo).get();
  if (snapshot.empty) {
    console.log("No recent notifications found in 'items' collectionGroup.");
  } else {
    snapshot.forEach(doc => {
      console.log(`\nDocPath: ${doc.ref.path}`);
      console.log('Data:', doc.data());
    });
  }
}
run().catch(console.error).finally(() => process.exit(0));
