/**
 * Migration: Add `createdAt` to businesses_public docs that lack it.
 *
 * Run ONCE with:
 *   node scripts/migrate-created-at.js
 *
 * Requires: firebase-admin + serviceAccountKey.json in project root.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateCreatedAt() {
    console.log('🔍 Scanning businesses_public collection...\n');

    const snapshot = await db.collection('businesses_public').get();

    if (snapshot.empty) {
        console.log('ℹ️  No documents found.');
        process.exit(0);
    }

    let updated = 0;
    let skipped = 0;

    // Process in batches of 400 (Firestore limit is 500 per batch)
    const BATCH_SIZE = 400;
    let batch = db.batch();
    let batchCount = 0;

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        if (data.createdAt) {
            // Already has a timestamp — skip
            skipped++;
            continue;
        }

        // Use the business name + id for logging
        const name = data.name || docSnap.id;

        // Set createdAt to a sensible fallback:
        // If the doc has updatedAt, use that as a proxy, otherwise use "now"
        // This way very old businesses don't show as "new" in the filter
        const fallbackDate = data.updatedAt
            ? data.updatedAt            // Firestore Timestamp — reuse
            : admin.firestore.FieldValue.serverTimestamp();

        batch.update(docSnap.ref, { createdAt: fallbackDate });
        console.log(`  ✏️  [${updated + 1}] ${name} (${docSnap.id})`);
        updated++;
        batchCount++;

        // Commit current batch and start a new one if needed
        if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            console.log(`\n  ✅ Batch of ${batchCount} committed.\n`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    // Commit any remaining writes
    if (batchCount > 0) {
        await batch.commit();
    }

    console.log('\n──────────────────────────────────────────────');
    console.log(`✅ Migration complete!`);
    console.log(`   Updated : ${updated} documents`);
    console.log(`   Skipped : ${skipped} (already had createdAt)`);
    console.log('──────────────────────────────────────────────');
    console.log('\nℹ️  Note: Documents with updatedAt used that date as createdAt.');
    console.log('   This prevents old businesses from appearing in the "🆕 Nuevos" filter.');
    process.exit(0);
}

migrateCreatedAt().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
