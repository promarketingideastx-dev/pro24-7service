import * as admin from 'firebase-admin';

// Initialize Firebase Admin safely across hot-reloads
if (!admin.apps.length) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountStr) {
        try {
            // Unbreakable parser using Regex to avoid JSON stringify/literal collision
            const matchProjectId = serviceAccountStr.match(/"project_id"\s*:\s*"([^"]+)"/);
            const matchClientEmail = serviceAccountStr.match(/"client_email"\s*:\s*"([^"]+)"/);
            const matchPrivateKey = serviceAccountStr.match(/"private_key"\s*:\s*"([^"]+)"/);
            
            if (matchProjectId && matchClientEmail && matchPrivateKey) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: matchProjectId[1],
                        clientEmail: matchClientEmail[1],
                        privateKey: matchPrivateKey[1].replace(/\\n/g, '\n')
                    })
                });
            } else {
                throw new Error("Missing required credentials in FIREBASE_SERVICE_ACCOUNT_JSON regex match. JSON parse fallback dropped for security.");
            }
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
            admin.initializeApp({ credential: admin.credential.applicationDefault() });
        }
    } else {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
}

export const db = admin.firestore();
export const auth = admin.auth();
