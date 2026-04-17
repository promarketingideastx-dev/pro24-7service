import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    getDoc,
    orderBy,
    Timestamp,
    writeBatch,
    onSnapshot,
    runTransaction
} from 'firebase/firestore';
import { BookingDocument, BookingStatus } from '@/types/firestore-schema';

const COLLECTION_NAME = 'bookings';

export const BookingService = {

    /**
     * Creates a new booking with strict validations (availability, past dates, currency).
     */
    async createBooking(
        bookingData: Omit<BookingDocument, 'id' | 'createdAt' | 'updatedAt' | 'paymentStatus' | 'remainingAmount' | 'status'>
    ) {
        // 1. Business Currency Enforcement
        const bizRef = doc(db, 'businesses', bookingData.businessId);
        const bizDoc = await getDoc(bizRef);
        if (!bizDoc.exists()) throw new Error('Business does not exist.');
        const bizData = bizDoc.data();
        
        // Grab currency from the incoming bookingData first if provided (enforced from Modal/Service).
        // If empty, fallback safely to business schema or USD as last resort.
        const currency = bookingData.currency || bizData.currency || 'USD'; 

        // 2. No past bookings allowed
        // Note: We use the local TZ string 'YYYY-MM-DD' vs JS Date. 
        // A simple string compare usually suffices if format is strict, but let's parse.
        const [y, m, d] = bookingData.date.split('-').map(Number);
        const [hr, mn] = bookingData.time.split(':').map(Number);
        const requestedDate = new Date(y, m - 1, d, hr, mn);
        if (requestedDate.getTime() < Date.now()) {
            throw new Error('No se pueden agendar citas en el pasado.');
        }

        const hasProof = !!bookingData.paymentProof;
        const initialPaymentStatus = hasProof 
            ? 'proof_uploaded' 
            : (bookingData.depositAmount > 0 ? 'instructions_sent' : 'pending');

        const data: Omit<BookingDocument, 'id'> = {
            ...bookingData,
            clientName: bookingData.clientName,
            clientEmail: bookingData.clientEmail,
            clientPhone: bookingData.clientPhone,
            status: 'pending',
            paymentStatus: initialPaymentStatus,
            remainingAmount: bookingData.totalAmount - bookingData.depositAmount,
            currency: currency,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const allowDoubleBooking = bizData.bookingSettings?.allowDoubleBooking || false;
        const slotLockRef = doc(db, 'businesses', bookingData.businessId, 'slot_locks', `${bookingData.date}_${bookingData.time}`);
        const bookingRef = doc(collection(db, COLLECTION_NAME));

        await runTransaction(db, async (transaction) => {
            const slotDoc = await transaction.get(slotLockRef);
            const activeCount = slotDoc.exists() ? (slotDoc.data().active || 0) : 0;

            if (!allowDoubleBooking && activeCount > 0) {
                // RACE CONDITION BLOCK!
                throw new Error('Este horario acaba de ser ocupado.');
            }

            transaction.set(slotLockRef, { active: activeCount + 1 }, { merge: true });
            transaction.set(bookingRef, data);
        });

        return { id: bookingRef.id, ...data };
    },

    /**
     * Update an entire booking document
     */
    async updateBooking(bookingId: string, bookingData: Partial<BookingDocument>) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        
        // Anti Race-Condition: Liberate the lock strictly if canceled.
        if (bookingData.status === 'canceled') {
            const existingSnap = await getDoc(ref);
            if (existingSnap.exists()) {
                const existingData = existingSnap.data() as BookingDocument;
                if (existingData.status === 'pending' || existingData.status === 'confirmed') {
                    const slotLockRef = doc(db, 'businesses', existingData.businessId, 'slot_locks', `${existingData.date}_${existingData.time}`);
                    await runTransaction(db, async (trans) => {
                        const slotDoc = await trans.get(slotLockRef);
                        if (slotDoc.exists()) {
                            const newCount = Math.max(0, (slotDoc.data().active || 1) - 1);
                            trans.set(slotLockRef, { active: newCount }, { merge: true });
                        }
                    });
                }
            }
        }

        const dataToUpdate = { ...bookingData, updatedAt: serverTimestamp() };
        delete dataToUpdate.id;
        await updateDoc(ref, dataToUpdate);
    },

    /**
     * Creates a manual booking directly from Business Agenda bypassing payments
     */
    async createManualBooking(bookingData: Partial<BookingDocument>) {
        const data = {
            ...bookingData,
            totalAmount: bookingData.totalAmount || 0,
            depositAmount: bookingData.depositAmount || 0,
            remainingAmount: bookingData.totalAmount || 0,
            paymentStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const slotLockRef = doc(db, 'businesses', bookingData.businessId as string, 'slot_locks', `${bookingData.date}_${bookingData.time}`);
        const bookingRef = doc(collection(db, COLLECTION_NAME));

        await runTransaction(db, async (transaction) => {
            const slotDoc = await transaction.get(slotLockRef);
            const activeCount = slotDoc.exists() ? (slotDoc.data().active || 0) : 0;
            transaction.set(slotLockRef, { active: activeCount + 1 }, { merge: true });
            transaction.set(bookingRef, data);
        });

        return { id: bookingRef.id, ...data };
    },

    /**
     * Mutate status (Confirm/Cancel/Complete)
     */
    async updateStatus(bookingId: string, status: BookingStatus, notesBusiness?: string) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        const updateData: any = {
            status,
            updatedAt: serverTimestamp()
        };
        if (notesBusiness !== undefined) {
            updateData.notesBusiness = notesBusiness;
        }
        await updateDoc(ref, updateData);
    },

    /**
     * Approve Payment Proof
     */
    async approvePaymentProof(bookingId: string) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        await updateDoc(ref, {
            paymentStatus: 'confirmed',
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Reject Payment Proof
     */
    async rejectPaymentProof(bookingId: string) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        await updateDoc(ref, {
            paymentStatus: 'rejected',
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Batch Delete Bookings
     */
    async deleteBookings(bookingIds: string[]) {
        if (!bookingIds.length) return;
        const batch = writeBatch(db);
        bookingIds.forEach(id => {
            const ref = doc(db, COLLECTION_NAME, id);
            batch.delete(ref);
        });
        await batch.commit();
    },

    /**
     * Hide Booking for Client (Soft Delete)
     */
    async hideForClient(bookingId: string) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        await updateDoc(ref, {
            hiddenByClient: true,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Hide Booking for Business (Soft Delete)
     */
    async hideForBusiness(bookingId: string) {
        const ref = doc(db, COLLECTION_NAME, bookingId);
        await updateDoc(ref, {
            hiddenByBusiness: true,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Read by Business (Provider Dashboard)
     */
    async getByBusiness(businessId: string): Promise<BookingDocument[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('businessId', '==', businessId),
            orderBy('date', 'desc'),
            orderBy('time', 'desc')
            // Add index for date/time if sorting fails
        );
        
        // In case indexing fails on dev, fallback to unsorted get + memory sort
        try {
            const snap = await getDocs(q);
            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingDocument));
            return items.filter(b => b.hiddenByBusiness !== true);
        } catch (e) {
             const fallbackQ = query(collection(db, COLLECTION_NAME), where('businessId', '==', businessId));
             const snap = await getDocs(fallbackQ);
             const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingDocument));
             const visibleItems = items.filter(b => b.hiddenByBusiness !== true);
             return visibleItems.sort((a, b) => {
                 if (a.date === b.date) return b.time.localeCompare(a.time);
                 return b.date.localeCompare(a.date);
             });
        }
    },

    /**
     * Get Occupied Slots for a specific date (used for Double Booking check)
     */
    async getOccupiedSlots(businessId: string, date: string): Promise<string[]> {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('businessId', '==', businessId),
            where('date', '==', date)
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => doc.data() as BookingDocument);
        
        // Strict filtering: ONLY pending or confirmed block the slot
        const occupied = docs.filter(b => b.status === 'pending' || b.status === 'confirmed');
        return occupied.map(b => b.time);
    },

    /**
     * Read by Client
     */
    async getByClient(clientId: string): Promise<BookingDocument[]> {
        const fallbackQ = query(collection(db, COLLECTION_NAME), where('clientId', '==', clientId));
        const snap = await getDocs(fallbackQ);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingDocument));
        
        // Filter out those hidden by the client
        const visibleItems = docs.filter(b => !b.hiddenByClient);
        
        return visibleItems.sort((a, b) => {
            if (a.date === b.date) return b.time.localeCompare(a.time);
            return b.date.localeCompare(a.date);
        });
    },

    /** Admin Read All */
    async getAll(): Promise<BookingDocument[]> {
        const snap = await getDocs(collection(db, COLLECTION_NAME));
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingDocument));
    },

    /**
     * Reat-Time Listener for Business Bookings
     */
    onBookingsByBusiness(businessId: string, callback: (bookings: BookingDocument[]) => void): () => void {
        const q = query(
            collection(db, COLLECTION_NAME),
            where('businessId', '==', businessId)
        );
        
        return onSnapshot(q, (snap) => {
            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingDocument));
            // Memory sort matches the legacy getByBusiness fallback approach safely
            const sorted = items.sort((a, b) => {
                if (a.date === b.date) return b.time.localeCompare(a.time);
                return b.date.localeCompare(a.date);
            });
            callback(sorted);
        }, (error) => {
            console.error('[BookingService] Error in onBookingsByBusiness:', error);
            callback([]);
        });
    }
};
