const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env.production.local' });

const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '';
// dotenv parses \n into real newlines. JSON.parse requires literal \n for strings.
const cleanJson = rawJson.replace(/\n/g, '\\n').replace(/\r/g, '');

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(cleanJson))
        });
    } catch (e) {
        console.error("Failed parsing JSON:");
        console.error(cleanJson);
        process.exit(1);
    }
}

async function run() {
    try {
        const userRecord = await admin.auth().getUserByEmail('promarketingideas.tx@gmail.com');
        console.log('User ID:', userRecord.uid);
        console.log('\n=======================================');
        const db = admin.firestore();
        const publicDoc = await db.collection('businesses').doc(userRecord.uid).get();
        console.log('\n--- PUBLIC PROFILE IMAGES (businesses/{business_id}) ---');
        const pubData = publicDoc.data() || {};
        console.log('coverImage:   ', pubData.coverImage);
        console.log('logoUrl:      ', pubData.logoUrl);
        console.log('images (Array):', pubData.images);

        const privateDoc = await db.collection('businesses').doc(userRecord.uid).collection('private').doc('data').get();
        console.log('\n--- PRIVATE PROFILE IMAGES (businesses/{business_id}/private/data) ---');
        const privData = privateDoc.data() || {};
        console.log('gallery (Array):', privData.gallery);
        console.log('logoUrl:        ', privData.logoUrl);

        const bucketMatch = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        console.log('\nBucket:', bucketMatch);

        const bucket = admin.storage().bucket(bucketMatch);

        const [files1] = await bucket.getFiles({ prefix: `business/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (business/${userRecord.uid}/) ---`);
        files1.forEach(file => console.log(file.name));

        const [files2] = await bucket.getFiles({ prefix: `businesses/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (businesses/${userRecord.uid}/) ---`);
        files2.forEach(file => console.log(file.name));
        console.log('\n=======================================');

    } catch (e) {
        console.error('Error fetching data:', e);
    }
}
run();
