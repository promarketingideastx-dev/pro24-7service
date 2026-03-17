import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Note: Replace with the actual path to your service account key if needed,
// or rely on application default credentials if GOOGLE_APPLICATION_CREDENTIALS is set.
// For local testing without a service account JSON, we might not be able to run this easily if not initialized.
// Since this is a standard Firebase project, I'll assume you have a local emulator or admin credentials.

async function run() {
    try {
        // Initialize admin SDK
        // We need the service account key. 
        // We will try finding the default key or fallback.
        
        console.log("Looking for Firebase Admin credentials...");
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
        
        if (!fs.existsSync(credPath)) {
             console.error(`Missing serviceAccountKey.json at ${credPath}. Please obtain one or run this inside an authenticated environment.`);
             process.exit(1);
        }

        admin.initializeApp({
            credential: admin.credential.cert(credPath)
        });

        const db = admin.firestore();
        const emailToTest = 'pro_trial_beta@example.com';

        // 1. Get user by email
        const userRecord = await admin.auth().getUserByEmail(emailToTest);
        const uid = userRecord.uid;
        console.log(`Found UID: ${uid} for ${emailToTest}`);

        // 2. Mock completing their onboarding
        const userRef = db.collection('users').doc(uid);
        
        const now = Date.now();
        const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);
        const expiredDate = now - (3 * 24 * 60 * 60 * 1000); // Expired 3 days ago

        await userRef.set({
            roles: { client: true, provider: true },
            providerOnboardingStatus: 'completed',
            isBusinessActive: true,
            selectedPlan: 'premium',
            businessProfileId: uid, // Use their own UID as business ID for simplicity
            subscription: {
                plan: 'premium',
                status: 'trial',
                trialStartAt: tenDaysAgo,
                trialEndAt: expiredDate, // This ensures Date.now() > trialEndAt
                isActive: true
            }
        }, { merge: true });

        console.log(`Successfully mocked an expired trial for ${emailToTest}`);
        console.log("Next: When the user logs in, BusinessGuard should force an expiration check, change status to 'expired', and redirect to /business/trial-expired.");

        process.exit(0);
    } catch (e) {
        console.error("Error running script:", e);
        process.exit(1);
    }
}

run();
