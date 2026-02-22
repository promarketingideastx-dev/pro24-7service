'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { onSnapshot, query, collection, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FileImage, X, ExternalLink, Image as ImageIcon, Search } from 'lucide-react';

interface BizImage {
    businessId: string;
    businessName: string;
    country: string;
    type: 'cover' | 'logo' | 'gallery';
    url: string;
}

export default function MediaPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.media');
    const [images, setImages] = useState<BizImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<BizImage | null>(null);
    const [typeFilter, setTypeFilter] = useState<'all' | 'cover' | 'logo' | 'gallery'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'businesses_public'), limit(300));
        const unsub = onSnapshot(q, snap => {
            const imgs: BizImage[] = [];
            snap.docs.forEach(d => {
                const data = d.data();
                if (selectedCountry !== 'ALL' && data.country !== selectedCountry) return;
                const base = { businessId: d.id, businessName: data.name ?? '—', country: data.country ?? '' };
                if (data.coverImage) imgs.push({ ...base, type: 'cover', url: data.coverImage });
                if (data.logo) imgs.push({ ...base, type: 'logo', url: data.logo });
                (data.images ?? []).forEach((url: string) => {
                    if (url) imgs.push({ ...base, type: 'gallery', url });
                });
            });
            setImages(imgs);
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [selectedCountry]);

    const filtered = images.filter(img => {
        if (typeFilter !== 'all' && img.type !== typeFilter) return false;
        if (search && !img.businessName.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const coverCount = images.filter(i => i.type === 'cover').length;
    const logoCount = images.filter(i => i.type === 'logo').length;
    const galleryCount = images.filter(i => i.type === 'gallery').length;

    const TYPE_LABEL: Record<string, string> = {
        cover: t('typeCover'),
        logo: t('typeLogo'),
        gallery: t('typeGallery'),
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileImage size={20} className="text-brand-neon-cyan" />
                        {t('title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">{filtered.length} {t('files')}</p>
                </div>
                {/* Search */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('search')}
                            className="pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-neon-cyan/40 w-44"
                        />
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { key: 'all', label: t('all'), value: images.length, icon: '🖼️', color: 'text-white' },
                    { key: 'cover', label: t('typeCover'), value: coverCount, icon: '📸', color: 'text-blue-400' },
                    { key: 'logo', label: t('typeLogo'), value: logoCount, icon: '🏷️', color: 'text-purple-400' },
                    { key: 'gallery', label: t('typeGallery'), value: galleryCount, icon: '🖼️', color: 'text-cyan-400' },
                ].map(kpi => (
                    <button key={kpi.key} onClick={() => setTypeFilter(kpi.key as any)}
                        className={`bg-white/3 border rounded-xl p-4 text-left transition-all ${typeFilter === kpi.key ? 'border-brand-neon-cyan/30 bg-brand-neon-cyan/5' : 'border-white/8 hover:border-white/20'}`}>
                        <p className="text-xl mb-1">{kpi.icon}</p>
                        <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="bg-white/2 border border-white/8 rounded-2xl overflow-hidden min-h-[300px]">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="w-6 h-6 border-2 border-white/10 border-t-brand-neon-cyan rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-3 text-slate-500">
                        <ImageIcon size={36} className="opacity-20" />
                        <p className="text-sm">{t('empty')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-4">
                        {filtered.map((img, i) => (
                            <button key={i} onClick={() => setSelected(img)}
                                className="group relative aspect-square rounded-xl overflow-hidden border border-white/8 hover:border-brand-neon-cyan/40 transition-all hover:scale-[1.02] bg-white/5">
                                <img src={img.url} alt={img.businessName} className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                                    <p className="text-white text-[10px] font-semibold text-center leading-tight line-clamp-2">{img.businessName}</p>
                                    <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full text-white">{TYPE_LABEL[img.type]}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {selected && (
                <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setSelected(null)}>
                    <div className="bg-[#0a1128] border border-white/10 rounded-2xl overflow-hidden max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <div>
                                <p className="text-sm font-semibold text-white">{selected.businessName}</p>
                                <p className="text-[10px] text-slate-500">{selected.country} · {TYPE_LABEL[selected.type]}</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                                    className="p-2 text-slate-400 hover:text-brand-neon-cyan transition-colors">
                                    <ExternalLink size={14} />
                                </a>
                                <button onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-red-400 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <img src={selected.url} alt={selected.businessName} className="w-full max-h-[60vh] object-contain bg-black/20" />
                        <div className="px-4 py-2 text-[10px] text-slate-600 font-mono truncate">{selected.url}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
