'use client';

import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, MapPin, Calendar, Edit2, LogOut, Camera, Shield, X, Trash2, AlertTriangle, Heart, Save, ExternalLink, Building2, Lock, Clock, CheckCircle, XCircle, AlertCircle, Store, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UserService } from '@/services/user.service';
import { StorageService } from '@/services/storage.service';
import { AnalyticsService } from '@/services/analytics.service';
import { Capacitor } from '@capacitor/core';
import ImageUploader from '@/components/ui/ImageUploader';
import ImageCropModal from '@/components/ui/ImageCropModal';
import { FavoritesService, FavoriteRecord } from '@/services/favorites.service';
import { BookingService } from '@/services/booking.service';
import { BookingDocument } from '@/types/firestore-schema';
import { useLocale, useTranslations } from 'next-intl';
import { PlacesLocationPicker, LocationResult } from '@/components/business/setup/PlacesLocationPicker';
import { getCountryConfig } from '@/lib/locations';
import { ActiveCountry } from '@/lib/activeCountry';

export default function UserProfilePage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('userProfile');

    const [loading, setLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [cropModal, setCropModal] = useState<{ isOpen: boolean; imageSrc: string; file: File | null }>({
        isOpen: false,
        imageSrc: '',
        file: null
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        displayName: '',
        phoneNumber: '',
        userLocation: {
            address: '',
            placeId: '',
            lat: undefined as number | undefined,
            lng: undefined as number | undefined,
            countryCode: '',
        }
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showReauthModal, setShowReauthModal] = useState(false);
    const [reauthPassword, setReauthPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCloseBizModal, setShowCloseBizModal] = useState(false);
    const [isClosingBiz, setIsClosingBiz] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
    const [favLoading, setFavLoading] = useState(true);
    const [appointments, setAppointments] = useState<BookingDocument[]>([]);
    const [aptsLoading, setAptsLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<string | null>(null); // id being cancelled
    const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null); // id waiting inline confirm
    const [hidingId, setHidingId] = useState<string | null>(null);
    const [confirmHideId, setConfirmHideId] = useState<string | null>(null);

    // Load initial data + favorites + appointments
    useEffect(() => {
        if (user && userProfile) {
            setFormData({
                displayName: userProfile.displayName || user.displayName || '',
                phoneNumber: userProfile.phoneNumber || '',
                userLocation: {
                    address: userProfile.userLocation?.address || '',
                    placeId: userProfile.userLocation?.placeId || '',
                    lat: userProfile.userLocation?.lat || undefined,
                    lng: userProfile.userLocation?.lng || undefined,
                    countryCode: userProfile.userLocation?.countryCode || userProfile.country_code || ActiveCountry.get() || 'HN',
                }
            });
        }
        if (user) {
            FavoritesService.getFavorites(user.uid)
                .then(setFavorites)
                .catch(() => { })
                .finally(() => setFavLoading(false));

            // Fetch by UID (new bookings) + email (legacy bookings), deduplicate
            const fetchAppointments = async () => {
                try {
                    const bookings = await BookingService.getByClient(user.uid);
                    // Items are already sorted by BookingsService (date desc, time desc)
                    setAppointments(bookings.slice(0, 10));
                } catch {
                    // Silent — empty state shown
                } finally {
                    setAptsLoading(false);
                }
            };
            fetchAppointments();
        } else {
            setFavLoading(false);
            setAptsLoading(false);
        }
    }, [user, userProfile]);

    const handleCancelAppointment = async (aptId: string) => {
        if (!aptId) return;
        setCancellingId(aptId);
        try {
            await BookingService.updateStatus(aptId, 'canceled');
            setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: 'canceled' } as any : a));
            toast.success(t('aptCancelled'), { icon: '📅' });
        } catch {
            toast.error(t('aptCancelError'));
        } finally {
            setCancellingId(null);
            setConfirmCancelId(null);
        }
    };

    const handleHideAppointment = async (aptId: string) => {
        if (!aptId) return;
        setHidingId(aptId);
        try {
            await BookingService.hideForClient(aptId);
            setAppointments(prev => prev.filter(a => a.id !== aptId));
            toast.success(t('aptHidden'), { icon: '👁️' });
        } catch {
            toast.error(t('aptHideError'));
        } finally {
            setHidingId(null);
            setConfirmHideId(null);
        }
    };




    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const objectUrl = URL.createObjectURL(file);
        setCropModal({ isOpen: true, imageSrc: objectUrl, file });
        
        // Reset input
        e.target.value = '';
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!user || !cropModal.file) return;

        setLoading(true);
        setUploadingAvatar(true);
        try {
            const file = new File([croppedBlob], cropModal.file.name, { type: 'image/jpeg' });
            
            // 1. Upload to Storage
            const downloadURL = await StorageService.uploadUserAvatar(user.uid, file);

            // 2. Update Auth Profile (for Header)
            await updateProfile(user, { photoURL: downloadURL });

            // 3. Update Firestore (for persistence)
            // For user profile, sometimes photoURL is kept at root of doc, depending on schema.
            await UserService.updateUserProfile(user.uid, { photoURL: downloadURL });

            // Set local preview
            setAvatarPreview(downloadURL);
            toast.success('Foto actualizada correctamente');

        } catch (error: any) {
            console.error("Error uploading avatar:", error);
            toast.error("Error al subir la imagen.");
        } finally {
            setLoading(false);
            setUploadingAvatar(false);
            setCropModal({ isOpen: false, imageSrc: '', file: null });
            URL.revokeObjectURL(cropModal.imageSrc);
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

    const handleRetryLocation = async () => {
        if (!user) return;
        setLoading(true);
        if (Capacitor.isNativePlatform()) {
            try {
                const { Geolocation } = await import('@capacitor/geolocation');
                let status = await Geolocation.checkPermissions();
                if (status.location !== 'granted') status = await Geolocation.requestPermissions();
                if (status.location === 'granted') {
                    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
                    await UserService.updateUserProfile(user.uid, { userLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() } } as any);
                    AnalyticsService.track({ type: 'user_location_permission_granted', businessId: 'system', userUid: user.uid, country: userProfile?.country_code });
                    toast.success('Ubicación actualizada correctamente');
                } else {
                    toast.error('Permiso denegado');
                }
            } catch (e) {
                toast.error('Error obteniendo ubicación');
            }
        } else {
            if (!navigator.geolocation) {
                toast.error('Navegador no soporta GPS');
                return;
            }
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await UserService.updateUserProfile(user.uid, { userLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() } } as any);
                    AnalyticsService.track({ type: 'user_location_permission_granted', businessId: 'system', userUid: user.uid, country: userProfile?.country_code });
                    toast.success('Ubicación actualizada correctamente');
                    setLoading(false);
                },
                (err) => {
                    toast.error('Permiso GPS denegado');
                    setLoading(false);
                },
                { enableHighAccuracy: true }
            );
        }
        setLoading(false);
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
                    router.push(`/${locale}/auth/login?reason=reauth`);
                } else {
                    // For email users: show password re-auth modal
                    setShowReauthModal(true);
                }
            } else {
                toast.error('Error al eliminar cuenta: ' + (error.message || 'Intenta de nuevo'));
            }
        }
    };

    const confirmCloseBusiness = async () => {
        if (!user || !userProfile) return;
        setIsClosingBiz(true);
        try {
            const bizId = userProfile.businessProfileId || user.uid;
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            // 1. Deactivate business doc
            const bizRef = doc(db, 'businesses', bizId);
            await updateDoc(bizRef, { status: 'deactivated', 'planData.planStatus': 'cancelled' }).catch(() => {});
            
            // 2. Remove provider role from user
            await UserService.updateUserProfile(user.uid, {
                'roles.provider': false,
                role: 'client',
                providerOnboardingStatus: null
            } as any);
            
            toast.success('Negocio cerrado cerrado. Sigues siendo un usuario normal.');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error(error);
            toast.error('Error al cerrar negocio');
        } finally {
            setIsClosingBiz(false);
            setShowCloseBizModal(false);
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
        <div className="min-h-screen bg-[#F4F6F8] text-slate-900 pb-20 md:pb-12" style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom), 20px) + 20px)' }}>
            {/* Header / Nav Back */}
            <div
                className="bg-white/95 backdrop-blur-2xl border-b border-slate-200/60 px-6 pb-4 pt-4 flex items-center justify-between sticky top-0 z-50 shadow-sm"
                style={{ paddingTop: 'calc(max(env(safe-area-inset-top), 20px) + 12px)' }}
            >
                <Link href="/">
                    <img src="/logo-header.png" alt="Pro24/7" className="h-10 w-auto object-contain drop-shadow-sm" style={{ maxWidth: '160px' }} />
                </Link>
                <button type="button" onClick={() => router.push(`/${locale}`)} className="text-sm font-bold text-slate-500 hover:text-[#14B8A6] transition-colors">
                    {t('back')}
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

                {/* 1. Identity Section */}
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
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
                                className="text-xs text-[#14B8A6] hover:underline disabled:opacity-50"
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
                                    className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl px-4 py-3 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
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
                                        className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-[#14B8A6]/50 focus:outline-none transition-colors"
                                        placeholder={t('phonePlaceholder')}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="email"
                                        value={user?.email || userProfile?.email || ''}
                                        disabled={true}
                                        className="w-full bg-slate-100/50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-500 cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                                    {t('addressLabel')}
                                    {formData.userLocation.lat && (
                                        <span className="text-xs text-green-500 font-medium normal-case flex items-center"><CheckCircle className="w-3 h-3 inline mr-1" /> Ubicación confirmada</span>
                                    )}
                                </label>
                                <div className="rounded-xl overflow-hidden border border-slate-200">
                                    <PlacesLocationPicker
                                        countryCode={formData.userLocation.countryCode || 'HN'}
                                        defaultMapCenter={getCountryConfig((formData.userLocation.countryCode as any) || 'HN').coordinates}
                                        onLocationSelect={(result) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                userLocation: {
                                                    ...prev.userLocation,
                                                    address: result.displayAddress || result.formattedAddress,
                                                    lat: result.lat,
                                                    lng: result.lng,
                                                    placeId: result.placeId,
                                                    countryCode: result.country || prev.userLocation.countryCode || 'HN',
                                                }
                                            }));
                                        }}
                                        initialAddress={formData.userLocation.address || ''}
                                        initialLat={formData.userLocation.lat}
                                        initialLng={formData.userLocation.lng}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRetryLocation}
                                    disabled={loading}
                                    className="text-xs font-bold text-[#14B8A6] hover:underline mt-2 flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" />
                                    Actualizar mi ubicación GPS
                                </button>
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0F766E] hover:from-[#0F766E] hover:to-[#0F766E] text-white font-extrabold text-[15px] shadow-[0_8px_20px_rgba(20,184,166,0.25)] hover:shadow-[0_10px_25px_rgba(20,184,166,0.4)] transition-all flex items-center gap-2 disabled:opacity-70 active:scale-[0.98]"
                                >
                                    <Save className="w-5 h-5" />
                                    {loading ? t('saving') : t('saveBtn')}
                                </button>
                                {successMessage && (
                                    <span className="text-green-600 text-xs font-bold animate-in fade-in slide-in-from-left-2">
                                        {successMessage}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Mis Favoritos (Negocios Guardados) */}
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
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
                            <Link href={`/${locale}`} className="mt-3 inline-block text-xs text-[#14B8A6] hover:underline">{t('exploreBiz')}</Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {favorites.map((fav) => (
                                <Link
                                    key={fav.businessId}
                                    href={`/${locale}/negocio/perfil?id=${fav.businessId}`}
                                    className="group flex items-center gap-4 p-4 border rounded-2xl transition-all cursor-pointer overflow-hidden relative bg-red-50/30 hover:bg-red-50/80 border-[#E6E8EC] hover:border-red-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] active:scale-[0.98]"
                                >
                                    {/* Left Accent Bar */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-red-400" />

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
                                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#14B8A6] transition-colors shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Mis Citas */}
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-[rgba(20,184,166,0.08)] rounded-xl">
                            <Calendar className="w-6 h-6 text-[#14B8A6]" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{t('appointments')}</h2>
                            <p className="text-slate-500 text-xs">{t('appointmentsDesc')}</p>
                        </div>
                        <span className="ml-auto bg-[rgba(20,184,166,0.08)] text-[#0F766E] border border-[#14B8A6]/20 text-xs font-bold px-2.5 py-1 rounded-full">
                            {appointments.length}
                        </span>
                    </div>

                    {aptsLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-[#14B8A6]/30 border-t-[#14B8A6] animate-spin" />
                        </div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center py-8 text-slate-600">
                            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{t('noAppointments')}</p>
                            <Link href={`/${locale}`} className="mt-3 inline-block text-xs text-[#14B8A6] hover:underline">{t('bookFirst')}</Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {appointments.map((apt) => {
                                // In Bookings, date is string "YYYY-MM-DD" and time is "HH:MM"
                                const [y, m, d] = apt.date.split('-').map(Number);
                                const [hr, mn] = apt.time.split(':').map(Number);
                                const aptDate = new Date(y, m - 1, d, hr, mn);
                                
                                const statusKey = `aptStatus_${apt.status}` as any;
                                const statusColors: Record<string, string> = {
                                    pending: 'bg-amber-50 text-amber-700 border-amber-200',
                                    confirmed: 'bg-[rgba(20,184,166,0.10)] text-[#0F766E] border-[#14B8A6]/30',
                                    completed: 'bg-green-50 text-green-700 border-green-200',
                                    canceled: 'bg-red-50 text-red-600 border-red-200',
                                    'no-show': 'bg-slate-100 text-slate-500 border-slate-200',
                                };
                                const color = statusColors[apt.status] ?? statusColors.pending;
                                const canCancel = apt.status === 'pending' || apt.status === 'confirmed';
                                const isConfirmingCancel = confirmCancelId === apt.id;
                                const isCancelling = cancellingId === apt.id;
                                const isConfirmingHide = confirmHideId === apt.id;
                                const isHiding = hidingId === apt.id;
                                return (
                                    <div
                                        key={apt.id}
                                        className="flex items-center gap-3 p-4 border rounded-2xl transition-all relative overflow-hidden bg-teal-50/30 hover:bg-teal-50/80 border-[#E6E8EC] hover:border-[#14B8A6]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-[#14B8A6]" />
                                        {/* Date block */}
                                        <div className="shrink-0 text-center w-12">
                                            <p className="text-[#0F766E] font-bold text-lg leading-none">
                                                {aptDate.getDate()}
                                            </p>
                                            <p className="text-slate-500 text-[10px] uppercase">
                                                {aptDate.toLocaleString('default', { month: 'short' })}
                                            </p>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-900 font-semibold text-sm truncate">{apt.serviceName}</p>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
                                                <Clock className="w-3 h-3 shrink-0" />
                                                <span>{aptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {/* Inyectar nota de cancelación o confirmación aquí */}
                                            {apt.notesBusiness && (apt.status === 'canceled' || apt.status === 'confirmed') && (
                                                <div className="flex items-start gap-1.5 mt-2 px-2.5 py-2 bg-white/60 border border-slate-200/60 rounded-lg text-[11px] leading-snug italic text-slate-600 shadow-sm w-full">
                                                    <MessageCircle size={12} className="mt-[1px] shrink-0 text-slate-400" />
                                                    <span className="line-clamp-3">"{apt.notesBusiness}"</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {isConfirmingCancel ? (
                                                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                                    <span className="text-[10px] text-slate-500 font-medium">{t('aptCancelConfirm')}</span>
                                                    <button onClick={() => handleCancelAppointment(apt.id!)} disabled={isCancelling} className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold rounded-full transition-all disabled:opacity-60">
                                                        {isCancelling ? '...' : t('aptCancelYes')}
                                                    </button>
                                                    <button onClick={() => setConfirmCancelId(null)} disabled={isCancelling} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-full transition-all">
                                                        {t('aptCancelNo')}
                                                    </button>
                                                </div>
                                            ) : isConfirmingHide ? (
                                                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                                    <span className="text-[10px] text-slate-500 font-medium">{t('aptHideConfirm')}</span>
                                                    <button onClick={() => handleHideAppointment(apt.id!)} disabled={isHiding} className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold rounded-full transition-all disabled:opacity-60">
                                                        {isHiding ? '...' : t('aptHideYes')}
                                                    </button>
                                                    <button onClick={() => setConfirmHideId(null)} disabled={isHiding} className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-full transition-all">
                                                        {t('aptHideNo')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${color}`}>
                                                        {t(statusKey)}
                                                    </span>
                                                    {canCancel && (
                                                        <button onClick={() => setConfirmCancelId(apt.id!)} title={t('aptCancelBtn')} className="p-1 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-50 transition-all">
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setConfirmHideId(apt.id!)} title={t('aptHideBtn')} className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 4. Danger Zone */}
                <div className="glass-panel p-6 md:p-8 relative overflow-hidden border-red-500/20 shadow-[0_4px_24px_rgba(239,68,68,0.08)]">
                    {/* Background faint red glow */}
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-red-500/10 rounded-full blur-[50px] pointer-events-none"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h2 className="text-lg font-bold text-red-600">{t('dangerZone')}</h2>
                    </div>

                    {(userProfile?.roles?.provider || userProfile?.role === 'provider' || userProfile?.providerOnboardingStatus === 'completed') && (
                        <div className="mb-6 pb-6 border-b border-red-100">
                            <p className="text-sm text-slate-600 mb-4 font-medium">
                                Si ya no ofreces servicios, puedes cerrar tu negocio en PRO24/7YA conservando tu cuenta de usuario básica (para buscar servicios o ver tus citas).
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowCloseBizModal(true)}
                                className="px-6 py-2.5 rounded-xl bg-orange-100/50 hover:bg-orange-100 text-orange-700 font-bold text-sm border border-orange-200 transition-all flex items-center gap-2 active:scale-[0.98]"
                            >
                                <Store className="w-4 h-4" />
                                Cerrar mi Negocio
                            </button>
                        </div>
                    )}

                    <p className="text-sm text-slate-400 mb-6">
                        {t('dangerDesc')}
                    </p>
                    <button
                        type="button" // Explicitly prevent form submission
                        onClick={handleDeleteAccount}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-extrabold text-sm shadow-[0_8px_20px_rgba(239,68,68,0.25)] hover:shadow-[0_10px_25px_rgba(239,68,68,0.4)] transition-all flex items-center gap-2 w-fit active:scale-[0.98]"
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
                                <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Cuenta?</h3>
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
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors border border-slate-200 hover:border-slate-200 disabled:opacity-50"
                                >
                                    Cancelar, quiero quedarme
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Business Modal */}
            {showCloseBizModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white border border-orange-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative ring-1 ring-orange-500/20">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-2">
                                <Store size={32} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">¿Cerrar Negocio?</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    Tu perfil público será ocultado y cancelarás tu suscripción activa como proveedor. 
                                    <br/><br/>
                                    <strong>Seguirás teniendo acceso</strong> a la aplicación como usuario normal para buscar servicios.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 w-full mt-4">
                                <button
                                    onClick={confirmCloseBusiness}
                                    disabled={isClosingBiz}
                                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isClosingBiz ? (
                                        <><div className="w-4 h-4 border-2 border-slate-300 border-t-white rounded-full animate-spin" /> Procesando...</>
                                    ) : (
                                        <><Store size={18} /> Sí, cerrar negocio</>
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowCloseBizModal(false)}
                                    disabled={isClosingBiz}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors border border-slate-200 disabled:opacity-50"
                                >
                                    Cancelar
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
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{t('reauth.confirmIdentity')}</h3>
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
                                className="w-full bg-[#F4F6F8] border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-400 transition-colors text-sm"
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
                                        <><Trash2 size={18} /> {t('reauth.deleteAccount')}</>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowReauthModal(false); setReauthPassword(''); }}
                                    disabled={isDeleting}
                                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-medium transition-colors border border-slate-200"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Avatar Crop Modal */}
            {cropModal.isOpen && cropModal.imageSrc && (
                <ImageCropModal
                    onClose={() => {
                        URL.revokeObjectURL(cropModal.imageSrc);
                        setCropModal({ isOpen: false, imageSrc: '', file: null });
                    }}
                    imageSrc={cropModal.imageSrc}
                    aspectRatio={1}
                    freeCrop={false}
                    onComplete={handleCropComplete}
                />
            )}
        </div>

    );
}
