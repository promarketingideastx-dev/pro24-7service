/**
 * Script for Completely Wiping Firebase Environment (Except 1 Admin User)
 * 
 * Target Admin Email: promarketingideas.tx@gmail.com
 * 
 * Execution:
 * node scripts/wipe_database.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "service-marketplace-mvp-28884.firebasestorage.app" // Adjust if needed
    });
}

const TARGET_EMAIL = 'promarketingideas.tx@gmail.com';
const DB = admin.firestore();
const AUTH = admin.auth();
const STORAGE = admin.storage().bucket();

const COLLECTIONS_TO_WIPE = [
    'users',
    'businesses',
    'businesses_public',
    'businesses_private',
    'appointments',
    'customers',
    'business_customers',
    'disputes',
    'chats', // Requires recursive
    'audit_log',
    'analytics_events',
    'admin_notifications',
    'notification_jobs',
    'business_notifications',
    'client_notifications',
    'businessLeads',
    'vip_invites'
];

let stats = {
    usersDeleted: 0,
    docsDeleted: 0,
    filesDeleted: 0
};

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log(`\n======================================================`);
    console.log(`🔥 FULL FIREBASE WIPE INITIATED 🔥`);
    console.log(`======================================================`);

    try {
        // 1. Get Admin Context
        console.log(`\n[1] Finding Admin Context for: ${TARGET_EMAIL}`);
        const adminUser = await AUTH.getUserByEmail(TARGET_EMAIL).catch(() => null);
        
        if (!adminUser) {
            console.error(`❌ CRITICAL ERROR: Admin user ${TARGET_EMAIL} not found in Auth. Aborting wipe to prevent total loss.`);
            process.exit(1);
        }
        
        const adminUid = adminUser.uid;
        console.log(`    ✅ Admin UID locked: ${adminUid}`);

        // 2. BACKUP Admin Account
        console.log(`\n[2] Executing Admin Backup...`);
        const backupData = {
            timestamp: new Date().toISOString(),
            authRecord: adminUser.toJSON(),
            firestoreRecords: {}
        };

        // Backup Firestore User Doc
        const adminUserDoc = await DB.collection('users').doc(adminUid).get();
        if (adminUserDoc.exists) {
            backupData.firestoreRecords['users'] = adminUserDoc.data();
        }

        // Write Backup to disk
        const backupPath = path.join(__dirname, `../admin_backup_${adminUid}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
        console.log(`    ✅ Backup saved securely to: ${backupPath}`);

        // 3. WIPE FIRESTORE (Collections & Subcollections)
        console.log(`\n[3] Commencing Firestore Eradication...`);
        for (const colName of COLLECTIONS_TO_WIPE) {
            console.log(`    🗑️ Sweeping collection: ${colName}`);
            await deleteCollection(DB, colName, 500, adminUid);
        }

        // 4. WIPE STORAGE
        console.log(`\n[4] Commencing Storage Eradication...`);
        const [files] = await STORAGE.getFiles();
        for (const file of files) {
            // Protect admin files
            if (file.name.includes(`users/${adminUid}`) || file.name.includes(adminUid)) {
                continue;
            }
            await file.delete();
            stats.filesDeleted++;
        }
        console.log(`    ✅ Storage wiped (${stats.filesDeleted} files deleted)`);

        // 5. WIPE AUTH
        console.log(`\n[5] Commencing Auth Eradication...`);
        let nextPageToken;
        do {
            const listUsersResult = await AUTH.listUsers(1000, nextPageToken);
            const batchUids = listUsersResult.users
                .map(u => u.uid)
                .filter(uid => uid !== adminUid); // Exclude Admin

            if (batchUids.length > 0) {
                const deleteResult = await AUTH.deleteUsers(batchUids);
                stats.usersDeleted += deleteResult.successCount;
                console.log(`       Deleted batch of ${deleteResult.successCount} users...`);
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        console.log(`    ✅ Auth wiped (${stats.usersDeleted} non-admin users deleted)`);

        // 6. FINAL REPORT
        console.log(`\n======================================================`);
        console.log(`🏆 WIPE OPERATION COMPLETE`);
        console.log(`======================================================`);
        console.log(`📊 STATS:`);
        console.log(`   - Auth Users Erased:    ${stats.usersDeleted}`);
        console.log(`   - Firestore Docs Swept: ${stats.docsDeleted}`);
        console.log(`   - Storage Files Nuked:  ${stats.filesDeleted}`);
        console.log(`\n🛡️ SURVIVOR:`);
        console.log(`   - Account: ${TARGET_EMAIL}`);
        console.log(`   - UID:     ${adminUid}`);
        console.log(`======================================================\n`);

    } catch (error) {
        console.error('❌ FATAL ERROR DURING WIPE:', error);
    }
}

// Helper to delete collection recursively
async function deleteCollection(db, collectionPath, batchSize, adminUid) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
        return;
    }

    // Instead of simple batch delete, execute a true recursive delete per document
    // This ensures subcollections (like /businesses/{id}/services) are completely obliterated
    // while keeping the exclusion behavior at the top level.
    for (const doc of snapshot.docs) {
        if (doc.id === adminUid) {
            console.log(`       [PROTECTED] Skipping Admin doc in ${collectionPath}/${doc.id} and its subcollections.`);
            continue;
        }

        try {
            await db.recursiveDelete(doc.ref);
            stats.docsDeleted++; // We count top-level doc. The recursively deleted sub-docs aren't tallied individually.
        } catch (error) {
            console.error(`       [WARN] Failed to recursively delete ${collectionPath}/${doc.id}:`, error.message);
        }
    }
}

main();
