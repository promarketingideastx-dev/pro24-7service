import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const auth = admin.auth();

async function listAll() {
    const list = await auth.listUsers(100);
    list.users.forEach(u => {
        console.log(`- ${u.email} (UID: ${u.uid})`);
        if (u.customClaims) {
            console.log(`  Claims:`, u.customClaims);
        }
    });
}

listAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
