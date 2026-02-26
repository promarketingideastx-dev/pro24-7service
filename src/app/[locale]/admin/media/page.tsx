'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import {
    onSnapshot, query, collection, limit,
    getDocs, doc, orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { TAXONOMY } from '@/lib/taxonomy';
import {
    FolderOpen, Folder, ChevronLeft, ExternalLink, Copy,
    Check, Search, Image as ImageIcon, X, Calendar,
    MapPin, Tag, RefreshCw, Layers, Filter
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusinessFolder {
    id: string;
    name: string;
    category: string;
    subcategories: string[];
    country: string;
    city: string;
    department: string;
    createdAt: any;
    coverImage?: string;
    logoUrl?: string;
    images: string[];    // gallery
    totalPhotos: number;
    lastUpload?: any;
}

interface PortfolioPhoto {
    id: string;
    url: string;
    description?: string;
    title?: string;
    createdAt?: any;
}

interface BusinessDetail extends BusinessFolder {
    portfolio: PortfolioPhoto[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
    if (!ts) return '—';
    const d = ts?.toDate?.() ?? (ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-HN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCategoryLabel(catId: string, lang: string): string {
    const cat = TAXONOMY[catId as keyof typeof TAXONOMY];
    if (!cat) return catId;
    return (cat.label as any)[lang] ?? cat.label.es;
}

function getSubcategoryLabel(subId: string, lang: string): string {
    for (const cat of Object.values(TAXONOMY)) {
        const sub = cat.subcategories.find(s => s.id === subId);
        if (sub) return (sub.label as any)[lang] ?? sub.label.es;
    }
    return subId;
}

function countPhotos(data: any): number {
    let count = 0;
    if (data.coverImage) count++;
    if (data.logoUrl || data.logo) count++;
    count += (data.images || []).length;
    return count;
}

// ─── Sub-component: Photo Tile ────────────────────────────────────────────────

function PhotoTile({
    url, label, onPreview
}: { url: string; label?: string; onPreview: (url: string) => void }) {
    const [copied, setCopied] = useState(false);

    const copy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <div
            className="group relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer hover:border-[#14B8A6]/50 hover:shadow-md transition-all"
            onClick={() => onPreview(url)}
        >
            <img
                src={url}
                alt={label || 'photo'}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                {label && (
                    <span className="text-white text-[10px] font-semibold text-center leading-tight line-clamp-2">
                        {label}
                    </span>
                )}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={copy}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                        title="Copiar URL"
                    >
                        {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                        title="Ver original"
                    >
                        <ExternalLink size={11} />
                    </a>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-component: Photo Section ─────────────────────────────────────────────

function PhotoSection({
    title, icon, photos, label, onPreview
}: {
    title: string;
    icon: string;
    photos: { url: string; label?: string }[];
    label?: string;
    onPreview: (url: string) => void;
}) {
    if (photos.length === 0) return null;
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{icon}</span>
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {photos.length}
                </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {photos.map((p, i) => (
                    <PhotoTile key={i} url={p.url} label={p.label} onPreview={onPreview} />
                ))}
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MediaPage() {
    const { selectedCountry } = useAdminContext();
    const locale = useLocale();
    const lang = locale === 'pt-BR' ? 'pt' : locale === 'en' ? 'en' : 'es';
    const t = useTranslations('admin.media');

    // ── State ──
    const [folders, setFolders] = useState<BusinessFolder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCat, setFilterCat] = useState<string>('all');

    // Folder view → detail view
    const [openFolder, setOpenFolder] = useState<string | null>(null);
    const [detail, setDetail] = useState<BusinessDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Photo preview modal
    const [preview, setPreview] = useState<string | null>(null);

    // Real-time KPI: total photos uploaded last 7 days (approximate via createdAt)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // ── Load folders (real-time) ──
    useEffect(() => {
        const q = query(collection(db, 'businesses_public'), limit(300));
        const unsub = onSnapshot(q, snap => {
            const list: BusinessFolder[] = [];
            snap.docs.forEach(d => {
                const data = d.data();
                if (selectedCountry !== 'ALL' && data.country !== selectedCountry) return;

                const images: string[] = [];
                (data.images || []).forEach((url: string) => { if (url) images.push(url); });

                list.push({
                    id: d.id,
                    name: data.name ?? '—',
                    category: data.category ?? '',
                    subcategories: data.subcategories || (data.subcategory ? [data.subcategory] : []),
                    country: data.country ?? '',
                    city: data.city ?? '',
                    department: data.department ?? '',
                    createdAt: data.createdAt,
                    coverImage: data.coverImage || undefined,
                    logoUrl: data.logoUrl || data.logo || undefined,
                    images,
                    totalPhotos: countPhotos(data),
                    lastUpload: data.updatedAt,
                });
            });

            // Sort: most photos first (busiest businesses at top)
            list.sort((a, b) => b.totalPhotos - a.totalPhotos);
            setFolders(list);
            setLoading(false);

            // If a folder is open, sync its data if it was modified
            if (openFolder) {
                const updated = list.find(f => f.id === openFolder);
                if (updated && detail) {
                    setDetail(prev => prev ? { ...prev, ...updated } : prev);
                }
            }
        }, () => setLoading(false));
        return () => unsub();
    }, [selectedCountry]);

    // ── Open folder → load detail + portfolio (real-time) ──
    const openBusinessFolder = useCallback(async (folder: BusinessFolder) => {
        setOpenFolder(folder.id);
        setDetailLoading(true);

        try {
            // Load portfolio subcollection once then subscribe
            const portfolioRef = collection(db, 'businesses_public', folder.id, 'portfolio_posts');
            const portfolioSnap = await getDocs(query(portfolioRef, orderBy('createdAt', 'desc')));
            const portfolio: PortfolioPhoto[] = portfolioSnap.docs.map(d => ({
                id: d.id,
                ...d.data() as any,
            }));

            setDetail({ ...folder, portfolio });
        } catch {
            setDetail({ ...folder, portfolio: [] });
        } finally {
            setDetailLoading(false);
        }
    }, []);

    // Subscribe to portfolio real-time when folder is open
    useEffect(() => {
        if (!openFolder) return;
        const portfolioRef = collection(db, 'businesses_public', openFolder, 'portfolio_posts');
        const unsub = onSnapshot(
            query(portfolioRef, orderBy('createdAt', 'desc')),
            snap => {
                const portfolio: PortfolioPhoto[] = snap.docs.map(d => ({
                    id: d.id, ...d.data() as any,
                }));
                setDetail(prev => prev ? { ...prev, portfolio } : prev);
            }
        );
        return () => unsub();
    }, [openFolder]);

    // Also subscribe to the individual business doc when folder is open (for gallery/cover)
    useEffect(() => {
        if (!openFolder) return;
        const docRef = doc(db, 'businesses_public', openFolder);
        const unsub = onSnapshot(docRef, snap => {
            if (!snap.exists()) return;
            const data = snap.data();
            const images: string[] = (data.images || []).filter(Boolean);
            setDetail(prev => prev ? {
                ...prev,
                coverImage: data.coverImage || undefined,
                logoUrl: data.logoUrl || data.logo || undefined,
                images,
                totalPhotos: countPhotos(data),
            } : prev);
        });
        return () => unsub();
    }, [openFolder]);

    // ── Derived ──
    const filtered = folders.filter(f => {
        if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCat !== 'all' && f.category !== filterCat) return false;
        return true;
    });

    const totalPhotos = folders.reduce((acc, f) => acc + f.totalPhotos, 0);
    const recentFolders = folders.filter(f => {
        const ts = f.createdAt?.toMillis?.() ?? (f.createdAt?.seconds ? f.createdAt.seconds * 1000 : 0);
        return ts > sevenDaysAgo;
    });

    // ── Render: Detail view ──────────────────────────────────────────────────
    if (openFolder && detail) {
        const coverPhotos = detail.coverImage ? [{ url: detail.coverImage, label: 'Portada' }] : [];
        const logoPhotos = detail.logoUrl ? [{ url: detail.logoUrl, label: 'Logo' }] : [];
        const galleryPhotos = detail.images.map(url => ({ url }));
        const portfolioPhotos = detail.portfolio.map(p => ({ url: p.url, label: p.title || p.description }));

        return (
            <div className="space-y-5">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => { setOpenFolder(null); setDetail(null); }}
                        className="flex items-center gap-1.5 text-sm text-[#14B8A6] hover:text-[#0F766E] font-semibold transition-colors"
                    >
                        <ChevronLeft size={16} />
                        Archivos &amp; Media
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <FolderOpen size={15} className="text-[#14B8A6]" />
                        {detail.name}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Tiempo real
                    </span>
                </div>

                {/* Business metadata card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-4 items-start">
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                        {detail.logoUrl || detail.coverImage ? (
                            <img
                                src={detail.logoUrl || detail.coverImage}
                                alt={detail.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <FolderOpen size={22} className="text-slate-300" />
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">{detail.name}</h2>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Tag size={11} className="text-[#14B8A6]" />
                                {detail.category ? getCategoryLabel(detail.category, lang) : '—'}
                            </span>
                            {detail.subcategories.length > 0 && (
                                <span className="flex items-center gap-1">
                                    <Layers size={11} className="text-[#14B8A6]" />
                                    {detail.subcategories.map(s => getSubcategoryLabel(s, lang)).join(' · ')}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-[#14B8A6]" />
                                {[detail.city, detail.department, detail.country].filter(Boolean).join(', ') || '—'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-[#14B8A6]" />
                                Creado: {formatDate(detail.createdAt)}
                            </span>
                        </div>
                    </div>

                    {/* Photo count */}
                    <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-slate-900">
                            {(coverPhotos.length + logoPhotos.length + galleryPhotos.length + portfolioPhotos.length)}
                        </p>
                        <p className="text-[11px] text-slate-400">fotos totales</p>
                    </div>
                </div>

                {detailLoading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-6 h-6 border-2 border-slate-200 border-t-[#14B8A6] rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        <PhotoSection title="Portada" icon="📸" photos={coverPhotos} onPreview={setPreview} />
                        <PhotoSection title="Logo / Avatar" icon="🏷️" photos={logoPhotos} onPreview={setPreview} />
                        <PhotoSection title="Galería" icon="🖼️" photos={galleryPhotos} onPreview={setPreview} />
                        <PhotoSection title="Portafolio" icon="🎨" photos={portfolioPhotos} onPreview={setPreview} />

                        {coverPhotos.length + logoPhotos.length + galleryPhotos.length + portfolioPhotos.length === 0 && (
                            <div className="flex flex-col items-center py-20 gap-3 text-slate-400">
                                <ImageIcon size={36} className="opacity-20" />
                                <p className="text-sm">Este negocio no tiene fotos todavía.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── Render: Folder view ──────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FolderOpen size={20} className="text-[#14B8A6]" />
                        {t('title')}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {filtered.length} negocios · {totalPhotos} fotos totales
                    </p>
                </div>

                {/* Real-time badge */}
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Actualización en tiempo real
                </span>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { icon: '📁', label: 'Negocios', value: folders.length, color: 'text-slate-800' },
                    { icon: '🖼️', label: 'Fotos totales', value: totalPhotos, color: 'text-[#14B8A6]' },
                    { icon: '🆕', label: 'Negocios nuevos (7d)', value: recentFolders.length, color: 'text-purple-600' },
                    { icon: '📊', label: 'Promedio fotos', value: folders.length > 0 ? Math.round(totalPhotos / folders.length) : 0, color: 'text-orange-500' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                        <p className="text-xl mb-1">{kpi.icon}</p>
                        <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('search')}
                        className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#14B8A6]/40 w-52"
                    />
                </div>
                {/* Category filter */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'art_design', label: '🎨 Arte' },
                        { id: 'general_services', label: '🛠️ Servicios' },
                        { id: 'beauty_wellness', label: '✨ Belleza' },
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setFilterCat(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${filterCat === cat.id
                                ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Folder grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-[#14B8A6] rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center py-20 gap-3 text-slate-400">
                    <ImageIcon size={36} className="opacity-20" />
                    <p className="text-sm">{t('empty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(folder => {
                        const thumb = folder.logoUrl || folder.coverImage || folder.images[0];
                        const catLabel = folder.category ? getCategoryLabel(folder.category, lang) : '—';
                        const subLabels = folder.subcategories.slice(0, 2).map(s => getSubcategoryLabel(s, lang));

                        return (
                            <button
                                key={folder.id}
                                onClick={() => openBusinessFolder(folder)}
                                className="group text-left bg-white border border-slate-200 hover:border-[#14B8A6]/50 hover:shadow-md rounded-2xl p-4 flex items-start gap-3 transition-all"
                            >
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                                    {thumb ? (
                                        <img
                                            src={thumb}
                                            alt={folder.name}
                                            className="w-full h-full object-cover"
                                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <Folder size={20} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[#0F766E] transition-colors">
                                        {folder.name}
                                    </p>

                                    <div className="flex flex-wrap gap-1">
                                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                            <Tag size={9} />
                                            {catLabel}
                                        </span>
                                        {subLabels.map(s => (
                                            <span key={s} className="inline-flex items-center gap-1 text-[10px] bg-[rgba(20,184,166,0.08)] text-[#0F766E] px-1.5 py-0.5 rounded font-medium border border-[#14B8A6]/20">
                                                {s}
                                            </span>
                                        ))}
                                        {folder.subcategories.length > 2 && (
                                            <span className="text-[10px] text-slate-400">+{folder.subcategories.length - 2}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                        <span className="flex items-center gap-0.5">
                                            <MapPin size={9} />
                                            {folder.country || '—'}
                                            {folder.city ? ` · ${folder.city}` : ''}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Calendar size={9} />
                                            {formatDate(folder.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                {/* Photo count badge */}
                                <div className="shrink-0 text-right">
                                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${folder.totalPhotos > 0
                                        ? 'bg-[rgba(20,184,166,0.10)] text-[#0F766E] border border-[#14B8A6]/20'
                                        : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {folder.totalPhotos} 📷
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Photo Preview Modal */}
            {preview && (
                <div
                    className="fixed inset-0 z-[5000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setPreview(null)}
                >
                    <div
                        className="relative bg-white rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <p className="text-xs font-mono text-slate-500 truncate max-w-[80%]">{preview}</p>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => navigator.clipboard.writeText(preview)}
                                    className="p-1.5 text-slate-400 hover:text-[#14B8A6] transition-colors"
                                    title="Copiar URL"
                                >
                                    <Copy size={14} />
                                </button>
                                <a
                                    href={preview}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-400 hover:text-[#14B8A6] transition-colors"
                                >
                                    <ExternalLink size={14} />
                                </a>
                                <button
                                    onClick={() => setPreview(null)}
                                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full max-h-[70vh] object-contain bg-slate-50"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
