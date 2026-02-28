'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft, Paperclip, Trash2, Trash, FileText, Loader2, X } from 'lucide-react';
import { ChatService, Chat, ChatMessage } from '@/services/chat.service';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const MAX_FILE_MB = 8;

export default function BusinessMessagesPage() {
    const { user } = useAuth();
    const [businessName, setBusinessName] = useState('Negocio');

    useEffect(() => {
        if (!user?.uid) return;
        getDoc(doc(db, 'businesses_public', user.uid)).then(snap => {
            if (snap.exists()) setBusinessName(snap.data()?.name || 'Negocio');
        }).catch(() => { });
    }, [user?.uid]);

    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [chatMeta, setChatMeta] = useState({ unreadBusiness: 0, unreadClient: 0 });
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set());
    const [longPressTimer, setLongPressTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const [imgPreview, setImgPreview] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to business chats
    useEffect(() => {
        if (!user?.uid) return;
        setLoading(true);
        const unsub = ChatService.subscribeToBusinessChats(user.uid, (c) => {
            setChats(c);
            setLoading(false);
        });
        return unsub;
    }, [user?.uid]);

    // Subscribe to messages + filter soft-deleted
    useEffect(() => {
        if (!activeChat?.id || !user) return;
        ChatService.markAsRead(activeChat.id, 'business');
        const unsub = ChatService.subscribeToMessages(activeChat.id, (msgs) => {
            setMessages(msgs.filter(m => !m.deletedFor?.includes(user.uid)));
        });
        return unsub;
    }, [activeChat?.id, user]);

    // Subscribe to chat meta (unread counts for delete logic)
    useEffect(() => {
        if (!activeChat?.id) return;
        const unsub = onSnapshot(doc(db, 'chats', activeChat.id), (snap) => {
            const d = snap.data();
            if (d) setChatMeta({ unreadBusiness: d.unreadBusiness ?? 0, unreadClient: d.unreadClient ?? 0 });
        });
        return unsub;
    }, [activeChat?.id]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!text.trim() || !activeChat?.id || !user || sending) return;
        const msg = text.trim();
        setText('');
        setSending(true);
        try {
            await ChatService.sendMessageWithFile(activeChat.id, msg, user.uid, 'business', businessName);
        } catch {
            setText(msg);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeChat?.id || !user) return;
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            alert(`El archivo debe ser menor de ${MAX_FILE_MB}MB`);
            return;
        }
        setUploading(true);
        try {
            const attachment = await ChatService.uploadFile(activeChat.id, file);
            await ChatService.sendMessageWithFile(activeChat.id, '', user.uid, 'business', businessName, attachment);
        } catch (err) {
            console.error('Upload failed:', err);
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
        if (!activeChat?.id || !user) return;
        await Promise.all(Array.from(selectedMsgs).map(id =>
            ChatService.deleteMessage(activeChat.id!, id, user.uid, chatMeta.unreadBusiness, chatMeta.unreadClient)
        ));
        cancelSelection();
    };
    const handleDeleteAllRead = async () => {
        if (!activeChat?.id || !user) return;
        await ChatService.deleteAllRead(activeChat.id, user.uid, 'business');
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

    return (
        <div className="-m-4 md:-m-8 h-[calc(100vh-64px)] md:h-screen flex bg-white overflow-hidden border border-slate-200 shadow-sm">

            {/* ── Left: Chat List ── */}
            <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200 bg-[#F8FAFC]`}>
                <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#14B8A6]" />
                        Mensajes
                    </h2>
                    {chats.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">{chats.length} conversaci{chats.length === 1 ? 'ón' : 'ones'}</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="w-5 h-5 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 p-4">
                            <MessageCircle className="w-8 h-8 opacity-20" />
                            <p className="text-sm text-center">No hay conversaciones aún</p>
                        </div>
                    ) : (
                        chats.map(chat => (
                            <button key={chat.id}
                                onClick={() => { setActiveChat(chat); cancelSelection(); }}
                                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 text-left hover:bg-white transition-colors ${activeChat?.id === chat.id ? 'bg-white border-l-2 border-l-[#14B8A6]' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                                    {chat.clientName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{chat.clientName}</p>
                                        {(chat.unreadBusiness ?? 0) > 0 && (
                                            <span className="ml-2 min-w-[18px] h-[18px] bg-[#14B8A6] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                                                {chat.unreadBusiness}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-slate-400 text-xs truncate mt-0.5">{chat.lastMessage || 'Sin mensajes'}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Right: Chat Window ── */}
            {activeChat ? (
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                        <button onClick={() => { setActiveChat(null); cancelSelection(); }} className="md:hidden p-1 text-slate-400">
                            <ArrowLeft size={18} />
                        </button>
                        <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                            {activeChat.clientName?.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-slate-900 text-sm flex-1 truncate">{activeChat.clientName}</p>
                        {selectionMode ? (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-slate-500">{selectedMsgs.size} sel.</span>
                                <button onClick={handleDeleteSelected} disabled={selectedMsgs.size === 0}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                                    <Trash2 size={13} />
                                    Borrar
                                </button>
                                <button onClick={cancelSelection} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                                    <X size={15} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleDeleteAllRead}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-medium shrink-0"
                                title="Borrar mensajes leídos">
                                <Trash size={14} />
                                <span className="hidden sm:inline">Borrar leídos</span>
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F8FAFC]">
                        {messages.map(msg => {
                            const isMe = msg.senderRole === 'business';
                            const isSelected = selectedMsgs.has(msg.id!);
                            return (
                                <div key={msg.id}
                                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSelected ? 'opacity-60' : ''}`}
                                    onClick={() => toggleSelect(msg.id!)}
                                    onMouseDown={() => handleLongPressStart(msg.id!)}
                                    onMouseUp={handleLongPressEnd}
                                    onTouchStart={() => handleLongPressStart(msg.id!)}
                                    onTouchEnd={handleLongPressEnd}
                                >
                                    {selectionMode && (
                                        <div className={`mr-2 mt-2 w-4 h-4 rounded-full border-2 self-center shrink-0 ${isSelected ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-300'}`} />
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

                    {/* Input */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-t border-slate-200 bg-white shrink-0">
                        <input ref={fileInputRef} type="file" accept="image/*,.pdf,application/pdf"
                            className="hidden" onChange={handleFileChange} />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                            title="Adjuntar imagen o PDF"
                            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors disabled:opacity-40 shrink-0">
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                        </button>
                        <input ref={inputRef} type="text" value={text} onChange={e => setText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 transition-all"
                        />
                        <button onClick={handleSend} disabled={!text.trim() || sending}
                            className="w-9 h-9 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95 shrink-0 shadow-md">
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 flex-col gap-3">
                    <MessageCircle className="w-10 h-10 opacity-20" />
                    <p className="text-sm">Selecciona una conversación</p>
                </div>
            )}

            {/* Image lightbox */}
            {imgPreview && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setImgPreview(null)}>
                    <img src={imgPreview} alt="Preview" className="max-w-full max-h-full rounded-xl object-contain" />
                    <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white">
                        <X size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
