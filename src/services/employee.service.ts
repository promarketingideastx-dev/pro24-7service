import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export interface DaySchedule {
    enabled: boolean;
    start: string;
    end: string;
}

export interface WeeklySchedule {
    mon: DaySchedule;
    tue: DaySchedule;
    wed: DaySchedule;
    thu: DaySchedule;
    fri: DaySchedule;
    sat: DaySchedule;
    sun: DaySchedule;
}

export interface EmployeeData {
    id?: string;
    name: string;
    role: string; // Now used as "Title / Description"
    roleType: 'manager' | 'reception' | 'customer_service' | 'sales_marketing' | 'technician' | 'assistant' | 'other';
    roleCustom?: string;
    photoUrl?: string;
    active: boolean;
    serviceIds: string[]; // List of service IDs this employee performs
    availabilityWeekly?: WeeklySchedule;
    createdAt?: any;
    updatedAt?: any;
}

export const EmployeeService = {
    /**
     * Get all employees for a business
     */
    async getEmployees(businessId: string): Promise<EmployeeData[]> {
        try {
            const employeesRef = collection(db, 'businesses', businessId, 'employees');
            // orderBy createdAt desc to show newest first, or by name if preferred
            const q = query(employeesRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmployeeData));
        } catch (error) {
            console.error("Error fetching employees:", error);
            return [];
        }
    },

    /**
     * Add a new employee
     */
    async addEmployee(businessId: string, employee: Omit<EmployeeData, 'id'>): Promise<string> {
        try {
            const employeesRef = collection(db, 'businesses', businessId, 'employees');
            const docRef = await addDoc(employeesRef, {
                ...employee,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return docRef.id;
        } catch (error) {
            console.error("Error adding employee:", error);
            throw error;
        }
    },

    /**
     * Update an employee
     */
    async updateEmployee(businessId: string, employeeId: string, data: Partial<EmployeeData>): Promise<void> {
        try {
            const employeeRef = doc(db, 'businesses', businessId, 'employees', employeeId);
            await updateDoc(employeeRef, {
                ...data,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error updating employee:", error);
            throw error;
        }
    },

    /**
     * Delete an employee
     */
    async deleteEmployee(businessId: string, employeeId: string): Promise<void> {
        try {
            const employeeRef = doc(db, 'businesses', businessId, 'employees', employeeId);
            await deleteDoc(employeeRef);
        } catch (error) {
            console.error("Error deleting employee:", error);
            throw error;
        }
    }
};
