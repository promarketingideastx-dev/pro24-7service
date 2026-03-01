import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    serverTimestamp,
    orderBy,
    limit,
    Timestamp,
    getDoc
} from 'firebase/firestore';
import { VipInvite, VipInviteStatus, VipInviteType } from '@/types/firestore-schema';

export class VipInviteService {
    static COLLECTION = 'vip_invites';

    /**
     * Creates a new VIP invitation (either by email or a unique code)
     */
    static async createInvite(data: {
        type: VipInviteType;
        email?: string;
        code?: string;
        createdBy: string;
    }): Promise<string> {
        // Enforce uniqueness
        if (data.type === 'email' && data.email) {
            const normalizedEmail = data.email.toLowerCase().trim();
            const existing = await this.getInviteByEmail(normalizedEmail);
            if (existing && existing.status === 'pending') {
                throw new Error('Ya existe una invitación pendiente para este correo.');
            }
            data.email = normalizedEmail;
        }

        if (data.type === 'code' && data.code) {
            const normalizedCode = data.code.toUpperCase().trim();
            const existing = await this.getInviteByCode(normalizedCode);
            if (existing) {
                throw new Error('Este código ya existe.');
            }
            data.code = normalizedCode;
        }

        const inviteData: Omit<VipInvite, 'id'> = {
            type: data.type,
            status: 'pending',
            createdBy: data.createdBy,
            createdAt: serverTimestamp(),
        };

        if (data.type === 'email') inviteData.email = data.email;
        if (data.type === 'code') inviteData.code = data.code;

        const docRef = await addDoc(collection(db, this.COLLECTION), inviteData);
        return docRef.id;
    }

    /**
     * Revokes an existing pending invite
     */
    static async revokeInvite(id: string): Promise<void> {
        await updateDoc(doc(db, this.COLLECTION, id), {
            status: 'revoked',
        });
    }

    /**
     * Finds a pending invite by email
     */
    static async getInviteByEmail(email: string): Promise<VipInvite | null> {
        const q = query(
            collection(db, this.COLLECTION),
            where('type', '==', 'email'),
            where('email', '==', email.toLowerCase().trim()),
            where('status', '==', 'pending'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() } as VipInvite;
    }

    /**
     * Finds a pending invite by code
     */
    static async getInviteByCode(code: string): Promise<VipInvite | null> {
        const q = query(
            collection(db, this.COLLECTION),
            where('type', '==', 'code'),
            where('code', '==', code.toUpperCase().trim()),
            where('status', '==', 'pending'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;

        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() } as VipInvite;
    }

    /**
     * Marks an invite as used by a specific business/user
     */
    static async redeemInvite(id: string, businessId: string, userId: string): Promise<void> {
        await updateDoc(doc(db, this.COLLECTION, id), {
            status: 'used',
            registeredBusinessId: businessId,
            registeredUserId: userId,
            usedAt: serverTimestamp(),
        });
    }

    /**
     * Generates a random 6-character code
     */
    static generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I, O, 1, 0 for readability
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return `PRO-${result}`;
    }
}
