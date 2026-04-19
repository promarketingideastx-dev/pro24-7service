import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Manual simple env loader
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
} else if (fs.existsSync(path.resolve(process.cwd(), '.env'))) {
     const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
     envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

async function getAdminSDK() {
    if (!getApps().length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            let parsedCreds;
            try {
                parsedCreds = JSON.parse(serviceAccountStr);
            } catch (e1) {
                try {
                    const sanitized = serviceAccountStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                    parsedCreds = JSON.parse(sanitized);
                } catch (e2) {
                    const matchProjectId = serviceAccountStr.match(/"project_id"\s*:\s*"([^"]+)"/);
                    const matchClientEmail = serviceAccountStr.match(/"client_email"\s*:\s*"([^"]+)"/);
                    const matchPrivateKey = serviceAccountStr.match(/"private_key"\s*:\s*"([^"]+)"/);
                    if (matchProjectId && matchClientEmail && matchPrivateKey) {
                        parsedCreds = { project_id: matchProjectId[1], client_email: matchClientEmail[1], private_key: matchPrivateKey[1] };
                    } else { throw new Error("CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON is malformed."); }
                }
            }
            credential = cert({
                projectId: parsedCreds.project_id,
                clientEmail: parsedCreds.client_email,
                privateKey: parsedCreds.private_key.replace(/\\n/g, '\n')
            });
        } else {
            const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
            if (fs.existsSync(saPath)) {
                credential = cert(require(saPath));
            } else {
                throw new Error("No service account found");
            }
        }
        initializeApp({ credential });
    }
    return { db: getFirestore() };
}

async function audit() {
    const { db } = await getAdminSDK();
    
    const emails = [
        'riviprohouston@gmail.com',
        'promarketingideas.tx@gmail.com',
        'rivipro2012@yahoo.com',
        'dp@mjrios.com'
    ];
    
    console.log("================= USUARIOS =================\n");
    const usersSnap = await db.collection('users').get();
    for (const doc of usersSnap.docs) {
        const d = doc.data();
        if (emails.includes(d.email)) {
            console.log(`[USER] Email: ${d.email}`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  isProvider: ${d.isProvider}`);
            console.log(`  Roles:`, JSON.stringify(d.roles));
            console.log(`  Status: ${d.accountStatus || 'N/A'}`);
            console.log(`  providerOnboardingStatus: ${d.providerOnboardingStatus || 'N/A'}`);
            console.log(`  Country: ${d.country_code || d.country || d.userLocation?.country || 'N/A'}`);
            console.log(`  businessCountryLocked: ${d.businessCountryLocked || 'N/A'}`);
            console.log('--------------------------------------------------');
        }
    }
    
    const businessNamesToFind = ['Pro Marketing Ideas', 'RIVIPRO', 'MJ RIOS', 'MJ Rios'];

    console.log("\n================= NEGOCIOS PUBLICOS =================\n");
    const pubSnap = await db.collection('businesses_public').get();
    for (const doc of pubSnap.docs) {
        const d = doc.data();
        if (businessNamesToFind.includes(d.name) || businessNamesToFind.includes(d.businessName)) {
            console.log(`[PUBLIC BIZ] Name: ${d.name || d.businessName}`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  ownerUid: ${d.ownerUid}`);
            console.log(`  Country: ${d.location?.country || d.country || 'N/A'}`);
            console.log(`  paymentSettings:`, JSON.stringify(d.paymentSettings || 'MISSING'));
            console.log(`  planData:`, JSON.stringify(d.planData));
            console.log('--------------------------------------------------');
        }
    }
    
    console.log("\n================= NEGOCIOS PRIVADOS =================\n");
    const bizIds = [
      'LtmEbB7ga0Vu4iEZEVDrrXpYjuj1', // Pro Marketing
      'PRyuyfXzLAMjLhhaPSbI7vZWAwt1', // MJ RIOS
      'SVHpyWI0YPahtFhFhRBc8maCQyy2'  // RIVIPRO
    ];
    for (const bizId of bizIds) {
        const docSnap = await db.collection('businesses_private').doc(bizId).get();
        if (docSnap.exists) {
            const d = docSnap.data();
            console.log(`[PRIVATE BIZ] ID: ${docSnap.id}`);
            console.log(`  Plan: ${d.plan || 'N/A'}`);
            console.log(`  Subscription:`, JSON.stringify(d.subscription || 'N/A'));
            console.log(`  paymentSettings:`, JSON.stringify(d.paymentSettings || 'MISSING'));
            console.log('--------------------------------------------------');
        } else {
            console.log(`[PRIVATE BIZ] ID: ${bizId} -> NOT FOUND`);
        }
    }

    console.log("\n================= LEGACY BUSINESSES =================\n");
    const legSnap = await db.collection('businesses').get();
    for (const doc of legSnap.docs) {
        const d = doc.data();
        if (businessNamesToFind.includes(d.name) || businessNamesToFind.includes(d.businessName)) {
            console.log(`[LEGACY BIZ] Name: ${d.name || d.businessName}`);
            console.log(`  ID: ${doc.id}`);
            console.log(`  ownerUid: ${d.ownerUid || d.ownerId}`);
            console.log(`  subscription:`, JSON.stringify(d.subscription || d.planData || 'N/A'));
            console.log('--------------------------------------------------');
        }
    }
}

audit().catch(console.error);
