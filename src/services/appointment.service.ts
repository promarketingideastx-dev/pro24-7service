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
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';

export interface Appointment {
    id?: string;
    businessId: string;
    employeeId: string; // resourceId
    serviceId: string;
    serviceName: string; // Store for faster rendering
    serviceDuration: number; // Store for faster rendering
    customerId?: string; // If registered user
    customerName: string; // Fallback or Guest name
    customerEmail?: string;
    customerPhone?: string;
    date: Timestamp; // Start time
    status: AppointmentStatus;
    notes?: string;
    createdAt?: any;
    updatedAt?: any;
}

const COLLECTION_NAME = 'appointments';

export const AppointmentService = {
    // Create
    async createAppointment(appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) {
        try {
            const data = {
                ...appointment,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error("Error creating appointment:", error);
            throw error;
        }
    },

    // Read (by Business and Date Range)
    async getAppointments(businessId: string, startDate: Date, endDate: Date) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('businessId', '==', businessId)
                // Note: We are temporarily filtering by date in the client to avoid 
                // "Missing Index" errors during development. 
                // In production, you MUST re-enable these filters & create the Firestore Index.
                // where('date', '>=', Timestamp.fromDate(startDate)),
                // where('date', '<=', Timestamp.fromDate(endDate))
            );

            const snapshot = await getDocs(q);
            const appointments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Appointment));

            // Client-side filtering (Temporary)
            return appointments.filter(apt => {
                const searchStart = startDate.getTime();
                const searchEnd = endDate.getTime();
                const aptTime = apt.date.toDate().getTime();
                return aptTime >= searchStart && aptTime <= searchEnd;
            });
        } catch (error) {
            console.error("Error fetching appointments:", error);
            throw error;
        }
    },

    // Read by Employee (for Workload View)
    async getAppointmentsByEmployee(businessId: string, employeeId: string) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('businessId', '==', businessId),
                where('employeeId', '==', employeeId)
                // orderBy('date', 'desc') // Requires index
            );

            const snapshot = await getDocs(q);
            const appointments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Appointment));

            // Sort client-side to avoid index requirement for now
            return appointments.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        } catch (error) {
            console.error("Error fetching employee appointments:", error);
            throw error;
        }
    },

    // Read by Customer (for History or Deletion check)
    async getAppointmentsByCustomer(businessId: string, customerId: string) {
        try {
            const q = query(
                collection(db, COLLECTION_NAME),
                where('businessId', '==', businessId),
                where('customerId', '==', customerId)
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
        } catch (error) {
            console.error("Error fetching customer appointments:", error);
            throw error;
        }
    },

    // Update
    async updateAppointment(id: string, updates: Partial<Appointment>) {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating appointment:", error);
            throw error;
        }
    },

    // Delete
    async deleteAppointment(id: string) {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting appointment:", error);
            throw error;
        }
    }
};
