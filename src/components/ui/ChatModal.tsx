'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, Trash2, Trash, FileText, Loader2, MessageCircle } from 'lucide-react';
import { ChatService, ChatMessage } from '@/services/chat.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ChatModalProps {
    businessId: string;
    businessName: string;
    onClose: () => void;
    isOpen?: boolean; // kept for backward compatibility
}

const MAX_FILE_MB = 8;

export default function ChatModal({ businessId, businessName, onClose }: ChatModalProps) {
    const { user, userProfile } = useAuth();
    const [chatDocId, setChatDocId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [chatMeta, setChatMeta] = useState({ unreadBusiness: 0, unreadClient: 0 });
    const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
    const [selectionMode, setSelectionMode] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);

    const clientName =
        (userProfile as any)?.clientProfile?.fullName ||
        (userProfile as any)?.displayName ||
        user?.displayName ||
        user?.email?.split('@')[0] || 'Cliente';

    // Initialize chat
    useEffect(() => {
        if (!user) return;
        ChatService.getOrCreateChat(businessId, user.uid, clientName, businessName)
            .then(id => setChatDocId(id));
    }, [user, businessId]);

    // Subscribe to messages
    useEffect(() => {
        if (!chatDocId || !user) return;
        const unsub = ChatService.subscribeToMessages(chatDocId, (msgs) => {
            setMessages(msgs.filter(m => !m.deletedFor?.includes(user.uid)));
        });
        ChatService.markAsRead(chatDocId, 'client').catch(() => { });
        return unsub;
    }, [chatDocId, user]);

    // Subscribe to chat meta
    useEffect(() => {
        if (!chatDocId) return;
        const unsub = onSnapshot(doc(db, 'chats', chatDocId), (snap) => {
            const d = snap.data();
            if (d) setChatMeta({ unreadBusiness: d.unreadBusiness ?? 0, unreadClient: d.unreadClient ?? 0 });
        });
        return unsub;
    }, [chatDocId]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || !chatDocId || !user || sending) return;
        const msg = text.trim();
        setText('');
        setSending(true);
        try {
            await ChatService.sendMessageWithFile(chatDocId, msg, user.uid, 'client', clientName);
        } catch {
            setText(msg);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !chatDocId || !user) return;
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            alert(`El archivo debe ser menor de ${MAX_FILE_MB}MB`);
            return;
        }
        setUploading(true);
        try {
            const attachment = await ChatService.uploadFile(chatDocId, file);
            await ChatService.sendMessageWithFile(chatDocId, '', user.uid, 'client', clientName, attachment);
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Error al subir el archivo. Por favor intenta de nuevo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleLongPressStart = (msgId: string) => {
        const timer = setTimeout(() => {
            setSelectionMode(true);
            setSelectedMsgs(new Set([msgId]));
        }, 500);
        setLongPressTimer(timer);
    };
    const handleLongPressEnd = () => {
        if (longPressTimer) { clearTimeout(longPressTimer); setLongPressTimer(null); }
    };
    const toggleSelect = (msgId: string) => {
        if (!selectionMode) return;
        setSelectedMsgs(prev => {
            const next = new Set(prev);
            next.has(msgId) ? next.delete(msgId) : next.add(msgId);
            return next;
        });
    };
    const cancelSelection = () => { setSelectionMode(false); setSelectedMsgs(new Set()); };

    const handleDeleteSelected = async () => {
        if (!chatDocId || !user) return;
        await Promise.all(Array.from(selectedMsgs).map(id =>
            ChatService.deleteMessage(chatDocId, id, user.uid, chatMeta.unreadBusiness, chatMeta.unreadClient)
        ));
        cancelSelection();
    };

    const handleDeleteAllRead = async () => {
        if (!chatDocId || !user) return;
        await ChatService.deleteAllRead(chatDocId, user.uid, 'client');
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        try { return formatDistanceToNow(ts.toDate?.() ?? new Date(ts), { addSuffix: true, locale: es }); } catch { return ''; }
    };

    const renderAttachment = (msg: ChatMessage, isMe: boolean) => {
        if (!msg.fileUrl) return null;
        if (msg.fileType === 'image') return (
            <button onClick={() => setImgPreview(msg.fileUrl!)}
                className="mt-1.5 block max-w-[220px] rounded-xl overflow-hidden border border-slate-200">
                <img src={msg.fileUrl} alt={msg.fileName} className="w-full object-cover max-h-48" />
            </button>
        );
        return (
            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                className={`mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors max-w-[220px] ${isMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                <FileText size={14} className="shrink-0" />
                <span className="truncate">{msg.fileName ?? 'Archivo'}</span>
            </a>
        );
    };

    if (!user) return null;

    return (
        <>
            <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
                <div className="w-full sm:max-w-md h-[85dvh] sm:h-[70vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl border border-slate-200">

                    {/* Header — light */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] font-bold text-sm">
                                {businessName.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-slate-900 font-semibold text-sm truncate max-w-[160px]">{businessName}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {selectionMode ? (
                                <>
                                    <span className="text-xs text-slate-500 mr-1">{selectedMsgs.size} sel.</span>
                                    <button onClick={handleDeleteSelected} disabled={selectedMsgs.size === 0}
                                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                                        <Trash2 size={13} />
                                        Borrar
                                    </button>
                                    <button onClick={cancelSelection} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleDeleteAllRead}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-medium"
                                        title="Borrar mensajes leídos">
                                        <Trash size={13} />
                                        Borrar
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                        <X size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Messages — light bg */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#F4F6F8]">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <MessageCircle size={28} className="opacity-20" />
                                <p className="text-xs">Di hola 👋</p>
                            </div>
                        )}
                        {messages.map(msg => {
                            const isMe = msg.senderRole === 'client';
                            const isSelected = selectedMsgs.has(msg.id!);
                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSelected ? 'opacity-60' : ''}`}
                                    onClick={() => toggleSelect(msg.id!)}
                                    onMouseDown={() => handleLongPressStart(msg.id!)}
                                    onMouseUp={handleLongPressEnd}
                                    onTouchStart={() => handleLongPressStart(msg.id!)}
                                    onTouchEnd={handleLongPressEnd}
                                >
                                    {selectionMode && (
                                        <div className={`mr-2 mt-2 w-4 h-4 rounded-full border-2 flex-shrink-0 self-center ${isSelected ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-300'}`} />
                                    )}
                                    <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {!isMe && <span className="text-[10px] text-slate-500 ml-1 mb-0.5">{msg.senderName}</span>}
                                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-[#14B8A6] text-white rounded-br-sm' : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'} ${selectionMode ? 'cursor-pointer' : ''}`}>
                                            {msg.text && <p>{msg.text}</p>}
                                            {renderAttachment(msg, isMe)}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-0.5 mx-1">{formatTime(msg.createdAt)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input — light */}
                    <div className="border-t border-slate-200 bg-white px-3 py-3 flex items-center gap-2.5 shrink-0">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || !chatDocId}
                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-40 shrink-0"
                            title="Adjuntar imagen o PDF"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!text.trim() || sending || !chatDocId}
                            className="w-9 h-9 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95 shrink-0 shadow-md"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Image lightbox */}
            {imgPreview && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setImgPreview(null)}>
                    <img src={imgPreview} alt="Preview" className="max-w-full max-h-full rounded-xl object-contain" />
                    <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white">
                        <X size={20} />
                    </button>
                </div>
            )}
        </>
    );
}
