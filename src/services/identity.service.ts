import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

export type AccountStatus = 'pending_verification' | 'active' | 'archived' | 'canceled' | 'blocked' | 'incomplete';
export type ProviderType = 'password' | 'google.com' | 'apple.com';

export interface EmailRegistryEntry {
    uid: string;
    accountStatus: AccountStatus;
    providers: ProviderType[];
    createdAt: any;
    updatedAt: any;
    reserved: boolean;
}

export const IdentityService = {
    normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    },

    async getEmailRegistry(rawEmail: string): Promise<EmailRegistryEntry | null> {
        if (!rawEmail) return null;
        const email = this.normalizeEmail(rawEmail);
        try {
            const snap = await getDoc(doc(db, 'email_registry', email));
            return snap.exists() ? (snap.data() as EmailRegistryEntry) : null;
        } catch (error) {
            console.error('[IdentityService] Error fetching registry:', error);
            return null;
        }
    },

    async createEmailRegistry(rawEmail: string, uid: string, status: AccountStatus, provider: ProviderType) {
        if (!rawEmail || !uid) throw new Error('Email and UID required');
        const email = this.normalizeEmail(rawEmail);
        
        const entry: EmailRegistryEntry = {
            uid,
            accountStatus: status,
            providers: [provider],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            reserved: true
        };

        try {
            await setDoc(doc(db, 'email_registry', email), entry);
        } catch (error) {
            console.error('[IdentityService] Error creating registry entry:', error);
            throw error;
        }
    },

    async updateProviders(rawEmail: string, provider: ProviderType) {
        const email = this.normalizeEmail(rawEmail);
        try {
            await updateDoc(doc(db, 'email_registry', email), {
                providers: arrayUnion(provider),
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('[IdentityService] Error updating providers:', error);
            throw error;
        }
    },

    async updateAccountStatus(rawEmail: string, newStatus: AccountStatus) {
        const email = this.normalizeEmail(rawEmail);
        try {
            await updateDoc(doc(db, 'email_registry', email), {
                accountStatus: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('[IdentityService] Error updating accountStatus:', error);
            throw error;
        }
    }
};
