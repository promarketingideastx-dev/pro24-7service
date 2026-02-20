import React from 'react';

interface GlassPanelProps {
    children: React.ReactNode;
    className?: string;
}

export default function GlassPanel({ children, className = '' }: GlassPanelProps) {
    return (
        <div className={`bg-[#1a1030]/80 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl ${className}`}>
            {children}
        </div>
    );
}
