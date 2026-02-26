'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { ChatService, ChatMessage } from '@/services/chat.service';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId: string;
    businessName: string;
}

export default function ChatModal({ isOpen, onClose, businessId, businessName }: ChatModalProps) {
    const { user, userProfile } = useAuth();
    const t = useTranslations('chat');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [chatDocId, setChatDocId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Init chat
    useEffect(() => {
        if (!isOpen || !user) return;
        let unsub: (() => void) | null = null;

        const init = async () => {
            setLoading(true);
            try {
                const clientName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Cliente';
                const id = await ChatService.getOrCreateChat(businessId, user.uid, clientName, businessName);
                setChatDocId(id);
                await ChatService.markAsRead(id, 'client');

                unsub = ChatService.subscribeToMessages(id, (msgs) => {
                    setMessages(msgs);
                    setLoading(false);
                });
            } catch (err) {
                console.error('Chat init error:', err);
                setLoading(false);
            }
        };

        init();
        return () => { unsub?.(); };
    }, [isOpen, user, businessId, businessName, userProfile]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    const handleSend = async () => {
        if (!text.trim() || !chatDocId || !user || sending) return;
        const msg = text.trim();
        setText('');
        setSending(true);
        try {
            const senderName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Cliente';
            await ChatService.sendMessage(chatDocId, msg, user.uid, 'client', senderName);
        } catch (err) {
            console.error('Send error:', err);
            setText(msg); // restore
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const d = ts.toDate?.() ?? new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;

    if (!user) {
        return (
            <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl p-8 text-center shadow-2xl w-full max-w-sm">
                    <MessageCircle className="w-12 h-12 text-[#14B8A6] mx-auto mb-4" />
                    <h3 className="font-bold text-slate-900 mb-2">{t('loginRequired')}</h3>
                    <p className="text-slate-500 text-sm mb-4">{t('loginRequiredDesc')}</p>
                    <button onClick={onClose} className="w-full py-2.5 bg-slate-100 rounded-xl text-slate-700 font-medium">{t('close')}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                style={{ height: '85vh', maxHeight: '600px' }}>

                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-white">
                    <div className="w-9 h-9 rounded-full bg-[#14B8A6]/15 flex items-center justify-center text-[#0F766E] font-bold text-sm shrink-0">
                        {businessName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{businessName}</p>
                        <p className="text-[10px] text-[#14B8A6]">{t('online')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#F4F6F8]">
                    {loading ? (
                        <div className="flex justify-center pt-10">
                            <div className="w-6 h-6 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                            <MessageCircle className="w-12 h-12 opacity-20" />
                            <p className="text-sm text-center">{t('startConversation')}</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderRole === 'client';
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                                        {!isMe && (
                                            <span className="text-[10px] text-slate-500 ml-1">{msg.senderName}</span>
                                        )}
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
                <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-t border-slate-200 bg-white">
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('placeholder')}
                        className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!text.trim() || sending}
                        className="w-10 h-10 rounded-full bg-[#14B8A6] hover:bg-[#0F9488] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 shrink-0 shadow-md shadow-teal-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
