'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ChatService, Chat, ChatMessage } from '@/services/chat.service';
import { MessageCircle, Send, ArrowLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function ClientMessagesPage() {
    const { user, userProfile } = useAuth();
    const locale = useLocale();
    const router = useRouter();
    const lp = (path: string) => `/${locale}${path}`;

    const [chats, setChats] = useState<Chat[]>([]);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const clientName =
        (userProfile as any)?.clientProfile?.fullName ||
        (userProfile as any)?.displayName ||
        user?.displayName ||
        user?.email?.split('@')[0] ||
        'Cliente';

    // Redirect if not logged in
    useEffect(() => {
        if (!user) router.replace(lp('/onboarding?mode=login'));
    }, [user]);

    // Subscribe to client's chats
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = ChatService.subscribeToClientChats(user.uid, (c) => {
            setChats(c);
            setLoading(false);
        });
        return unsub;
    }, [user?.uid]);

    // Subscribe to messages of active chat
    useEffect(() => {
        if (!activeChat?.id) return;
        const unsub = ChatService.subscribeToMessages(activeChat.id, setMessages);
        ChatService.markAsRead(activeChat.id, 'client').catch(() => { });
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
            await ChatService.sendMessage(activeChat.id, msg, user.uid, 'client', clientName);
        } catch {
            setText(msg);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        try {
            const d = ts.toDate?.() ?? new Date(ts);
            return formatDistanceToNow(d, { addSuffix: true, locale: es });
        } catch { return ''; }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-[#F4F6F8]">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-4 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-5 h-5 text-[#14B8A6]" />
                    <h1 className="text-white font-bold text-lg">Mis mensajes</h1>
                </div>
                {chats.some(c => (c.unreadClient ?? 0) > 0) && (
                    <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                        {chats.reduce((acc, c) => acc + (c.unreadClient ?? 0), 0)} sin leer
                    </span>
                )}
            </div>

            <div className="flex h-[calc(100vh-64px)]">
                {/* Left: Chat List */}
                <div className={`flex flex-col w-full md:w-80 border-r border-slate-200 bg-white shrink-0 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                        </div>
                    ) : chats.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-6">
                            <MessageCircle className="w-10 h-10 opacity-20" />
                            <p className="text-sm text-center">No tienes conversaciones aún.<br />Visita un negocio para iniciar un chat.</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            {chats.map(chat => (
                                <button
                                    key={chat.id}
                                    onClick={() => setActiveChat(chat)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 text-left hover:bg-slate-50 transition-colors ${activeChat?.id === chat.id ? 'bg-[#14B8A6]/5 border-l-2 border-l-[#14B8A6]' : ''}`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-[#14B8A6]/15 flex items-center justify-center shrink-0 text-[#0F766E] font-bold text-sm">
                                        {chat.businessName?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-slate-900 text-sm truncate">{chat.businessName}</p>
                                            {(chat.unreadClient ?? 0) > 0 && (
                                                <span className="ml-2 min-w-[18px] h-[18px] bg-[#14B8A6] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                                                    {chat.unreadClient}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-xs truncate mt-0.5">{chat.lastMessage || 'Sin mensajes'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Chat Window */}
                {activeChat ? (
                    <div className="flex-1 flex flex-col">
                        {/* Chat Header */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shrink-0">
                            <button onClick={() => setActiveChat(null)} className="md:hidden p-1 text-slate-400">
                                <ArrowLeft size={18} />
                            </button>
                            <div className="w-8 h-8 rounded-full bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                                {activeChat.businessName?.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-bold text-slate-900 text-sm">{activeChat.businessName}</p>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F4F6F8]">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                                    <MessageCircle className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">Escribe tu primer mensaje</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = msg.senderRole === 'client';
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && <span className="text-[10px] text-slate-500 ml-1">{msg.senderName}</span>}
                                                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe ? 'bg-[#14B8A6] text-white rounded-br-sm' : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm shadow-sm'}`}>
                                                    {msg.text}
                                                </div>
                                                <span className={`text-[10px] text-slate-400 ${isMe ? 'mr-1' : 'ml-1'}`}>{formatTime(msg.createdAt)}</span>
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
                                className="w-10 h-10 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] disabled:opacity-40 flex items-center justify-center text-white transition-all active:scale-95 shrink-0 shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:flex flex-1 items-center justify-center text-slate-400 flex-col gap-3">
                        <MessageCircle className="w-10 h-10 opacity-20" />
                        <p className="text-sm">Selecciona una conversación</p>
                    </div>
                )}
            </div>
        </div>
    );
}
