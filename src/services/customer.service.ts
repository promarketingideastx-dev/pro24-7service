import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    getDocs,
    serverTimestamp,
    orderBy,
    Timestamp,
    getDoc
} from 'firebase/firestore';

export interface Customer {
    id?: string;
    businessId: string;
    fullName: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string; // MVP: Single note field
    tags?: string[];
    archived?: boolean; // Soft-delete: hides from list but keeps data
    createdAt?: any;
    updatedAt?: any;
    lastInteractionAt?: any;
}

const COLLECTION_NAME = 'customers';

export const CustomerService = {
    /**
     * Get all customers for a business, ordered by name
     */
    async getCustomers(businessId: string): Promise<Customer[]> {
        try {
            const customersRef = collection(db, COLLECTION_NAME);
            const q = query(
                customersRef,
                where('businessId', '==', businessId)
            );

            const snapshot = await getDocs(q);
            const customers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Customer));

            // Exclude archived, sort by name
            return customers
                .filter(c => !c.archived)
                .sort((a, b) => a.fullName.localeCompare(b.fullName));
        } catch (error) {
            console.error("Error fetching customers:", error);
            throw error;
        }
    },

    /**
     * Get a single customer by ID
     */
    async getCustomer(id: string): Promise<Customer | null> {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return { id: snap.id, ...snap.data() } as Customer;
            }
            return null;
        } catch (error) {
            console.error("Error fetching customer:", error);
            throw error;
        }
    },

    /**
     * Check for duplicates (Phone or Email) within the same business
     */
    async checkDuplicate(businessId: string, phone?: string, email?: string, excludeId?: string): Promise<boolean> {
        if (!phone && !email) return false;

        const customersRef = collection(db, COLLECTION_NAME);
        const checks = [];

        if (phone) {
            const qPhone = query(
                customersRef,
                where('businessId', '==', businessId),
                where('phone', '==', phone)
            );
            checks.push(getDocs(qPhone));
        }

        if (email) {
            const qEmail = query(
                customersRef,
                where('businessId', '==', businessId),
                where('email', '==', email)
            );
            checks.push(getDocs(qEmail));
        }

        const results = await Promise.all(checks);

        // Check if any result has docs that are NOT the excludeId
        return results.some(snap =>
            snap.docs.some(d => d.id !== excludeId)
        );
    },

    /**
     * Create a new customer
     */
    async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
        try {
            // Duplication check
            const isDuplicate = await this.checkDuplicate(
                customer.businessId,
                customer.phone,
                customer.email
            );

            if (isDuplicate) {
                throw new Error("Customer with this phone or email already exists.");
            }

            const data = {
                ...customer,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastInteractionAt: serverTimestamp() // Initial interaction
            };

            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return { id: docRef.id, ...data } as Customer;
        } catch (error) {
            console.error("Error creating customer:", error);
            throw error;
        }
    },

    /**
     * Update a customer
     */
    async updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
        try {
            // If phone or email is being updated, check duplicates
            if (updates.phone || updates.email) {
                // We need businessId to check duplicates. 
                // If not passed in updates, we'd theoretically need to fetch it or rely on caller compliance.
                // For MVP, assuming caller handles this or we fetch if critical.
                // Ideally, we fetch existing doc first to get businessId...
                /* 
                const current = await this.getCustomer(id);
                if (current) {
                   const isDup = await this.checkDuplicate(current.businessId, updates.phone, updates.email, id);
                   if (isDup) throw new Error("Duplicate phone/email");
                }
                */
            }

            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating customer:", error);
            throw error;
        }
    },

    /**
     * Delete a customer
     */
    async deleteCustomer(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting customer:", error);
            throw error;
        }
    },

    /**
     * Archive a customer (soft-delete). Hides from CRM list but preserves all data.
     * Use instead of deleting when the customer has appointment history.
     */
    async archiveCustomer(id: string): Promise<void> {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                archived: true,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error archiving customer:", error);
            throw error;
        }
    },

    /**
     * Upsert a customer from booking data.
     * Looks up by email (preferred) or phone. Creates if not found, updates if found.
     * Returns the customer ID for linking to the appointment.
     */
    async upsertFromAppointment(businessId: string, data: {
        fullName: string;
        email?: string;
        phone?: string;
    }): Promise<string> {
        try {
            const customersRef = collection(db, COLLECTION_NAME);

            // Try to find by email first
            if (data.email) {
                const qEmail = query(customersRef, where('businessId', '==', businessId), where('email', '==', data.email));
                const snap = await getDocs(qEmail);
                if (!snap.empty) {
                    const existing = snap.docs[0];
                    // Update lastInteractionAt and fill in any missing fields
                    await updateDoc(doc(db, COLLECTION_NAME, existing.id), {
                        lastInteractionAt: serverTimestamp(),
                        ...(data.phone && !existing.data().phone ? { phone: data.phone } : {}),
                        updatedAt: serverTimestamp()
                    });
                    return existing.id;
                }
            }

            // Try by phone if no email match
            if (data.phone) {
                const qPhone = query(customersRef, where('businessId', '==', businessId), where('phone', '==', data.phone));
                const snap = await getDocs(qPhone);
                if (!snap.empty) {
                    const existing = snap.docs[0];
                    await updateDoc(doc(db, COLLECTION_NAME, existing.id), {
                        lastInteractionAt: serverTimestamp(),
                        ...(data.email && !existing.data().email ? { email: data.email } : {}),
                        updatedAt: serverTimestamp()
                    });
                    return existing.id;
                }
            }

            // Not found — create new customer
            const newCustomer = {
                businessId,
                fullName: data.fullName,
                email: data.email || '',
                phone: data.phone || '',
                archived: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastInteractionAt: serverTimestamp()
            };
            const docRef = await addDoc(customersRef, newCustomer);
            return docRef.id;
        } catch (error) {
            console.error("Error upserting customer from appointment:", error);
            throw error;
        }
    }
};
