'use client';

import Link from 'next/link';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
    title: string;
    description?: string;
    fase?: string;
    icon?: React.ReactNode;
}

export default function ComingSoon({ title, description, fase = 'Fase B', icon }: ComingSoonProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-neon-cyan/10 border border-brand-neon-cyan/20 flex items-center justify-center text-brand-neon-cyan">
                {icon ?? <Construction size={28} />}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">
                    {description ?? 'Este módulo está en desarrollo y estará disponible próximamente.'}
                </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/20 font-semibold">
                🔜 {fase}
            </span>
        </div>
    );
}
