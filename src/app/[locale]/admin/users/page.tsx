'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useAdminContext } from '@/context/AdminContext';
import { AdminService } from '@/services/admin.service';
import { updateDoc, doc, collection, query, where, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    Users, Search, RefreshCw, UserCheck, UserX,
    Building2, Shield, Clock, ChevronDown, MoreHorizontal, Crown
} from 'lucide-react';
import { toast } from 'sonner';

type UserRecord = {
    id: string;
    email?: string;
    displayName?: string;
    isProvider?: boolean;
    isAdmin?: boolean;
    isBanned?: boolean;
    isVip?: boolean; // Added for VIP UI
    country_code?: string;
    createdAt?: any;
    lastLogin?: any;
    businessProfileId?: string;
    currentRole?: string;
    roles?: { admin?: boolean; provider?: boolean; client?: boolean };
};

type Filter = 'all' | 'providers' | 'clients' | 'banned' | 'new';

const COUNTRY_FLAGS: Record<string, string> = {
    ALL: '🌍', HN: '🇭🇳', GT: '🇬🇹', SV: '🇸🇻', NI: '🇳🇮', CR: '🇨🇷',
    PA: '🇵🇦', MX: '🇲🇽', US: '🇺🇸', CA: '🇨🇦', CO: '🇨🇴', BR: '🇧🇷',
    AR: '🇦🇷', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨', VE: '🇻🇪', BO: '🇧🇴',
    PY: '🇵🇾', UY: '🇺🇾', DO: '🇩🇴', CU: '🇨🇺', ES: '🇪🇸',
};

const COUNTRY_NAMES: Record<string, string> = {
    HN: 'Honduras', US: 'EE.UU.', MX: 'México', BR: 'Brasil', GT: 'Guatemala',
    SV: 'El Salvador', CO: 'Colombia', AR: 'Argentina', CA: 'Canadá', ES: 'España',
    CL: 'Chile', PE: 'Perú', CR: 'Costa Rica', NI: 'Nicaragua', PA: 'Panamá',
    EC: 'Ecuador', VE: 'Venezuela', BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay',
    DO: 'Rep. Dominicana', CU: 'Cuba',
};

