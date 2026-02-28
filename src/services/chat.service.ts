import { db, storage } from '@/lib/firebase';
import {
    collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
    query, orderBy, limit, onSnapshot, serverTimestamp, increment, writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { BusinessNotificationService } from '@/services/businessNotification.service';

export interface ChatMessage {
    id?: string;
    text: string;
    senderId: string;
    senderRole: 'client' | 'business';
    senderName: string;
    createdAt: any;
    // File/image attachment
    fileUrl?: string;           // Firebase Storage download URL
    fileType?: 'image' | 'pdf' | 'file';
    fileName?: string;          // Original filename
    // Soft-delete
    deleted?: boolean;          // Hard-deleted (removed for everyone)
    deletedFor?: string[];      // UIDs of users who soft-deleted (read by both)
}

export interface Chat {
    id?: string;
    businessId: string;
    clientUid: string;
    clientName: string;
    businessName: string;
    lastMessage: string;
    lastMessageAt: any;
    unreadBusiness: number;
    unreadClient: number;
}

// chatId = {businessId}_{clientUid}
const chatId = (businessId: string, clientUid: string) => `${businessId}_${clientUid}`;

export const ChatService = {

    // Get or create a chat document
    async getOrCreateChat(
        businessId: string,
        clientUid: string,
        clientName: string,
        businessName: string
    ): Promise<string> {
        const id = chatId(businessId, clientUid);
        const ref = doc(db, 'chats', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                businessId,
                clientUid,
                clientName,
                businessName,
                lastMessage: '',
                lastMessageAt: serverTimestamp(),
                unreadBusiness: 0,
                unreadClient: 0,
            });
        }
        return id;
    },

    // Send a message
    async sendMessage(
        chatDocId: string,
        text: string,
        senderId: string,
        senderRole: 'client' | 'business',
        senderName: string
    ) {
        const msgRef = collection(db, 'chats', chatDocId, 'messages');
        await addDoc(msgRef, {
            text: text.trim(),
            senderId,
            senderRole,
            senderName,
            createdAt: serverTimestamp(),
        });

        // Update chat metadata
        const chatRef = doc(db, 'chats', chatDocId);
        const chatSnap = await getDoc(chatRef);
        const chatData = chatSnap.data();
        const unreadField = senderRole === 'client' ? 'unreadBusiness' : 'unreadClient';
        await updateDoc(chatRef, {
            lastMessage: text.trim(),
            lastMessageAt: serverTimestamp(),
            [unreadField]: increment(1),
        });

        // 🔔 Notify the business when a client sends a message
        if (senderRole === 'client' && chatData?.businessId) {
            BusinessNotificationService.create(chatData.businessId, {
                type: 'new_message',
                title: `Nuevo mensaje de ${senderName}`,
                body: text.trim().substring(0, 80),
                relatedId: chatDocId,
                relatedName: senderName,
            }).catch(() => { /* silent */ });
        }

        // 🔔 Notify the client when the business replies
        if (senderRole === 'business' && chatData?.clientUid) {
            const { ClientNotificationService } = await import('@/services/clientNotification.service');
            ClientNotificationService.create(chatData.clientUid, {
                type: 'new_message',
                title: `Nuevo mensaje de ${chatData.businessName || senderName}`,
                body: text.trim().substring(0, 80),
                relatedId: chatDocId,
                relatedName: chatData.businessName || senderName,
            }).catch(() => { /* silent */ });
        }
    },

    // Subscribe to messages in real time (filters out hard-deleted)
    subscribeToMessages(
        chatDocId: string,
        callback: (messages: ChatMessage[]) => void
    ): () => void {
        const q = query(
            collection(db, 'chats', chatDocId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(200)
        );
        return onSnapshot(q, (snap) => {
            const msgs = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
                .filter(m => !m.deleted);
            callback(msgs);
        });
    },

    // Subscribe to all chats for a business (inbox)
    subscribeToBusinessChats(
        businessId: string,
        callback: (chats: Chat[]) => void
    ): () => void {
        const q = query(
            collection(db, 'chats'),
        );
        return onSnapshot(q, (snap) => {
            const chats = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Chat))
                .filter(c => c.businessId === businessId)
                .sort((a, b) => {
                    const at = a.lastMessageAt?.toMillis?.() ?? 0;
                    const bt = b.lastMessageAt?.toMillis?.() ?? 0;
                    return bt - at;
                });
            callback(chats);
        });
    },

    // Subscribe to all chats for a client
    subscribeToClientChats(
        clientUid: string,
        callback: (chats: Chat[]) => void
    ): () => void {
        const q = query(collection(db, 'chats'));
        return onSnapshot(q, (snap) => {
            const chats = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Chat))
                .filter(c => c.clientUid === clientUid)
                .sort((a, b) => {
                    const at = a.lastMessageAt?.toMillis?.() ?? 0;
                    const bt = b.lastMessageAt?.toMillis?.() ?? 0;
                    return bt - at;
                });
            callback(chats);
        });
    },

    // Mark messages as read
    async markAsRead(chatDocId: string, role: 'client' | 'business') {
        const chatRef = doc(db, 'chats', chatDocId);
        const field = role === 'client' ? 'unreadClient' : 'unreadBusiness';
        await updateDoc(chatRef, { [field]: 0 });
    },

    // Upload file to Firebase Storage and return {fileUrl, fileType, fileName}
    async uploadFile(
        chatDocId: string,
        file: File
    ): Promise<{ fileUrl: string; fileType: 'image' | 'pdf' | 'file'; fileName: string }> {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
        const fileType: 'image' | 'pdf' | 'file' =
            ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext) ? 'image'
                : ext === 'pdf' ? 'pdf'
                    : 'file';
        const path = `chats/${chatDocId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const fileUrl = await getDownloadURL(storageRef);
        return { fileUrl, fileType, fileName: file.name };
    },

    // Send a message with an optional file attachment
    async sendMessageWithFile(
        chatDocId: string,
        text: string,
        senderId: string,
        senderRole: 'client' | 'business',
        senderName: string,
        fileAttachment?: { fileUrl: string; fileType: 'image' | 'pdf' | 'file'; fileName: string }
    ) {
        const msgRef = collection(db, 'chats', chatDocId, 'messages');
        await addDoc(msgRef, {
            text: text.trim(),
            senderId,
            senderRole,
            senderName,
            createdAt: serverTimestamp(),
            ...(fileAttachment ?? {}),
        });

        const chatRef = doc(db, 'chats', chatDocId);
        const chatSnap = await getDoc(chatRef);
        const chatData = chatSnap.data();
        const unreadField = senderRole === 'client' ? 'unreadBusiness' : 'unreadClient';
        const preview = fileAttachment
            ? (fileAttachment.fileType === 'image' ? '📷 Imagen' : fileAttachment.fileType === 'pdf' ? '📄 PDF' : '📎 Archivo')
            : text.trim();
        await updateDoc(chatRef, {
            lastMessage: preview,
            lastMessageAt: serverTimestamp(),
            [unreadField]: increment(1),
        });

        // Notifications
        if (senderRole === 'client' && chatData?.businessId) {
            BusinessNotificationService.create(chatData.businessId, {
                type: 'new_message',
                title: `Nuevo mensaje de ${senderName}`,
                body: preview.substring(0, 80),
                relatedId: chatDocId,
                relatedName: senderName,
            }).catch(() => { });
        }
        if (senderRole === 'business' && chatData?.clientUid) {
            const { ClientNotificationService } = await import('@/services/clientNotification.service');
            ClientNotificationService.create(chatData.clientUid, {
                type: 'new_message',
                title: `Nuevo mensaje de ${chatData.businessName || senderName}`,
                body: preview.substring(0, 80),
                relatedId: chatDocId,
                relatedName: chatData.businessName || senderName,
            }).catch(() => { });
        }
    },

    /**
     * Delete a message:
     * - If unreadBusiness=0 AND unreadClient=0 (both parties have seen): soft-delete for callerUid only
     * - Otherwise: hard-delete for everyone (removes the doc)
     */
    async deleteMessage(
        chatDocId: string,
        msgId: string,
        callerUid: string,
        chatUnreadBusiness: number,
        chatUnreadClient: number
    ) {
        const msgRef = doc(db, 'chats', chatDocId, 'messages', msgId);
        const bothRead = chatUnreadBusiness === 0 && chatUnreadClient === 0;
        if (bothRead) {
            // Soft-delete — hide only for this user
            const snap = await getDoc(msgRef);
            const existing: string[] = snap.data()?.deletedFor ?? [];
            if (!existing.includes(callerUid)) {
                await updateDoc(msgRef, { deletedFor: [...existing, callerUid] });
            }
        } else {
            // Hard-delete — remove entirely
            await deleteDoc(msgRef);
        }
    },

    /** Hard-delete all messages marked as read (unread counts are 0) from both sides */
    async deleteAllRead(
        chatDocId: string,
        callerUid: string,
        callerRole: 'client' | 'business'
    ) {
        const q = query(
            collection(db, 'chats', chatDocId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(200)
        );
        const snap = await getDoc(doc(db, 'chats', chatDocId));
        const chatData = snap.data();
        const unreadBusiness = chatData?.unreadBusiness ?? 0;
        const unreadClient = chatData?.unreadClient ?? 0;
        const bothRead = unreadBusiness === 0 && unreadClient === 0;

        const msgSnap = await import('firebase/firestore').then(fb =>
            fb.getDocs(q)
        );
        const batch = writeBatch(db);
        msgSnap.docs.forEach(d => {
            if (bothRead) {
                // Soft-delete for caller
                const existing: string[] = d.data().deletedFor ?? [];
                if (!existing.includes(callerUid)) {
                    batch.update(d.ref, { deletedFor: [...existing, callerUid] });
                }
            } else {
                batch.delete(d.ref);
            }
        });
        await batch.commit();
    },

    getChatId: chatId,
};
