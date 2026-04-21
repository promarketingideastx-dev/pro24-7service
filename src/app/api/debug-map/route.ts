import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        let logs: any[] = [];
        
        // 1. Audit Client Notifications
        const clientItems = await db.collectionGroup('items').limit(20).get();
        let clientNotifs = [];
        clientItems.forEach(doc => {
             if (doc.ref.path.includes('client_notifications')) {
                  clientNotifs.push({ path: doc.ref.path, data: doc.data() });
             }
        });

        // 2. Audit Business Notifications
        let businessNotifs = [];
        clientItems.forEach(doc => {
             if (doc.ref.path.includes('business_notifications')) {
                  businessNotifs.push({ path: doc.ref.path, data: doc.data() });
             }
        });

        // 3. Audit general Queue
        const queues = await db.collection('notification_queue').orderBy('createdAt', 'desc').limit(20).get();
        let queueNotifs = [];
        queues.forEach(doc => {
             queueNotifs.push({ id: doc.id, data: doc.data() });
        });

        // 4. Booking check
        const bookings = await db.collection('bookings').orderBy('createdAt', 'desc').limit(5).get();
        let latestBookings = [];
        bookings.forEach(doc => {
             latestBookings.push({ id: doc.id, data: doc.data() });
        });

        return NextResponse.json({
            status: "AUDIT_COMPLETE",
            recent_bookings_count: latestBookings.length,
            bookings_samples: latestBookings,
            client_notifications_found: clientNotifs.length,
            client_notifs_samples: clientNotifs.slice(0, 5),
            business_notifications_found: businessNotifs.length,
            business_notifs_samples: businessNotifs.slice(0, 5),
            notification_queue_found: queueNotifs.length,
            queue_samples: queueNotifs.slice(0, 5)
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
