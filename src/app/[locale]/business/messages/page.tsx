'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { ChatService, Chat, ChatMessage } from '@/services/chat.service';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function BusinessMessagesPage() {
    const { user } = useAuth();
    // businessId is always user.uid (same pattern as dashboard, clients, etc.)
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
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

    // Subscribe to messages in selected chat
    useEffect(() => {
        if (!activeChat?.id) return;
        ChatService.markAsRead(activeChat.id, 'business');
        const unsub = ChatService.subscribeToMessages(activeChat.id, setMessages);
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
            await ChatService.sendMessage(activeChat.id, msg, user.uid, 'business', businessName);
        } catch {
            setText(msg);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-[calc(100vh-60px)] flex bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">

            {/* ── Left: Chat List ── */}
            <div className={`${activeChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-slate-200 bg-[#F8FAFC]`}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-[#14B8A6]" />
                        Mensajes
                    </h2>
                    {chats.length > 0 && (
                        <p className="text-xs text-slate-500 mt-0.5">{chats.length} conversaci{chats.length === 1 ? 'ón' : 'ones'}</p>
                    )}
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                        <div className="flex justify-center pt-12">
                            <div className="w-6 h-6 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-16 text-slate-400 gap-3 px-6 text-center">
                            <MessageCircle className="w-12 h-12 opacity-20" />
                            <p className="text-sm">Aún no tienes mensajes de clientes.</p>
                            <p className="text-xs opacity-70">Los clientes pueden escribirte desde tu perfil público.</p>
                        </div>
                    ) : (
                        chats.map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => { setActiveChat(chat); setMessages([]); setTimeout(() => inputRef.current?.focus(), 200); }}
                                className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-white transition-colors text-left ${activeChat?.id === chat.id ? 'bg-white border-l-2 border-[#14B8A6]' : ''}`}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] font-bold shrink-0">
                                    {chat.clientName?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <p className="font-semibold text-slate-900 text-sm truncate">{chat.clientName}</p>
                                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{formatDate(chat.lastMessageAt)}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{chat.lastMessage || 'Sin mensajes aún'}</p>
                                </div>
                                {/* Unread badge */}
                                {chat.unreadBusiness > 0 && (
                                    <span className="w-5 h-5 rounded-full bg-[#14B8A6] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {chat.unreadBusiness}
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ── Right: Chat Window ── */}
            {activeChat ? (
                <div className="flex-1 flex flex-col">
                    {/* Chat header */}
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-200 bg-white shrink-0">
                        <button onClick={() => setActiveChat(null)} className="md:hidden p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="w-9 h-9 rounded-full bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                            {activeChat.clientName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 text-sm">{activeChat.clientName}</p>
                            <p className="text-[10px] text-slate-500">Cliente</p>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F4F6F8]">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <MessageCircle className="w-10 h-10 opacity-20" />
                                <p className="text-sm">Inicia la conversación con {activeChat.clientName}</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderRole === 'business';
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[72%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                            {!isMe && <span className="text-[10px] text-slate-500 ml-1">{msg.senderName}</span>}
                                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                                                ? 'bg-[#14B8A6] text-white rounded-br-sm'
                                                : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'
                                                }`}>
                                                {msg.text}
                                            </div>
                                            <span className={`text-[10px] text-slate-400 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                {formatTime(msg.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={bottomRef} />
                    </div>

                    {/* Input */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-t border-slate-200 bg-white shrink-0">
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!text.trim() || sending}
                            className="w-10 h-10 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 shrink-0 shadow-md"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 flex-col gap-3">
                    <MessageCircle className="w-16 h-16 opacity-15" />
                    <p className="text-sm">Selecciona una conversación</p>
                </div>
            )}
        </div>
    );
}
