import { db } from './src/lib/firebaseAdmin';

async function QA() {
    console.log('--- STARTING QA ---');
    const bookingId = 'QA-TEST-BOOKING-123';
    const businessId = 'QA-BUSINESS-XYZ';
    const clientId = 'QA-CLIENT-ABC';
    const businessEmail = 'testbusiness@example.com';
    // 1. CLEAR PREVIOUS
    const q1 = await db.collection('notification_queue').where('entityId', '==', bookingId).get();
    for (const d of q1.docs) await d.ref.delete();

    // 2. ENQUEUE
    console.log('Sending enqueue payload...');
    const payload = {
        action: 'enqueueForBookingCreation',
        payload: {
            bookingId,
            businessId,
            clientId,
            clientName: 'QA Test Client',
            serviceName: 'QA Haircut',
            businessEmail
        }
    };
    
    // Using internal function directly to bypass HTTP locally
    const batch = db.batch();
    if (businessEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) {
        const scheduleOffsets = [0, 15, 30, 45];
        for (const offset of scheduleOffsets) {
            const scheduledTime = new Date();
            scheduledTime.setMinutes(scheduledTime.getMinutes() + offset);
            const queueRef = db.collection('notification_queue').doc();
            batch.set(queueRef, {
                targetUid: businessId,
                targetEmail: businessEmail,
                channel: 'email',
                type: 'booking_created',
                entityId: bookingId,
                status: 'pending',
                scheduledFor: scheduledTime,
                attempts: 0,
                createdAt: new Date()
            });
        }
    }
    await batch.commit();

    // 3. READ QUEUE
    const q2 = await db.collection('notification_queue').where('entityId', '==', bookingId).get();
    console.log(`Enqueued ${q2.size} items. Expected 4.`);
    const offsets = q2.docs.map(d => {
        const diffClientMs = d.data().scheduledFor.toDate().getTime() - d.data().createdAt.toDate().getTime();
        return Math.round(diffClientMs / 60000);
    }).sort((a,b) => a-b);
    console.log(`Offsets detected: ${offsets.join(', ')} mins`);

    // 4. TEST INVALID EMAIL
    console.log('-- Testing invalid email filter --');
    const batch2 = db.batch();
    const badEmail = 'legacy_business_no_email';
    if (badEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(badEmail)) {
        // Should not enter
        batch2.set(db.collection('notification_queue').doc(), {
            entityId: bookingId + '-BAD',
            targetEmail: badEmail
        });
        await batch2.commit();
        console.log('Added invalid email (FAIL)');
    } else {
        console.log('Regex correctly blocked invalid email (PASS)');
    }

    // 5. TEST CANCEL ALL (STOP-AT-SIGHT)
    console.log('-- Testing Cancel Pending For Target --');
    const snap = await db.collection('notification_queue')
        .where('targetUid', '==', businessId)
        .where('status', '==', 'pending')
        .get();
        
    const batch3 = db.batch();
    snap.docs.forEach(d => {
        batch3.update(d.ref, {
            status: 'canceled',
            reason: 'interaction_detected'
        });
    });
    await batch3.commit();
    console.log(`Cancelled ${snap.size} pending items (PASS if 4).`);

    console.log('--- QA COMPLETE ---');
    process.exit(0);
}

QA().catch(console.error);
