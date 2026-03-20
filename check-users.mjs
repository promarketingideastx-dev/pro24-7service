import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

async function run() {
    try {
        if (!getApps().length) {
            const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf-8'));
            initializeApp({ credential: cert(serviceAccount) });
        }

        const db = getFirestore();
        const auth = getAuth();

        // 1. Fetch all Auth users
        const authUsers = [];
        let pageToken;
        do {
            const listUsersResult = await auth.listUsers(1000, pageToken);
            listUsersResult.users.forEach(u => authUsers.push({ uid: u.uid, email: u.email }));
            pageToken = listUsersResult.pageToken;
        } while (pageToken);

        // 2. Fetch all Firestore Users
        const usersSnap = await db.collection('users').get();
        const firestoreUsers = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Fetch all Firestore Businesses
        const bizSnap = await db.collection('businesses').get();
        const firestoreBusinesses = bizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const report = {
            totalAuthUsers: authUsers.length,
            totalFirestoreUsers: firestoreUsers.length,
            totalBusinesses: firestoreBusinesses.length,
            users: authUsers.map(au => {
                const fsUser = firestoreUsers.find(u => u.id === au.uid);
                const fsBiz = firestoreBusinesses.find(b => b.id === au.uid);
                return {
                    uid: au.uid,
                    email: au.email,
                    hasFirestoreUser: !!fsUser,
                    hasBusinessProfile: !!fsBiz,
                    roles: fsUser?.roles || null,
                    isProvider: fsUser?.roles?.provider || false,
                    isClient: fsUser?.roles?.client || false,
                    onboardingStatus: fsUser?.providerOnboardingStatus || null,
                    businessData: fsBiz ? { name: fsBiz.name, status: fsBiz.status, location: !!fsBiz.location } : null
                };
            })
        };

        console.log(JSON.stringify(report, null, 2));

    } catch (e) {
        console.error("Error:", e);
    }
}

run();
