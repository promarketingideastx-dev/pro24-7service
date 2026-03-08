import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, writeBatch } from 'firebase/firestore';
import { PlanService } from './plan.service';

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
    description?: string;  // Free-text description, max 200 words
    photoUrl?: string;
    active: boolean;
    serviceIds: string[]; // List of service IDs this employee performs
    availabilityWeekly?: WeeklySchedule;
    status?: 'active' | 'suspended'; // For downgrade automations
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
            // BLOQUE 2B: Validación estricta de Límites de Empleados
            const bizRef = doc(db, 'businesses', businessId);
            const bizSnap = await getDoc(bizRef);
            const plan = PlanService.getEffectivePlan(bizSnap.data() || {});
            const limit = PlanService.getTeamLimit(plan);

            const employeesRef = collection(db, 'businesses', businessId, 'employees');

            // Si el límite no es "infinito" (999), contamos los empleados
            if (limit < 999) {
                const q = query(employeesRef);
                const snap = await getDocs(q);
                if (snap.size >= limit) {
                    throw new Error(`Límite alcanzado: Tu plan ${PlanService.PLAN_LABELS[plan] || 'actual'} permite un máximo de ${limit} empleados.`);
                }
            }

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
    },

    /**
     * BLOQUE 2C: Suspensión por Downgrade / Trial Expirado
     * Automatically suspends employees beyond the allowed limit.
     */
    async suspendOverLimitEmployees(businessId: string, limit: number): Promise<void> {
        try {
            const employeesRef = collection(db, 'businesses', businessId, 'employees');
            // Ordenar por createdAt asc para mantener los más antiguos activos
            const q = query(employeesRef, orderBy('createdAt', 'asc'));
            const snapshot = await getDocs(q);

            const docs = snapshot.docs;
            // Si el total no supera el límite, no hace nada
            if (docs.length <= limit) return;

            // Excedentes: desde el índice 'limit' en adelante
            const toSuspend = docs.slice(limit);

            const batch = writeBatch(db);
            let hasChanges = false;

            for (const empDoc of toSuspend) {
                const data = empDoc.data();
                if (data.active !== false || data.status !== 'suspended') {
                    batch.update(empDoc.ref, {
                        active: false,
                        status: 'suspended',
                        updatedAt: serverTimestamp()
                    });
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await batch.commit();
            }

        } catch (error) {
            console.error("Error suspending overlimit employees:", error);
            throw error;
        }
    }
};
