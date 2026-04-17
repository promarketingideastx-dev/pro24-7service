import * as admin from 'firebase-admin';

// Initialize Firebase Admin safely across hot-reloads
if (!admin.apps.length) {
    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (serviceAccountStr) {
        try {
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
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: parsedCreds.project_id,
                    clientEmail: parsedCreds.client_email,
                    privateKey: parsedCreds.private_key.replace(/\\n/g, '\n')
                })
            });
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
