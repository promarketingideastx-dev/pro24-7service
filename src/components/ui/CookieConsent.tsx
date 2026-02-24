'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'pro247_cookies_consent';

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) setVisible(true);
    }, []);

    const accept = (all: boolean) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            accepted: true,
            all,
            date: new Date().toISOString()
        }));
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none">
            <div className="max-w-2xl mx-auto pointer-events-auto">
                <div className="bg-[#0a1128]/95 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Cookie size={16} className="text-brand-neon-cyan" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm">Usamos cookies 🍪</h3>
                            <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                                Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido.
                                Al continuar navegando, aceptas nuestra{' '}
                                <a href="/legal/privacy" className="text-brand-neon-cyan underline hover:no-underline">Política de Privacidad</a>{' '}
                                y nuestra{' '}
                                <a href="/legal/cookies" className="text-brand-neon-cyan underline hover:no-underline">Política de Cookies</a>.
                            </p>
                        </div>
                        <button onClick={() => accept(false)} className="text-slate-500 hover:text-slate-800 transition-colors shrink-0">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Expandable details */}
                    <button
                        onClick={() => setExpanded(p => !p)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors mb-3"
                    >
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expanded ? 'Ocultar detalles' : 'Ver tipos de cookies'}
                    </button>

                    {expanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-xs">
                            {[
                                { name: '✅ Necesarias', desc: 'Autenticación, seguridad, preferencias básicas. Siempre activas.', locked: true },
                                { name: '📊 Análisis', desc: 'Nos ayudan a entender cómo usas la app para mejorarla.', locked: false },
                                { name: '🎯 Marketing', desc: 'Medir efectividad de campañas en Meta, Google, TikTok.', locked: false },
                            ].map(item => (
                                <div key={item.name} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <p className="font-semibold text-white mb-1">{item.name}</p>
                                    <p className="text-slate-500 leading-relaxed">{item.desc}</p>
                                    {item.locked && <span className="text-[10px] text-brand-neon-cyan mt-1 inline-block">Siempre activa</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex gap-2 flex-col sm:flex-row">
                        <button
                            onClick={() => accept(false)}
                            className="flex-1 sm:flex-none px-4 py-2 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                        >
                            Solo necesarias
                        </button>
                        <button
                            onClick={() => accept(true)}
                            className="flex-1 px-4 py-2 text-xs font-bold text-black bg-gradient-to-r from-brand-neon-cyan to-brand-neon-purple rounded-xl hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
                        >
                            Aceptar todo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
