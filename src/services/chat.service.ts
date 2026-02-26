import { db } from '@/lib/firebase';
import {
    collection, doc, getDoc, setDoc, addDoc, updateDoc,
    query, orderBy, limit, onSnapshot, serverTimestamp, increment
} from 'firebase/firestore';

export interface ChatMessage {
    id?: string;
    text: string;
    senderId: string;
    senderRole: 'client' | 'business';
    senderName: string;
    createdAt: any;
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
        const unreadField = senderRole === 'client' ? 'unreadBusiness' : 'unreadClient';
        await updateDoc(chatRef, {
            lastMessage: text.trim(),
            lastMessageAt: serverTimestamp(),
            [unreadField]: increment(1),
        });
    },

    // Subscribe to messages in real time
    subscribeToMessages(
        chatDocId: string,
        callback: (messages: ChatMessage[]) => void
    ): () => void {
        const q = query(
            collection(db, 'chats', chatDocId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );
        return onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
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

    getChatId: chatId,
};
