const admin = require('firebase-admin');

// Ensure we have credentials
try {
  const serviceAccount = require('./serviceAccountKey.json');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();

  async function check() {
    console.log("Checking notification_queue...");
    const snapshot = await db.collection('notification_queue').orderBy('createdAt', 'desc').limit(20).get();
    if (snapshot.empty) {
      console.log("NO EMAILS IN FIRESTORE QUEUE.");
    } else {
      snapshot.forEach(doc => {
        const d = doc.data();
        console.log(`ID: ${doc.id} | Status: ${d.status} | Email: ${d.targetEmail} | Channel: ${d.channel}`);
      });
    }
  }

  check().catch(console.error);
} catch (e) {
  console.log("Could not load firebase-service-account.json", e.message);
}
