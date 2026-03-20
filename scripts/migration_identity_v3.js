const admin = require('firebase-admin');
const path = require('path');

// Replace this with the actual path to your service account key later, or parse it from env vars
// For local execution, you can point it to a downloaded JSON.
// Example: const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin (modify initialization as per your environment)
if (!admin.apps.length) {
    // If you pass GOOGLE_APPLICATION_CREDENTIALS in env, it auto-initializes.
    admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

async function migrateIdentities() {
    console.log('--- STARTING IDENTITY V3 MIGRATION ---');

    let nextPageToken;
    let count = 0;
    
    // 1. We iterate over all Firebase Auth users
    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        nextPageToken = listUsersResult.pageToken;

        for (const userRecord of listUsersResult.users) {
            count++;
            const { uid, email, emailVerified, providerData, disabled } = userRecord;
            
            if (!email) {
                console.log(`Skipping UID ${uid} because it has no email.`);
                continue;
            }

            const normalizedEmail = email.toLowerCase().trim();
            const providers = providerData.map(p => p.providerId);
            if (providers.length === 0) {
                providers.push('password'); // Assume password if empty but registered
            }

            // A. Update email_registry
            const regRef = db.collection('email_registry').doc(normalizedEmail);
            const regDoc = await regRef.get();

            let accountStatus = 'active';
            if (disabled) {
                accountStatus = 'blocked';
            }

            if (!regDoc.exists) {
                await regRef.set({
                    email: normalizedEmail,
                    uid: uid,
                    providers: providers,
                    status: accountStatus,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✓ Added ${normalizedEmail} to email_registry`);
            } else {
                // Merge providers if it exists
                const existingProviders = regDoc.data().providers || [];
                const mergedProviders = Array.from(new Set([...existingProviders, ...providers]));
                await regRef.update({
                    providers: mergedProviders,
                    status: accountStatus,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            // B. Update Users Collection
            const userRef = db.collection('users').doc(uid);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();
                const updates = {};

                // Do not falsify email verified!
                updates.emailVerified = emailVerified;
                
                // Give legacy folks a free pass because they signed up before tight checks
                if (userData.legacyTrusted === undefined) {
                    updates.legacyTrusted = true;
                }

                if (!userData.accountStatus) {
                    updates.accountStatus = accountStatus;
                }
                
                if (!userData.onboardingStatus) {
                    // Quick heuristic: If they have a role, they at least finished initial onboarding
                    updates.onboardingStatus = (userData.role || userData.roles?.provider || userData.roles?.client) ? 'completed' : 'not_started';
                }

                if (Object.keys(updates).length > 0) {
                    await userRef.update(updates);
                    console.log(`✓ Updated User Profile for UID ${uid}`);
                }
            } else {
                console.warn(`! UID ${uid} exists in Auth but missing in Users collection.`);
            }
        }
    } while (nextPageToken);

    console.log(`--- MIGRATION COMPLETE ---`);
    console.log(`Total users processed: ${count}`);
}

migrateIdentities().catch(console.error);
