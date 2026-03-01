const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'service-marketplace-mvp-28884.firebasestorage.app'
});
const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage().bucket();

async function main() {
    const email = 'rivipro2012@yahoo.com';
    let uid = 'qhomn1AhPCSQMvEuf748ObN5wJv2';

    console.log(`Starting cleanup for ${email} (UID: ${uid})`);

    try {
        const userRec = await auth.getUserByEmail(email);
        uid = userRec.uid;
        await auth.deleteUser(uid);
        console.log('✅ Auth account deleted');
    } catch (e) {
        console.log('⚠️ Auth account not found or already deleted:', e.message);
    }

    const batch = db.batch();

    // Clean up users document
    batch.delete(db.doc(`users/${uid}`));

    // It's possible businessProfileId differs, but here it looks the same.
    const bizId = uid;

    batch.delete(db.doc(`businesses/${bizId}`));
    batch.delete(db.doc(`businesses_public/${bizId}`));
    batch.delete(db.doc(`businesses_private/${bizId}`));

    // Subcollections
    const subsPrivate = await db.collection(`businesses_private/${bizId}/services`).get();
    subsPrivate.forEach(d => batch.delete(d.ref));

    const subsPublic1 = await db.collection(`businesses_public/${bizId}/portfolio_posts`).get();
    subsPublic1.forEach(d => batch.delete(d.ref));

    const subsPublic2 = await db.collection(`businesses_public/${bizId}/reviews`).get();
    subsPublic2.forEach(d => batch.delete(d.ref));

    await batch.commit();
    console.log('✅ Firestore documents & specific subcollections deleted');

    // Delete Storage Folders: business_images/{uid}/ and avatars/{uid}/
    const deleteFolder = async (folder) => {
        const [files] = await storage.getFiles({ prefix: folder });
        for (const file of files) {
            await file.delete();
            console.log(`Deleted storage file: ${file.name}`);
        }
    };

    await deleteFolder(`business_images/${uid}/`);
    await deleteFolder(`avatars/${uid}/`);

    console.log('✅ Storage folders deleted');
    console.log('✨ Ghost user completely removed!');
    process.exit(0);
}

main().catch(console.error);
