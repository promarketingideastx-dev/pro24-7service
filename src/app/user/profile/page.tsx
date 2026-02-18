'use client';

import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    User, Mail, Phone, MapPin, Calendar, Edit2, LogOut, Camera, Shield, X, Trash2, AlertTriangle, Heart, Save
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UserService } from '@/services/user.service'; // Assuming this service exists or we'll add methods
import { StorageService } from '@/services/storage.service'; // For avatar upload
import ImageUploader from '@/components/ui/ImageUploader'; // Reuse our component!

export default function UserProfilePage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null); // For non-intrusive feedback
    const [formData, setFormData] = useState({
        displayName: '',
        phoneNumber: '',
        address: '',
    });
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Load initial data
    useEffect(() => {
        if (user && userProfile) {
            setFormData({
                displayName: userProfile.displayName || user.displayName || '',
                phoneNumber: userProfile.phoneNumber || '',
                address: userProfile.address || '',
            });
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
        try {
            const { AuthService } = await import('@/services/auth.service');
            await AuthService.deleteAccount();
            router.push('/');
            toast.success("Cuenta eliminada correctamente");
        } catch (error) {
            console.error("Error deleting account:", error);
            toast.error("Error al eliminar cuenta. Es posible que necesites volver a iniciar sesión por seguridad.");
        }
    };

    if (!user) return <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white pb-20">
            {/* Header / Nav Back */}
            <div className="bg-[#151b2e] border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <Link href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                    PRO24/7
                </Link>
                <button type="button" onClick={() => router.back()} className="text-sm text-slate-400 hover:text-white">
                    Volver
                </button>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

                {/* 1. Identity Section */}
                <div className="bg-[#151b2e] border border-white/5 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-xl">
                            <User className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold">Mi Perfil</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center gap-4">
                            <div
                                onClick={handleAvatarClick}
                                className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 bg-slate-800 cursor-pointer hover:border-brand-neon-cyan transition-colors"
                            >
                                {avatarPreview || user.photoURL ? (
                                    <img src={avatarPreview || user.photoURL || ''} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-600 bg-slate-900 group-hover:bg-slate-800 transition-colors">
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
                                type="button"  // Explicitly prevent form submission
                                onClick={handleAvatarClick}
                                disabled={loading}
                                className="text-xs text-brand-neon-cyan hover:underline disabled:opacity-50"
                            >
                                {loading ? 'Subiendo...' : 'Cambiar Foto'}
                            </button>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4 w-full">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Nombre Completo</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                    placeholder="Tu nombre"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Teléfono</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                        placeholder="+504 9999-9999"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Dirección / Zona</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-4 py-3 focus:border-brand-neon-cyan/50 focus:outline-none transition-colors"
                                        placeholder="Dirección completa (calle, colonia/sector, ciudad)"
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="button" // Explicitly prevent form submission
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="bg-active-blue hover:bg-active-blue-hover text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
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

                {/* 2. Engagement Section (Favorites / Etc) */}
                <div className="bg-[#151b2e] border border-white/5 rounded-3xl p-6 md:p-8 opacity-50 relative overflow-hidden group">
                    {/* Work in progress overlay */}
                    <div className="absolute inset-0 z-10 bg-[#151b2e]/60 flex items-center justify-center">
                        <span className="bg-black/50 px-4 py-2 rounded-full text-xs font-bold border border-white/10 text-slate-300">Próximamente: Favoritos y Chats</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-pink-500/10 rounded-xl">
                            <Heart className="w-6 h-6 text-pink-400" />
                        </div>
                        <h2 className="text-xl font-bold">Mis Favoritos</h2>
                    </div>
                    <p className="text-slate-400 text-sm">Aquí verás los negocios que has guardado.</p>
                </div>

                {/* 3. Danger Zone */}
                <div className="border border-red-500/10 bg-red-500/5 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <h2 className="text-lg font-bold text-red-200">Zona de Peligro</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-6">
                        Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de querer hacer esto.
                    </p>
                    <button
                        type="button" // Explicitly prevent form submission
                        onClick={handleDeleteAccount}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                        Eliminar mi cuenta permanentemente
                    </button>
                </div>

            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151b2e] border border-red-500/20 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative ring-1 ring-red-500/20">
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
                                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Sí, eliminar todo
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-medium transition-colors border border-white/5 hover:border-white/10"
                                >
                                    Cancelar, quiero quedarme
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
}
