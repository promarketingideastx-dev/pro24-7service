'use client';

import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, MapPin, Calendar, Edit2, LogOut, Camera, Shield, X, Trash2, AlertTriangle, Heart, Save, ExternalLink, Building2, Lock, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UserService } from '@/services/user.service';
import { StorageService } from '@/services/storage.service';
import ImageUploader from '@/components/ui/ImageUploader';
import { FavoritesService, FavoriteRecord } from '@/services/favorites.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import { useLocale, useTranslations } from 'next-intl';

export default function UserProfilePage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('userProfile');

    const [loading, setLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        displayName: '',
        phoneNumber: '',
        address: '',
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthPassword, setReauthPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
    const [favLoading, setFavLoading] = useState(true);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [aptsLoading, setAptsLoading] = useState(true);

    // Load initial data + favorites + appointments
    useEffect(() => {
        if (user && userProfile) {
            setFormData({
                displayName: userProfile.displayName || user.displayName || '',
                phoneNumber: userProfile.phoneNumber || '',
                address: userProfile.address || '',
            });
        }
        if (user) {
            FavoritesService.getFavorites(user.uid)
                .then(setFavorites)
                .catch(() => { })
                .finally(() => setFavLoading(false));

            if (user.email) {
                AppointmentService.getByClientEmail(user.email)
                    .then((apts) => setAppointments(apts.slice(0, 10)))
                    .catch(() => { })
                    .finally(() => setAptsLoading(false));
            } else {
                setAptsLoading(false);
            }
        } else {
            setFavLoading(false);
            setAptsLoading(false);
        }
    }, [user, userProfile]);




    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setLoading(true);
        try {
            // 1. Upload to Storage
            const downloadURL = await StorageService.uploadUserAvatar(user.uid, file);

            // 2. Update Auth Profile (for Header)
            await updateProfile(user, { photoURL: downloadURL });

            // 3. Update Firestore (for persistence)
            // If we want to save photoURL in Firestore, we should add it to UserDocument and update it here.
            // For now, we're only updating the Auth profile and local state.
            // await UserService.updateUserProfile(user.uid, { photoURL: downloadURL }); // Example if you want to save in Firestore

            // Set local preview to avoid reload
            setAvatarPreview(downloadURL);

            // Optional: Show a subtle success message
            toast.success('Foto actualizada correctamente');

        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir la imagen: " + (error.message || error));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        setSuccessMessage(null);
        try {
            await UserService.updateUserProfile(user.uid, formData);
            // Non-intrusive success feedback
            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error('Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {

        setShowDeleteModal(true);
    };

    const confirmDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            const { AuthService } = await import('@/services/auth.service');
            await AuthService.deleteAccount();
            // Success — Firebase Auth is deleted, signOut is implicit
            toast.success('Cuenta eliminada correctamente');
            router.push('/');
        } catch (error: any) {
            setIsDeleting(false);
            if (error.code === 'auth/requires-recent-login') {
                // Session too old — check if user is Google or email
                const isGoogle = user?.providerData?.[0]?.providerId === 'google.com';
                setShowDeleteModal(false);
                if (isGoogle) {
                    // For Google users: sign out and redirect to login with a message
                    toast.error('Por seguridad, vuelve a iniciar sesión con Google y luego elimina la cuenta.');
                    const { AuthService } = await import('@/services/auth.service');
                    await AuthService.logout();
                    router.push('/auth/login?reason=reauth');
                } else {
                    // For email users: show password re-auth modal
                    setShowReauthModal(true);
                }
            } else {
                toast.error('Error al eliminar cuenta: ' + (error.message || 'Intenta de nuevo'));
            }
        }
    };

    const handleReauthAndDelete = async () => {
        if (!reauthPassword) return;
        setIsDeleting(true);
        try {
            const { AuthService } = await import('@/services/auth.service');
            await AuthService.reauthAndDelete(reauthPassword);
            toast.success('Cuenta eliminada correctamente');
            router.push('/');
        } catch (error: any) {
            setIsDeleting(false);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error('Contraseña incorrecta. Intenta de nuevo.');
            } else {
                toast.error('Error: ' + (error.message || 'Intenta de nuevo'));
            }
        }
    };

    if (!user) return <div className="min-h-screen bg-[#F4F6F8] text-slate-900 flex items-center justify-center">{t('loading')}</div>;

    return (
        <div className="min-h-screen bg-[#F4F6F8] text-slate-900 pb-20">
            {/* Header / Nav Back */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                    PRO24/7
                </Link>
                <button type="button" onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-800">
                    {t('back')}
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

                {/* 1. Identity Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold">{t('title')}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-4">
                            <div
                                onClick={handleAvatarClick}
                                className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-[#E6E8EC] bg-slate-100 cursor-pointer hover:border-[#14B8A6] transition-colors"
                            >
                                {avatarPreview || user.photoURL ? (
                                    <img src={avatarPreview || user.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[#14B8A6] bg-[rgba(20,184,166,0.10)] group-hover:bg-[rgba(20,184,166,0.16)] transition-colors">
                                        {formData.displayName?.[0] || user.email?.[0] || '?'}
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                            />

                            <button
                                type="button"
                                onClick={handleAvatarClick}
                                disabled={loading}
                                className="text-xs text-brand-neon-cyan hover:underline disabled:opacity-50"
                            >
                                {loading ? t('uploadingPhoto') : t('changePhoto')}
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">{t('nameLabel')}</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl px-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                    placeholder={t('namePlaceholder')}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">{t('phoneLabel')}</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                        placeholder={t('phonePlaceholder')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">{t('addressLabel')}</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                        placeholder={t('addressPlaceholder')}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="btn-primary flex items-center gap-2 text-sm"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? t('saving') : t('saveBtn')}
                                </button>
                                {successMessage && (
                                    <span className="text-green-400 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                                        {successMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Mis Favoritos (Negocios Guardados) */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-500/10 rounded-xl">
                            <Heart className="w-6 h-6 text-red-400 fill-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('favorites')}</h2>
                            <p className="text-slate-500 text-xs">{t('favoritesDesc')}</p>
                        </div>
                        <span className="ml-auto bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold px-2.5 py-1 rounded-full">
                            {favorites.length}
                        </span>
                    </div>

                    {favLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-red-400/30 border-t-red-400 animate-spin" />
                        </div>
                    ) : favorites.length === 0 ? (
                        <div className="text-center py-8 text-slate-600">
                            <Heart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{t('noFavorites')}</p>
                            <Link href={`/${locale}`} className="mt-3 inline-block text-xs text-brand-neon-cyan hover:underline">{t('exploreBiz')}</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {favorites.map((fav) => (
                                <Link
                                    key={fav.businessId}
                                    href={`/${locale}/negocio/${fav.businessId}`}
                                    className="group flex items-center gap-4 p-4 bg-[#F8FAFC] hover:bg-white border border-[#E6E8EC] hover:border-[#14B8A6]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    {/* Logo / Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-[#E6E8EC] shrink-0 overflow-hidden flex items-center justify-center">
                                        {fav.businessLogoUrl ? (
                                            <img src={fav.businessLogoUrl} alt={fav.businessName} className="w-full h-full object-cover" />
                                        ) : (
                                            <Building2 className="w-5 h-5 text-[#14B8A6]" />
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-slate-900 font-semibold text-sm truncate group-hover:text-[#14B8A6] transition-colors">{fav.businessName}</p>
                                        <p className="text-slate-500 text-xs truncate">
                                            {[fav.businessCategory, fav.businessCity].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-brand-neon-cyan transition-colors shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Mis Citas */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-neon-cyan/10 rounded-xl">
                            <Calendar className="w-6 h-6 text-brand-neon-cyan" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('appointments')}</h2>
                            <p className="text-slate-500 text-xs">{t('appointmentsDesc')}</p>
                        </div>
                        <span className="ml-auto bg-brand-neon-cyan/10 text-brand-neon-cyan border border-brand-neon-cyan/20 text-xs font-bold px-2.5 py-1 rounded-full">
                            {appointments.length}
                        </span>
                    </div>

                    {aptsLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-brand-neon-cyan/30 border-t-brand-neon-cyan animate-spin" />
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8 text-slate-600">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{t('noAppointments')}</p>
                            <Link href={`/${locale}`} className="mt-3 inline-block text-xs text-brand-neon-cyan hover:underline">{t('bookFirst')}</Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {appointments.map((apt) => {
                                const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date();
                                const statusKey = `aptStatus_${apt.status}` as any;
                                const statusColors: Record<string, string> = {
                                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                                    confirmed: 'bg-[rgba(20,184,166,0.10)] text-[#0F766E] border-[#14B8A6]/30',
                                    completed: 'bg-green-50 text-green-700 border-green-200',
                                    cancelled: 'bg-red-50 text-red-600 border-red-200',
                                    'no-show': 'bg-slate-100 text-slate-500 border-slate-200',
                                };
                                const color = statusColors[apt.status] ?? statusColors.pending;
                                return (
                                    <div
                                        key={apt.id}
                                        className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                                    >
                                        {/* Date block */}
                                        <div className="shrink-0 text-center w-12">
                                            <p className="text-brand-neon-cyan font-bold text-lg leading-none">
                                                {aptDate.getDate()}
                                            </p>
                                            <p className="text-slate-500 text-[10px] uppercase">
                                                {aptDate.toLocaleString('default', { month: 'short' })}
                                            </p>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-semibold text-sm truncate">{apt.serviceName}</p>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" />
                                                <span>{aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        {/* Status badge */}
                                        <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full border ${color}`}>
                                            {t(statusKey)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 4. Danger Zone */}
                <div className="border border-red-500/10 bg-red-500/5 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h2 className="text-lg font-bold text-red-200">{t('dangerZone')}</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-6">
                        {t('dangerDesc')}
                    </p>
                    <button
                        type="button" // Explicitly prevent form submission
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('deleteBtn')}
                    </button>
                </div>

            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-red-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative ring-1 ring-red-500/20">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2 animate-pulse">
                                <AlertTriangle size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">¿Eliminar Cuenta?</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Esta acción es <span className="text-red-400 font-bold">irreversible</span>.
                                    Perderás todos tus datos, historial y acceso a la plataforma.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 w-full mt-4">
                                <button
                                    onClick={confirmDeleteAccount}
                                    disabled={isDeleting}
                                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <><div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" /> Eliminando...</>
                                    ) : (
                                        <><Trash2 size={18} /> Sí, eliminar todo</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-300 rounded-xl font-medium transition-colors border border-slate-200 hover:border-slate-200 disabled:opacity-50"
                                >
                                    Cancelar, quiero quedarme
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Re-authentication Modal (for email/pass users) */}
            {showReauthModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-orange-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl ring-1 ring-orange-500/20">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                                <Lock size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Confirma tu identidad</h3>
                                <p className="text-slate-400 text-sm">
                                    Por seguridad, ingresa tu contraseña actual para continuar con la eliminación de tu cuenta.
                                </p>
                            </div>
                            <input
                                type="password"
                                value={reauthPassword}
                                onChange={e => setReauthPassword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleReauthAndDelete()}
                                placeholder="Tu contraseña actual"
                                className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-400 transition-colors text-sm"
                                autoFocus
                            />
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={handleReauthAndDelete}
                                    disabled={isDeleting || !reauthPassword}
                                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isDeleting ? (
                                        <><div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" /> Eliminando...</>
                                    ) : (
                                        <><Trash2 size={18} /> Eliminar cuenta</>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowReauthModal(false); setReauthPassword(''); }}
                                    disabled={isDeleting}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-300 rounded-xl font-medium transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
