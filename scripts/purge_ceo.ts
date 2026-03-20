import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require(path.resolve(process.cwd(), 'serviceAccountKey.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const auth = admin.auth();

const TARGET_EMAILS = ['promarketingideas.tx@gmail.com', 'promarketing.tx@gmail.com'];

async function purgeAll() {
    for (const email of TARGET_EMAILS) {
        console.log(`\n[ PHASE 1: RECONNAISSANCE - ${email} ]`);
        console.log(`Searching for all traces of ${email}...`);

        let targetUids: string[] = [];
        let businessIds: string[] = [];
        
        // 1. Find in Auth
        try {
            const userRecord = await auth.getUserByEmail(email);
            targetUids.push(userRecord.uid);
            console.log(`[AUTH] Found canonical Auth User: ${userRecord.uid}`);
        } catch (e: any) {
        if (e.code === 'auth/user-not-found') {
            console.log(`[AUTH] No primary user found by email.`);
        } else {
            console.error(e);
        }
    }

    // List all users to catch any rogue ones just in case
        const listUsers = await auth.listUsers(1000);
        listUsers.users.forEach(u => {
            if (u.email?.toLowerCase() === email.toLowerCase() && !targetUids.includes(u.uid)) {
                targetUids.push(u.uid);
                console.log(`[AUTH] Found additional Auth User: ${u.uid}`);
            }
        });

    if (targetUids.length === 0) {
        // We will just do a blind database search to be safe
        console.log(`[AUTH] No UIDs found in Auth, but will search DB anyway...`);
    }

        // 2. Find in DB Users
        const usersSnap = await db.collection('users').where('email', '==', email).get();
        usersSnap.forEach(d => {
            if (!targetUids.includes(d.id)) {
                targetUids.push(d.id);
                console.log(`[DB] Found rogue User doc: ${d.id}`);
            }
        });

    console.log(`\nIdentified Target UIDs to purge:` , targetUids);

    console.log(`\n[ PHASE 2: HARD DELETE CONTROLADO ]`);

    for (const uid of targetUids) {
        console.log(`\n--- Purging UID: ${uid} ---`);
        
        // A) Find Businesses
        const bSnap = await db.collection('businesses').where('ownerId', '==', uid).get();
        for (const b of bSnap.docs) {
            console.log(`[BUSINESS] Deleting business ${b.id}`);
            // Delete subcollections? In a real system we'd bulk delete, but for a dev/CEO test it's mostly empty or flat.
            // Let's delete public node
            await db.collection('businesses_public').doc(b.id).delete();
            await db.collection('businesses').doc(b.id).delete();
            businessIds.push(b.id);
        }

        // B) Find Bookings where businessId or clientId matches
        const bkClientIdSnap = await db.collection('bookings').where('clientId', '==', uid).get();
        for (const bk of bkClientIdSnap.docs) {
            console.log(`[BOOKING] Deleting client booking ${bk.id}`);
            await db.collection('bookings').doc(bk.id).delete();
        }

        for (const bId of businessIds) {
            const bkBizSnap = await db.collection('bookings').where('businessId', '==', bId).get();
            for (const bk of bkBizSnap.docs) {
                console.log(`[BOOKING] Deleting business booking ${bk.id}`);
                await db.collection('bookings').doc(bk.id).delete();
            }
        }

            // C) Delete Email Registry
            const emSnap = await db.collection('email_registry').where('email', '==', email).get();
            for (const d of emSnap.docs) {
                console.log(`[EMAIL_REGISTRY] Deleting ${d.id}`);
                await db.collection('email_registry').doc(d.id).delete();
            }

        // Also check by ID if it was saved by UID
        const emById = await db.collection('email_registry').doc(uid).get();
        if (emById.exists) {
            console.log(`[EMAIL_REGISTRY] Deleting exact UID node ${uid}`);
            await db.collection('email_registry').doc(uid).delete();
        }

        // D) Delete UI Settings or favorites
        // e) Chat ...
        const chatSnap = await db.collection('chats').where('clientUid', '==', uid).get();
        for (const c of chatSnap.docs) {
            console.log(`[CHAT] Deleting chat ${c.id}`);
            await db.collection('chats').doc(c.id).delete();
        }

        // D) Delete User Doc
        console.log(`[USER] Deleting Firestore /users/${uid}`);
        await db.collection('users').doc(uid).delete();

        // E) Delete Auth
        try {
            await auth.deleteUser(uid);
            console.log(`[AUTH] Deleted UID ${uid} from Firebase Authentication`);
        } catch (e) {
            console.log(`[AUTH] Could not delete ${uid} or already deleted.`);
        }
    }

        console.log(`\n[ PHASE 3: VERIFICATION - ${email} ]`);
        const endCheck = await auth.getUserByEmail(email).catch(() => null);
        if (!endCheck) {
            console.log(`✅ SUCCESS: Email ${email} is completely liberated and missing from Auth.`);
        } else {
            console.log(`❌ WARNING: ${email} still exists in Auth!`);
        }
    }
}

purgeAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
