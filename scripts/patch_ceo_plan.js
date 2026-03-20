const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Adjust path if needed, we assume it's there or use env

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function patchCEO() {
    try {
        console.log("Looking for CEO accounts...");
        const usersSnap = await db.collection('users').where('roles.ceo', '==', true).get();
        if (usersSnap.empty) {
            console.log("No CEO accounts found.");
            return;
        }

        const batch = db.batch();
        let count = 0;

        for (const userDoc of usersSnap.docs) {
            const userId = userDoc.id;
            console.log(`Found CEO: ${userId}`);

            // Upgrade User document subscription
            batch.update(userDoc.ref, {
                'subscription.plan': 'premium',
                'subscription.status': 'active',
                'subscription.trialStartAt': Date.now(),
                'subscription.trialEndAt': Date.now(),
                'subscription.isActive': true,
                'isVip': true // Force VIP flag just in case
            });

            // Upgrade Business document planData
            const bizRef = db.collection('businesses').doc(userId);
            const bizSnap = await bizRef.get();
            if (bizSnap.exists) {
                batch.update(bizRef, {
                    'planData.plan': 'vip',
                    'planData.planStatus': 'active',
                    'planData.planSource': 'collaborator_beta',
                    'planData.teamMemberLimit': 999,
                    'planData.overriddenByCRM': false
                });
                console.log(`Updated business plan for CEO ${userId}`);
            }
            
            // Also update public profile
            const publicBizRef = db.collection('businesses_public').doc(userId);
            const publicBizSnap = await publicBizRef.get();
            if (publicBizSnap.exists) {
                batch.update(publicBizRef, {
                    'planData.plan': 'vip',
                    'planData.planStatus': 'active',
                    'planData.planSource': 'collaborator_beta',
                    'planData.teamMemberLimit': 999,
                    'planData.overriddenByCRM': false
                });
            }

            count++;
        }

        await batch.commit();
        console.log(`Successfully patched ${count} CEO accounts to VIP.`);
    } catch (e) {
        console.error("Error patching CEO accounts:", e);
    }
}

patchCEO();
