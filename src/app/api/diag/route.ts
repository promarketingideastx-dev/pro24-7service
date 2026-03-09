import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
declare var __non_webpack_require__: (id: string) => any;

async function getAdminSDK() {
    const { getApps, initializeApp, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const { getStorage } = await import('firebase-admin/storage');
    const { getAuth } = await import('firebase-admin/auth');

    if (!getApps().length) {
        let credential;
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            let raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
            let clean = raw.replace(/\n/g, '\\n').replace(/\r/g, '');
            const serviceAccount = JSON.parse(clean);
            credential = cert(serviceAccount);
        } else {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const serviceAccount = __non_webpack_require__('../../../../../serviceAccountKey.json');
                credential = cert(serviceAccount);
            } catch {
                return null;
            }
        }
        initializeApp({ credential });
    }

    return { db: getFirestore(), auth: getAuth(), storage: getStorage() };
}

export async function GET() {
    try {
        const sdk = await getAdminSDK();
        if (!sdk) return NextResponse.json({ error: 'No SDK' });

        const userRecord = await sdk.auth.getUserByEmail('promarketingideas.tx@gmail.com');
        const uid = userRecord.uid;

        const publicDoc = await sdk.db.collection('businesses').doc(uid).get();
        const pubData = publicDoc.data() || {};

        const privateDoc = await sdk.db.collection('businesses').doc(uid).collection('private').doc('data').get();
        const privData = privateDoc.data() || {};

        const bucketMatch = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const bucket = sdk.storage.bucket(bucketMatch);

        const [files1] = await bucket.getFiles({ prefix: `business/${uid}/` });
        const storageBusiness = files1.map(f => f.name);

        const [files2] = await bucket.getFiles({ prefix: `businesses/${uid}/` });
        const storageBusinesses = files2.map(f => f.name);

        return NextResponse.json({
            uid,
            publicProfile: {
                coverImage: pubData.coverImage || null,
                logoUrl: pubData.logoUrl || null,
                images: pubData.images || []
            },
            privateProfile: {
                gallery: privData.gallery || [],
                logoUrl: privData.logoUrl || null
            },
            storage: {
                business: storageBusiness,
                businesses: storageBusinesses
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
