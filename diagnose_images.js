const admin = require('firebase-admin');
const fs = require('fs');

const envFile = fs.readFileSync('.env.production.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let val = match[2];
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        val = val.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        env[match[1]] = val;
    }
});

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON))
    });
}

async function run() {
    try {
        const userRecord = await admin.auth().getUserByEmail('promarketingideas.tx@gmail.com');
        console.log('User ID:', userRecord.uid);
        
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
        
        const bucketMatch = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        console.log('\nBucket:', bucketMatch);
        
        const bucket = admin.storage().bucket(bucketMatch);
        
        const [files1] = await bucket.getFiles({ prefix: `business/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (business/${userRecord.uid}/) ---`);
        files1.forEach(file => console.log(file.name));

        const [files2] = await bucket.getFiles({ prefix: `businesses/${userRecord.uid}/` });
        console.log(`\n--- STORAGE FILES (businesses/${userRecord.uid}/) ---`);
        files2.forEach(file => console.log(file.name));

    } catch (e) {
        console.error('Error fetching data:', e);
    }
}
run();
