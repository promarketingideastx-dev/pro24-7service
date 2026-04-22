import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { ServicePaymentDocument } from '@/types/firestore-schema';
import { StorageService } from './storage.service';

export const PaymentService = {
    /**
     * Executes the Dual-Write strategy for Phase 1:
     * 1. Uploads the file to the new independent storage bucket.
     * 2. Creates the new independent `ServicePaymentDocument`.
     * 3. Syncs the reference back to the legacy `BookingDocument`.
     */
    async uploadServicePaymentProofAndDualWrite(
        businessId: string,
        bookingId: string,
        clientId: string,
        clientName: string,
        clientEmail: string | undefined,
        serviceName: string,
        amount: number,
        currency: string,
        paymentMethod: string,
        file: File
    ) {
        // 1. Generate new UUID for the Payment Record natively
        const paymentsRef = collection(db, 'businesses', businessId, 'service_payments');
        const paymentDocRef = doc(paymentsRef);
        const paymentId = paymentDocRef.id;

        // 2. Upload to independent Storage
        // businesses/{businessId}/payments/{paymentId}/proof_X
        const proofRes = await StorageService.uploadServicePaymentProof(businessId, paymentId, file);

        // 3. Prepare Dual-Write Batch
        const batch = writeBatch(db);

        // A) Create ServicePayment Record
        const paymentData: Omit<ServicePaymentDocument, 'id'> = {
            bookingId,
            businessId,
            clientId,
            // crmCustomerId is missing here, as expected for pending bookings. 
            // It will be resolved when the business confirms the agenda slot.
            clientSnapshot: {
                name: clientName,
                email: clientEmail
            },
            serviceName,
            amount,
            currency,
            paymentMethod,
            proofImageUrl: proofRes.url,
            proofStoragePath: proofRes.path,
            status: 'under_review',
            version: 1,
            source: 'client_upload',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        batch.set(paymentDocRef, { id: paymentId, ...paymentData });

        // B) Update Legacy Booking Record (Retrocompatibility)
        const bookingRef = doc(db, 'bookings', bookingId);
        batch.update(bookingRef, {
            paymentProof: {
                url: proofRes.url,
                type: proofRes.type,
                fileName: proofRes.fileName,
                uploadedAt: new Date().toISOString()
            },
            paymentStatus: 'proof_uploaded'
        });

        // 4. Commit Atomi Transaction
        await batch.commit();

        return {
            paymentId,
            proofRes
        };
    }
};