const ROLE_BADGE: Record<string, string> = {
    provider: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
    client: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    admin: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

function ActionMenu({ user, onRefresh }: { user: UserRecord; onRefresh: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [coords, setCoords] = useState({ top: 0, right: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        setOpen(p => !p);
    };

    const toggleBan = async () => {
        setLoading(true);
        setOpen(false);
        try {
            await updateDoc(doc(db, 'users', user.id), { isBanned: !user.isBanned });
            toast.success(user.isBanned ? 'Usuario desbloqueado' : 'Usuario bloqueado');
            onRefresh();
        } catch { toast.error('Error'); }
        finally { setLoading(false); }
    };

    const makeVip = async () => {
        setLoading(true);
        setOpen(false);
        try {
            // If they are already a provider with a profile, just update it
            if (user.isProvider && user.businessProfileId) {
                const businessDocRef = doc(db, 'businesses_public', user.businessProfileId);
                await updateDoc(businessDocRef, {
                    'planData.plan': 'vip',
                    'planData.planStatus': 'active',
                    'planData.planSource': 'collaborator_beta',
                    'planData.overriddenByCRM': true,
                    'planData.teamMemberLimit': 999,
                    'collaboratorData.activatedAt': serverTimestamp(),
                    'collaboratorData.activatedBy': 'admin_manual',
                });

                // Set isVip flag on the user doc for quick UI reference
                await updateDoc(doc(db, 'users', user.id), {
                    isVip: true
                });
            } else {
                // If they are a client (or a provider without a valid profile reference), create a skeleton VIP profile for them.
                // We use their user ID as the business document ID for simplicity, or we can just let Firestore generate one. 
                // Let's use user.id to be safe and avoid duplicates.
                const newBizId = user.id;
                const newBizRef = doc(db, 'businesses_public', newBizId);

                await setDoc(newBizRef, {
                    ownerUid: user.id,
                    ownerEmail: user.email || '',
                    ownerName: user.displayName || 'Usuario',
                    brandName: user.displayName || 'Negocio de ' + (user.email?.split('@')[0] || 'Usuario'),
                    businessName: user.displayName || 'Negocio de ' + (user.email?.split('@')[0] || 'Usuario'),
                    country: user.country_code || 'HN',
                    status: 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    category: 'servicios_profesionales',
                    planData: {
                        plan: 'vip',
                        planStatus: 'active',
                        planSource: 'collaborator_beta',
                        overriddenByCRM: true,
                        teamMemberLimit: 999
                    },
                    collaboratorData: {
                        activatedAt: serverTimestamp(),
                        activatedBy: 'admin_manual'
                    }
                });

                // Set up the required private and root documents to prevent updateProfile crashes
                await setDoc(doc(db, 'businesses_private', newBizId), {
                    id: newBizId,
                    email: user.email || '',
                    phone: '',
                    address: '',
                    department: '',
                    gallery: [],
                    socialMedia: { instagram: '', facebook: '', tiktok: '' },
                    verificationStatus: 'pending',
                    fullDescription: '',
                    updatedAt: serverTimestamp()
                });

                await setDoc(doc(db, 'businesses', newBizId), {
                    planData: {
                        plan: 'vip',
                        planStatus: 'active',
                        planSource: 'collaborator_beta',
                        overriddenByCRM: true,
                        teamMemberLimit: 999
                    },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }, { merge: true });

                // Update the user record to reflect they are now a provider with this profile
                await updateDoc(doc(db, 'users', user.id), {
                    isProvider: true,
                    isVip: true,
                    businessProfileId: newBizId,
                    'roles.provider': true
                });
            }

            toast.success('¡Usuario convertido y ascendido a VIP Colaborador exitosamente!');
            onRefresh();
        } catch (err: any) {
            console.error(err);
            toast.error('Error al ascender a VIP.');
        } finally {
            setLoading(false);
        }
    };

    const dropdown = open ? (
        <div
            style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 9999 }}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl w-48 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
            onMouseDown={e => e.stopPropagation()}
        >
            <button
                onClick={toggleBan}
                className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 hover:bg-slate-50 transition-colors ${user.isBanned ? 'text-green-500' : 'text-slate-700'}`}
            >
                {user.isBanned ? <><UserCheck size={14} className="text-green-500" /> Desbloquear</> : <><UserX size={14} className="text-red-500" /> Bloquear usuario</>}
            </button>
            <button
                onClick={makeVip}
                className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 hover:bg-amber-50/50 transition-colors text-amber-600 border-t border-slate-100"
            >
                <Crown size={14} className="text-amber-500" /> Ascender a VIP
            </button>
        </div>
    ) : null;

    return (
        <div className="relative inline-block">
            <button
                ref={btnRef}
                onClick={handleOpen}
                disabled={loading}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-300 transition-all disabled:opacity-40"
                title="Acciones"
            >
                <MoreHorizontal size={14} />
            </button>
            {typeof window !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
        </div>
    );
}

export default function AdminUsersPage() {
    const { selectedCountry } = useAdminContext();
    const t = useTranslations('admin.users');
    const tc = useTranslations('admin.common');
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [filtered, setFiltered] = useState<UserRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await AdminService.getUsers();
            let list = data as UserRecord[];
            if (selectedCountry !== 'ALL') {
                list = list.filter(u => u.country_code === selectedCountry);
            }
            // Sort newest first
            list.sort((a, b) => {
                const aMs = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
                const bMs = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
                return bMs - aMs;
            });
            setUsers(list);
        } catch { toast.error('Error cargando usuarios'); }
        finally { setLoading(false); }
    }, [selectedCountry]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);

        let result = users;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(u =>
                u.email?.toLowerCase().includes(q) ||
                u.displayName?.toLowerCase().includes(q)
            );
        }
        if (filter === 'providers') result = result.filter(u => u.isProvider === true);
        if (filter === 'clients') result = result.filter(u => !u.isProvider);
        if (filter === 'banned') result = result.filter(u => u.isBanned === true);
        if (filter === 'new') result = result.filter(u => toMs(u.createdAt) > thirtyDaysAgo);
        setFiltered(result);
    }, [search, filter, users]);

    // Stats
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);
    const providers = users.filter(u => u.isProvider).length;
    const clients = users.filter(u => !u.isProvider).length;
    const newLast30 = users.filter(u => toMs(u.createdAt) > thirtyDaysAgo).length;
    const banned = users.filter(u => u.isBanned).length;

    const FILTERS: { key: Filter; label: string; count: number }[] = [
        { key: 'all', label: tc('all'), count: users.length },
        { key: 'providers', label: t('providers'), count: providers },
        { key: 'clients', label: t('clients'), count: clients },
        { key: 'new', label: t('newLast30'), count: newLast30 },
        { key: 'banned', label: t('blocked'), count: banned },
    ];

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Users size={24} className="text-[#14B8A6]" /> {t('title')}
                    </h1>
                    <p className="text-slate-400 text-sm mt-0.5">
                        {users.length} {t('title').toLowerCase()}{selectedCountry !== 'ALL' && ` en ${selectedCountry}`}
                    </p>
                </div>
                <button onClick={load} disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 transition-colors">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {tc('refresh')}
                </button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                    { label: t('providers'), val: providers, icon: <Building2 size={16} />, color: 'text-purple-400' },
                    { label: t('clients'), val: clients, icon: <UserCheck size={16} />, color: 'text-blue-400' },
                    { label: t('newLast30'), val: newLast30, icon: <Clock size={16} />, color: 'text-green-400' },
                    { label: t('blocked'), val: banned, icon: <UserX size={16} />, color: 'text-red-400' },
                ].map(s => (
                    <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4">
                        <div className={`flex items-center gap-2 mb-1 ${s.color}`}>{s.icon}<span className="text-xs font-medium">{s.label}</span></div>
                        <p className="text-2xl font-bold text-slate-900">{s.val}</p>
                    </div>
                ))}
            </div>

            {/* Filters + Search */}
            <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm text-slate-900 focus:outline-none focus:border-[#14B8A6]/50" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${filter === f.key ? 'bg-[#14B8A6]/10 border-[#14B8A6]/30 text-[#14B8A6]' : 'bg-white/3 border-slate-200 text-slate-400 hover:text-slate-800'}`}>
                            {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-2 border-[#14B8A6]/30 border-t-[#14B8A6] rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500">No se encontraron usuarios</div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl">
                    <div className="overflow-x-auto rounded-2xl">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                    <th className="text-left px-4 py-3">{t('title')}</th>
                                    <th className="text-left px-4 py-3">{t('country')}</th>
                                    <th className="text-left px-4 py-3">{t('role')}</th>
                                    <th className="text-left px-4 py-3">{t('lastAccess')}</th>
                                    <th className="text-left px-4 py-3">{t('registered')}</th>
                                    <th className="text-left px-4 py-3">{tc('active')}</th>
                                    <th className="text-right px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filtered.map(u => {
                                    const role = u.isAdmin ? 'admin' : u.isProvider ? 'provider' : 'client';
                                    const createdDate = u.createdAt?.toDate?.()?.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });
                                    const lastLogin = u.lastLogin?.toDate?.()?.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
                                    const initial = u.displayName?.charAt(0) ?? u.email?.charAt(0) ?? '?';
                                    return (
                                        <tr key={u.id} className={`hover:bg-white/3 transition-colors ${u.isBanned ? 'opacity-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14B8A6]/20 to-[#2563EB]/20 flex items-center justify-center text-slate-900 font-bold text-xs shrink-0">
                                                        {initial.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{u.displayName || '—'}</p>
                                                        <p className="text-xs text-slate-500 truncate max-w-[180px]">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                    <span className="text-base leading-none">{u.country_code ? (COUNTRY_FLAGS[u.country_code] || '🌍') : '—'}</span>
                                                    <span className="font-medium">{u.country_code ? (COUNTRY_NAMES[u.country_code] || u.country_code) : '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[role]}`}>
                                                        {role === 'admin' ? '🛡️ Admin' : role === 'provider' ? '🏢 Proveedor' : '👤 Cliente'}
                                                    </span>
                                                    {u.isVip && (
                                                        <span title="VIP Colaborador">
                                                            <Crown size={14} className="text-amber-500" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{lastLogin ?? '—'}</td>
                                            <td className="px-4 py-3 text-xs text-slate-500">{createdDate ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                {u.isBanned ? (
                                                    <span className="text-xs text-red-400 flex items-center gap-1"><UserX size={11} /> Bloqueado</span>
                                                ) : (
                                                    <span className="text-xs text-green-400 flex items-center gap-1"><UserCheck size={11} /> Activo</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <ActionMenu user={u} onRefresh={load} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
