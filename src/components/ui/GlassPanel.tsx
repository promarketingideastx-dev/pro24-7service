import React from 'react';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
}

export default function GlassPanel({ children, className = '' }: GlassPanelProps) {
    return (
        <div className={`bg-white backdrop-blur-xl border border-slate-200 shadow-[0_4px_14px_rgba(0,0,0,0.15)] rounded-3xl ${className}`}>
            {children}
        </div>
    );
}
