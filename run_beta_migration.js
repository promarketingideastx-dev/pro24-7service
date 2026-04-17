const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const { loadEnvConfig } = require('@next/env');
loadEnvConfig(__dirname);

let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!serviceAccountStr) {
    console.error("Could not find FIREBASE_SERVICE_ACCOUNT_JSON in .env.local");
    process.exit(1);
}

let serviceAccount;
try {
    if (!serviceAccountStr) throw new Error("Empty Env");
    const firstBrace = serviceAccountStr.indexOf('{');
    const lastBrace = serviceAccountStr.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) throw new Error("No braces found in env var");
    
    let cleanJson = serviceAccountStr.substring(firstBrace, lastBrace + 1);
    cleanJson = cleanJson.replace(/\r?\n/g, '\\n');
    
    serviceAccount = JSON.parse(cleanJson);
} catch (e) {
    console.error("Error parsing FIREBASE_SERVICE_ACCOUNT_JSON.", e);
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function deepFetchBusinessByOwner(uid) {
    // Try primary
    let bizSnap = await db.collection('businesses').where('ownerUid', '==', uid).get();
    if (!bizSnap.empty) return bizSnap.docs[0];

    // Some apps erroneously saved businesses by email
    bizSnap = await db.collection('businesses').where('contact.email', '==', 'promarketingideas.tx@gmail.com').get();
    if (!bizSnap.empty) return bizSnap.docs[0];

    // Or just grab the very first business if this is a dev db? No, too risky.
    return null;
}

async function runBetaMigration() {
    console.log("Starting Beta Migration for CEO Account...");
    const targetEmail = 'promarketingideas.tx@gmail.com';

    // 1. Find User
    const usersRef = db.collection('users');
    const q = usersRef.where('email', '==', targetEmail);
    const snap = await q.get();

    if (snap.empty) {
        console.error("No exact match. Trying case-insensitive sweep...");
        const allUsers = await usersRef.get();
        const lowered = targetEmail.toLowerCase();
        let foundDocs = [];
        allUsers.forEach(d => {
            const e = d.data().email;
            if (e && e.toLowerCase() === lowered) foundDocs.push(d);
        });
        
        if (foundDocs.length === 0) {
            console.error("CRITICAL: No user found with email:", targetEmail);
            process.exit(1);
        }
        // Use the first matches
        snap.docs = foundDocs;
    }

    let userDoc = snap.docs[0];
    
    // Pick the most complete one if duplicates exist
    if (snap.docs.length > 1) {
        console.warn(`WARNING: Found ${snap.docs.length} users with email ${targetEmail}`);
        const withBiz = snap.docs.find(d => d.data().businessProfileId);
        if (withBiz) userDoc = withBiz;
    }

    const uid = userDoc.id;
    const userData = userDoc.data();
    console.log(`[USER FOUND] UID: ${uid}`);

    let businessId = userData.businessProfileId;
    let bizDocRef = null;

    if (!businessId) {
        console.log("No businessProfileId on user doc. Searching businesses collection...");
        const bizDoc = await deepFetchBusinessByOwner(uid);
        if (bizDoc) {
            businessId = bizDoc.id;
            bizDocRef = bizDoc.ref;
            console.log(`Found orphaned business: ${businessId}. Will link it.`);
        } else {
            console.log("No business found for this ownerUid either.");
        }
    } else {
        bizDocRef = db.collection('businesses').doc(businessId);
    }

    console.log("\n--- APPLYING CANONICAL USER SCHEMA ---");
    const userUpdates = {
        accountStatus: 'active',
        emailVerified: true,
        isBusinessActive: !!businessId, // Keep it logical
        isProvider: true,
        providerOnboardingStatus: 'completed',
        role: 'provider',
        roles: {
            client: true,
            provider: true,
            admin: true,
            ceo: true
        },
        isAdmin: true,
        adminSetAt: new Date().toISOString(),
        subscription: {
            plan: 'vip',
            status: 'active',
            trialStartAt: 0,
            trialEndAt: 0,
            isActive: true
        }
    };

    if (businessId) {
        userUpdates.businessProfileId = businessId;
    }

    await usersRef.doc(uid).update(userUpdates);
    console.log("✅ USER UPDATED");
    console.log(JSON.stringify(userUpdates, null, 2));

    if (businessId && bizDocRef) {
        console.log(`\n--- APPLYING CANONICAL BUSINESS SCHEMA [${businessId}] ---`);
        const bizUpdates = {
            ownerUid: uid,
            status: 'active',
            tier: 'enterprise',
            planData: {
                plan: 'vip',
                planStatus: 'active',
                planSource: 'collaborator_beta',
                planExpiresAt: null,
                teamMemberLimit: 999,
                overriddenByCRM: true
            },
            collaboratorData: {
                activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                activatedBy: uid
            }
        };

        await bizDocRef.update(bizUpdates);
        console.log("✅ BUSINESS UPDATED");
        console.log(JSON.stringify(bizUpdates, null, 2));
    } else {
        console.warn("\n⚠️ CEO Account updated, but NO BUSINESS PROFILE was found to migrate.");
    }

    console.log("\n---- MIGRATION COMPLETE ----");
    process.exit(0);
}

runBetaMigration().catch(console.error);
