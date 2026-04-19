require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

try {
  let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccount) {
    console.error("FIREBASE_SERVICE_ACCOUNT_JSON is missing");
    process.exit(1);
  }
  
  // Unescape the newlines if it's stored as a string with literal \n
  if (typeof serviceAccount === 'string' && serviceAccount.includes('\\n')) {
    serviceAccount = serviceAccount.replace(/\\n/g, '\n');
  }

  const credential = admin.credential.cert(JSON.parse(serviceAccount));

  admin.initializeApp({
    credential: credential,
  });

  const db = admin.firestore();

  async function restore() {
    console.log("Restoring active countries...");
    await db.collection("crm_settings").doc("global").set({
      activeCountries: ["HN", "US"],
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("Success! Honduras and USA are active.");
    process.exit(0);
  }

  restore();
} catch (error) {
  console.error("Failed:", error);
  process.exit(1);
}
