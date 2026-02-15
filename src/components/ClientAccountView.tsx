'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db, auth, storage } from '@/lib/firebase';
import { doc, updateDoc, collection, query, onSnapshot, orderBy, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { COUNTRIES } from '@/lib/countries';
import { CountrySelector } from './CountrySelector';
import { sanitizeData, withTimeout } from '@/lib/firestoreUtils';

// V26.2 - Structural Fix: Firestore Resilience

import { compressImage } from '@/lib/imageUtils';

const TRANSLATIONS = {
    es: {
        title: 'Mi Cuenta',
        tab_profile: 'Perfil',
        tab_favs: 'Favoritos',
        tab_requests: 'Solicitudes',
        tab_privacy: 'Privacidad',
        label_name: 'Nombre Completo',
        label_email: 'Correo (Referencia)',
        label_phone: 'Teléfono',
        label_city: 'Ciudad / Zona (Opcional)',
        label_country: 'País / Región',
        label_gender: 'Género',
        label_age: 'Rango de edad',
        label_marketing: 'Novedades y Promociones',
        label_locale: 'Idioma',
        label_units: 'Unidades',
        btn_save: 'Guardar cambios',
        btn_saving: 'Guardando...',
        btn_success: '✅ Perfil guardado',
        btn_error: '❌ Error al guardar. Reintentar',
        btn_timeout: '⏳ Conexión lenta. Reintentar',
        btn_logout: 'Cerrar Sesión',
        btn_delete_request: 'Solicitar Borrar mi Cuenta',
        delete_confirm_title: '¿Estás seguro?',
        delete_confirm_msg: 'Tu cuenta será marcada para eliminación. Este proceso puede tardar hasta 30 días.',
        btn_confirm_delete: 'Sí, solicitar eliminación',
        no_favs: 'Aún no tienes favoritos.',
        no_requests: 'No has realizado solicitudes aún.',
        status_new: 'Nuevo',
        status_processing: 'En proceso',
        status_completed: 'Completado',
        status_cancelled: 'Cancelado',
        btn_chat: 'Ir al Chat',
        error_name: 'Nombre completo requerido.',
        genders: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'],
        ages: ['18-24', '25-34', '35-44', '45-54', '55+'],
        delete_success: 'Solicitud de eliminación recibida.',
        avatar_change: 'Cambiar foto',
        avatar_options: {
            title: 'Actualizar Avatar',
            camera: 'Tomar selfie',
            gallery: 'Elegir de galería',
            emoji: 'Usar emoji',
            remove: 'Quitar avatar',
            cancel: 'Cancelar'
        },
        uploading: 'Subiendo...',
        upload_success: '✅ Foto lista para guardar',
        upload_error: '❌ No se pudo subir la foto',
        unsaved_changes: {
            title: 'Cambios sin guardar',
            msg: 'Tienes cambios que no has guardado. ¿Quieres guardarlos antes de salir?',
            btn_save_exit: 'Guardar y salir',
            btn_exit_only: 'Salir sin guardar',
            btn_cancel: 'Cancelar'
        }
    },
    en: {
        title: 'My Account',
        tab_profile: 'Profile',
        tab_favs: 'Favorites',
        tab_requests: 'Requests',
        tab_privacy: 'Privacy',
        label_name: 'Full Name',
        label_email: 'Email (Reference)',
        label_phone: 'Phone',
        label_city: 'City / Area (Optional)',
        label_country: 'Country / Region',
        label_gender: 'Gender',
        label_age: 'Age range',
        label_marketing: 'News & Promotions',
        label_locale: 'Language',
        label_units: 'Units',
        btn_save: 'Save changes',
        btn_saving: 'Saving...',
        btn_success: '✅ Profile saved',
        btn_error: '❌ Error saving. Retry',
        btn_timeout: '⏳ Slow connection. Retry',
        btn_logout: 'Log Out',
        btn_delete_request: 'Request Account Deletion',
        delete_confirm_title: 'Are you sure?',
        delete_confirm_msg: 'Your account will be marked for deletion. This process may take up to 30 days.',
        btn_confirm_delete: 'Yes, request deletion',
        no_favs: 'No favorites yet.',
        no_requests: 'No requests made yet.',
        status_new: 'New',
        status_processing: 'Processing',
        status_completed: 'Completed',
        status_cancelled: 'Cancelled',
        btn_chat: 'Go to Chat',
        error_name: 'Full name required.',
        genders: ['Male', 'Female', 'Other', 'Prefer not to say'],
        ages: ['18-24', '25-34', '35-44', '45-54', '55+'],
        delete_success: 'Deletion request received.',
        avatar_change: 'Change photo',
        avatar_options: {
            title: 'Update Avatar',
            camera: 'Take selfie',
            gallery: 'Choose from gallery',
            emoji: 'Use emoji',
            remove: 'Remove avatar',
            cancel: 'Cancel'
        },
        uploading: 'Uploading...',
        upload_success: '✅ Photo ready to save',
        upload_error: '❌ Could not upload photo',
        unsaved_changes: {
            title: 'Unsaved Changes',
            msg: 'You have unsaved changes. Would you like to save before leaving?',
            btn_save_exit: 'Save and exit',
            btn_exit_only: 'Exit without saving',
            btn_cancel: 'Cancel'
        }
    },
    pt: {
        title: 'Minha Conta',
        tab_profile: 'Perfil',
        tab_favs: 'Favoritos',
        tab_requests: 'Solicitações',
        tab_privacy: 'Privacidade',
        label_name: 'Nome Completo',
        label_email: 'E-mail (Referência)',
        label_phone: 'Telefone',
        label_city: 'Cidade / Zona (Opcional)',
        label_country: 'País / Região',
        label_gender: 'Gênero',
        label_age: 'Faixa etária',
        label_marketing: 'Novidades e Promoções',
        label_locale: 'Idioma',
        label_units: 'Unidades',
        btn_save: 'Salvar alterações',
        btn_saving: 'Salvando...',
        btn_success: '✅ Perfil salvo',
        btn_error: '❌ Erro ao salvar. Reintentar',
        btn_timeout: '⏳ Conexão lenta. Reintentar',
        btn_logout: 'Sair',
        btn_delete_request: 'Solicitar Exclusão da Conta',
        delete_confirm_title: 'Tem certeza?',
        delete_confirm_msg: 'Sua conta será marcada para exclusão. Este processo pode levar até 30 dias.',
        btn_confirm_delete: 'Sim, solicitar exclusão',
        no_favs: 'Nenhum favorito ainda.',
        no_requests: 'Nenhuma solicitação feita ainda.',
        status_new: 'Novo',
        status_processing: 'Em processamento',
        status_completed: 'Concluído',
        status_cancelled: 'Cancelado',
        btn_chat: 'Ir para o Chat',
        error_name: 'Nome completo obrigatório.',
        genders: ['Masculino', 'Femenino', 'Outro', 'Prefiero não dizer'],
        ages: ['18-24', '25-34', '35-44', '45-54', '55+'],
        delete_success: 'Solicitação de exclusão recebida.',
        avatar_change: 'Mudar foto',
        avatar_options: {
            title: 'Atualizar Avatar',
            camera: 'Tirar selfie',
            gallery: 'Escolher da galeria',
            emoji: 'Usar emoji',
            remove: 'Remover avatar',
            cancel: 'Cancelar'
        },
        uploading: 'Enviando...',
        upload_success: '✅ Foto pronta para salvar',
        upload_error: '❌ Erro ao enviar foto',
        unsaved_changes: {
            title: 'Alterações não salvas',
            msg: 'Você tem alterações não salvas. Deseja salvar antes de sair?',
            btn_save_exit: 'Salvar e sair',
            btn_exit_only: 'Sair sem salvar',
            btn_cancel: 'Cancelar'
        }
    }
};

const EMOJI_COLLECTION = ['😎', '🤠', '🦊', '🚀', '⚽', '🎨', '💼', '🏡', '🌟', '💎', '🎮', '🍎', '🐶', '🍕', '🌈', '🔥'];

type SaveStatus = 'idle' | 'saving' | 'success' | 'error' | 'timeout';

interface ClientAccountViewProps {
    onClose: () => void;
}

export default function ClientAccountView({ onClose }: ClientAccountViewProps) {
    const { user, profile, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'favorites' | 'requests' | 'privacy'>('profile');
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [favorites, setFavorites] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // UI states
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [countrySearch, setCountrySearch] = useState('');

    // Profile DRAFT State
    const [draft, setDraft] = useState({
        fullName: profile?.full_name || '',
        phone: profile?.phone || '',
        city: profile?.city_zone || '',
        countryCode: profile?.country_code || 'US',
        countryName: profile?.country_name || 'United States',
        gender: profile?.gender || '',
        ageRange: profile?.age_range || '',
        marketing: profile?.consent?.marketing_opt_in || false,
        localePref: profile?.settings?.locale || 'es',
        units: profile?.settings?.unit_km_mi || 'km',
        avatar: profile?.avatar || { type: 'none' as const, updated_at: new Date().toISOString() }
    });

    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    const [wantsToClose, setWantsToClose] = useState(false);
    const isSavingRef = useRef(false);

    const locale = (profile?.settings?.locale as keyof typeof TRANSLATIONS) || 'es';
    const t = TRANSLATIONS[locale] || TRANSLATIONS.es;

    const unmounted = useRef(false);
    const saveTimeoutRef = useRef<any>(null);

    useEffect(() => {
        return () => { unmounted.current = true; if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, []);

    // Sync draft with profile when profile is loaded or changed externally
    useEffect(() => {
        if (profile && saveStatus === 'idle' && uploadStatus === 'idle') {
            setDraft({
                fullName: profile.full_name || '',
                phone: profile.phone || '',
                city: profile.city_zone || '',
                countryCode: profile.country_code || 'US',
                countryName: profile.country_name || 'United States',
                gender: profile.gender || '',
                ageRange: profile.age_range || '',
                marketing: profile.consent?.marketing_opt_in || false,
                localePref: profile.settings?.locale || 'es',
                units: profile.settings?.unit_km_mi || 'km',
                avatar: profile.avatar
            });
        }
    }, [profile, saveStatus, uploadStatus]);

    const isDirty = useMemo(() => {
        if (!profile) return false;
        if (pendingFile) return true;
        const pAvatar = profile.avatar || { type: 'none' };
        const dAvatar = draft.avatar;

        return (
            draft.fullName !== (profile.full_name || '') ||
            draft.phone !== (profile.phone || '') ||
            draft.city !== (profile.city_zone || '') ||
            draft.countryCode !== (profile.country_code || 'US') ||
            draft.gender !== (profile.gender || '') ||
            draft.ageRange !== (profile.age_range || '') ||
            draft.marketing !== (profile.consent?.marketing_opt_in || false) ||
            draft.localePref !== (profile.settings?.locale || 'es') ||
            draft.units !== (profile.settings?.unit_km_mi || 'km') ||
            dAvatar.type !== pAvatar.type ||
            (dAvatar.type === 'emoji' && dAvatar.emoji !== pAvatar.emoji)
        );
    }, [draft, profile, pendingFile]);


    // Fetch Favorites
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/favorites`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!unmounted.current) setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    // Fetch Requests
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!unmounted.current) {
                const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRequests(all.filter((r: any) => r.owner_uid === user.uid));
            }
        });
        return () => unsubscribe();
    }, [user]);

    const handleSaveProfile = async (autoClose = false) => {
        if (!user) {
            alert('Error: No hay sesión activa. Recarga la página.');
            return;
        }
        if (!draft.fullName.trim()) return setSaveStatus('error');
        if (isSavingRef.current) return;

        setSaveStatus('saving');
        isSavingRef.current = true;

        try {
            console.log('[SAVE_START] Atomic profile save');
            let finalAvatar = { ...draft.avatar };

            if (pendingFile) {
                setUploadStatus('uploading');
                console.log('[UPLOAD_START] Avatar optimization & upload');
                try {
                    // 1. Optimización Agresiva (Cliente)
                    const optimizedBlob = await compressImage(pendingFile);

                    // 2. Subida Rápida
                    const path = `avatars/${user!.uid}/${Date.now()}.webp`;
                    const storageRef = ref(storage, path);
                    const { uploadBytes } = await import('firebase/storage');

                    // Timeout generoso (90s) para conexiones lentas, pero el archivo ya es pequeño
                    await withTimeout(uploadBytes(storageRef, optimizedBlob), 90000, 'Error: Subida de imagen tardó demasiado (Red muy lenta)');
                    const url = await getDownloadURL(storageRef);

                    finalAvatar = {
                        type: 'photo',
                        photo_url: url,
                        photo_path: path,
                        updated_at: new Date().toISOString()
                    };
                    console.log('[UPLOAD_OK] Avatar ready');
                    setUploadStatus('done');
                } catch (upErr: any) {
                    console.error('[UPLOAD_FAIL]', upErr);
                    setUploadStatus('error');
                    alert('Error al subir la imagen. Intenta con una foto más pequeña o revisa tu conexión.');
                    // No lanzamos error para permitir que se guarde el resto del perfil (nombre, tel, etc.)
                    // return; // Si descomentas esto, abortas todo el guardado. Mejor seguir.
                }
            }

            // Construct and sanitize payload
            const rawPayload = {
                full_name: draft.fullName.trim(),
                phone: draft.phone || null,
                city_zone: draft.city || null,
                country_code: draft.countryCode,
                country_name: draft.countryName,
                gender: draft.gender || null,
                age_range: draft.ageRange || null,
                avatar: finalAvatar,
                consent: {
                    ...profile?.consent,
                    marketing_opt_in: draft.marketing,
                    updated_at: new Date().toISOString()
                },
                settings: {
                    ...profile?.settings,
                    locale: draft.localePref,
                    unit_km_mi: draft.units
                },
                updatedAt: new Date().toISOString()
            };

            const cleanPayload = sanitizeData(rawPayload);
            const userRef = doc(db, 'users', user!.uid);

            console.log('[SAVE_WRITE] Sending to Firestore...');
            const startTime = Date.now();
            await withTimeout(
                setDoc(userRef, cleanPayload, { merge: true }),
                45000,
                'Error: El servidor de perfiles está tardando demasiado. Verifica tu conexión.'
            );

            // VERIFICATION STEP: Read back to confirm
            console.log('[SAVE_VERIFY] Verifying write...');
            const verifySnap = await getDoc(userRef);
            if (!verifySnap.exists()) {
                throw new Error('Error crítico: El perfil no se guardó correctamente (Documento no existe).');
            }
            const verifyData = verifySnap.data();
            if (verifyData?.updatedAt !== cleanPayload.updatedAt) {
                console.warn('[SAVE_WARN] Timestamp mismatch, potential race condition or lag.');
                // We don't throw here to avoid false negatives on minor lags, but we log it.
            }

            console.log(`[SAVE_OK] Finish in ${Date.now() - startTime}ms`);


            if (!unmounted.current) {
                setPendingFile(null);
                setPreviewUrl(null);
                setSaveStatus('success');
                refreshProfile();

                if (autoClose) {
                    setTimeout(() => onClose(), 600);
                } else {
                    setTimeout(() => { if (!unmounted.current) setSaveStatus('idle'); }, 2000);
                }
            }
        } catch (err: any) {
            console.error('[SAVE_FAIL]', err);
            if (!unmounted.current) {
                setSaveStatus('error');
                setUploadStatus('error');
                alert(err.message || "Error al guardar. Verifica tu conexión.");
            }
        } finally {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            isSavingRef.current = false;
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('Archivo demasiado grande (máx 10MB)');
            return;
        }
        setPendingFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setDraft(prev => ({ ...prev, avatar: { type: 'photo', updated_at: new Date().toISOString() } }));
        setShowAvatarMenu(false);
    };

    const handleEmojiChoice = (emoji: string) => {
        setDraft(prev => ({
            ...prev,
            avatar: {
                type: 'emoji',
                emoji: emoji,
                updated_at: new Date().toISOString()
            }
        }));
        setPendingFile(null); // Clear any pending file if emoji is picked
        setShowEmojiPicker(false);
        setShowAvatarMenu(false);
    };

    const handleRemoveAvatar = () => {
        setDraft(prev => ({
            ...prev,
            avatar: {
                type: 'none',
                updated_at: new Date().toISOString()
            }
        }));
        setPendingFile(null);
        setPreviewUrl(null);
        setShowAvatarMenu(false);
    };

    const handleCloseAttempt = () => {
        if (isDirty) {
            console.log('[UNSAVED_CHANGES_PROMPT_SHOWN]');
            setWantsToClose(true);
            setShowUnsavedPrompt(true);
        } else {
            onClose();
        }
    };

    const userEmail = profile?.email || user?.email || '—';

    return (
        <div className="account-overlay">
            <div className="account-container animate-in">
                <header className="account-header">
                    <button className="back-btn" onClick={handleCloseAttempt} aria-label="Close">✕</button>
                    <h1>{t.title}</h1>
                </header>

                <nav className="account-tabs">
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>{t.tab_profile}</button>
                    <button className={activeTab === 'favorites' ? 'active' : ''} onClick={() => setActiveTab('favorites')}>{t.tab_favs}</button>
                    <button className={activeTab === 'requests' ? 'active' : ''} onClick={() => setActiveTab('requests')}>{t.tab_requests}</button>
                    <button className={activeTab === 'privacy' ? 'active' : ''} onClick={() => setActiveTab('privacy')}>{t.tab_privacy}</button>
                </nav>

                <div className="account-content">
                    {activeTab === 'profile' && (
                        <div className="profile-tab animate-fade">

                            {/* Avatar Section */}
                            <div className="avatar-section">
                                <div className="avatar-wrapper" onClick={() => setShowAvatarMenu(true)}>
                                    {(previewUrl || (draft.avatar?.type === 'photo' && draft.avatar.photo_url)) ? (
                                        <img src={previewUrl || draft.avatar.photo_url || undefined} alt="Profile" />
                                    ) : draft.avatar?.type === 'emoji' ? (
                                        <div className="avatar-emoji">{draft.avatar.emoji}</div>
                                    ) : (
                                        <div className="avatar-placeholder">👤</div>
                                    )}
                                    <div className="avatar-edit-badge">✎</div>
                                    {uploadStatus === 'uploading' && (
                                        <div className="upload-overlay-progress">
                                            <div className="progress-ring"></div>
                                        </div>
                                    )}
                                </div>
                                <button className="btn-change-avatar" onClick={() => setShowAvatarMenu(true)}>
                                    {t.avatar_change}
                                </button>
                                {uploadStatus === 'done' && <p className="upload-status success">{t.upload_success}</p>}
                                {uploadStatus === 'error' && <p className="upload-status error">{t.upload_error}</p>}
                            </div>

                            {/* Status Banner */}
                            {saveStatus !== 'idle' && (
                                <div className={`status-banner ${saveStatus}`}>
                                    {saveStatus === 'saving' ? t.btn_saving :
                                        saveStatus === 'success' ? t.btn_success :
                                            saveStatus === 'timeout' ? t.btn_timeout : t.btn_error}
                                </div>
                            )}

                            <div className="form-grid">
                                <div className="input-group">
                                    <label>{t.label_name}</label>
                                    <input type="text" value={draft.fullName} onChange={e => setDraft({ ...draft, fullName: e.target.value })} disabled={saveStatus === 'saving'} />
                                </div>
                                <div className="input-group">
                                    <label>{t.label_email}</label>
                                    <input type="text" value={userEmail} disabled className="disabled" />
                                </div>
                                <div className="input-group full-width">
                                    <label>{t.label_country}</label>
                                    <CountrySelector
                                        value={draft.countryCode}
                                        onChange={(c) => setDraft({ ...draft, countryCode: c.code, countryName: c.name })}
                                        disabled={saveStatus === 'saving'}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>{t.label_city}</label>
                                    <input type="text" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} disabled={saveStatus === 'saving'} placeholder="Ej: Miami, City, Zone..." />
                                </div>
                                <div className="input-group">
                                    <label>{t.label_phone}</label>
                                    <input type="tel" value={draft.phone} onChange={e => setDraft({ ...draft, phone: e.target.value })} disabled={saveStatus === 'saving'} />
                                </div>
                                <div className="input-group">
                                    <label>{t.label_gender}</label>
                                    <select value={draft.gender} onChange={e => setDraft({ ...draft, gender: e.target.value })} disabled={saveStatus === 'saving'}>
                                        <option value="">--</option>
                                        {t.genders.map((g: string) => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>{t.label_age}</label>
                                    <select value={draft.ageRange} onChange={e => setDraft({ ...draft, ageRange: e.target.value })} disabled={saveStatus === 'saving'}>
                                        <option value="">--</option>
                                        {t.ages.map((a: string) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>{t.label_locale}</label>
                                    <select value={draft.localePref} onChange={e => setDraft({ ...draft, localePref: e.target.value })} disabled={saveStatus === 'saving'}>
                                        <option value="es">Español</option>
                                        <option value="en">English</option>
                                        <option value="pt">Português</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>{t.label_units}</label>
                                    <select value={draft.units} onChange={e => setDraft({ ...draft, units: e.target.value as any })} disabled={saveStatus === 'saving'}>
                                        <option value="km">Km</option>
                                        <option value="mi">Miles</option>
                                    </select>
                                </div>
                            </div>

                            <div className="profile-footer-actions">
                                <button className="btn-logout-alt" onClick={() => signOut(auth)}>{t.btn_logout}</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="favorites-tab animate-fade">
                            {favorites.length === 0 ? <p className="empty-state">{t.no_favs}</p> : (
                                <div className="fav-list">
                                    {favorites.map(f => (
                                        <div key={f.id} className="fav-card">
                                            <div className="fav-img"><img src={f.image || 'https://via.placeholder.com/60'} alt="" /></div>
                                            <div className="fav-info">
                                                <h4>{f.name}</h4>
                                                <p>{f.main_category}</p>
                                                <span className="rating">⭐ {f.rating}</span>
                                            </div>
                                            <button className="remove-fav" onClick={async () => await deleteDoc(doc(db, `users/${user!.uid}/favorites`, f.id))}>🗑️</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="requests-tab animate-fade">
                            {requests.length === 0 ? <p className="empty-state">{t.no_requests}</p> : (
                                <div className="req-list">
                                    {requests.map(r => (
                                        <div key={r.id} className="req-card">
                                            <div className="req-header">
                                                <span className={`status ${r.status || 'new'}`}>
                                                    {r.status === 'completed' ? t.status_completed :
                                                        r.status === 'processing' ? t.status_processing :
                                                            r.status === 'cancelled' ? t.status_cancelled : t.status_new}
                                                </span>
                                                <span className="date">{new Date(r.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                            </div>
                                            <h4>{r.providerName || 'Proveedor'}</h4>
                                            <p>{r.serviceName || r.message?.substring(0, 50)}...</p>
                                            <button className="btn-chat-small">{t.btn_chat}</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'privacy' && (
                        <div className="privacy-tab animate-fade">
                            <div className="privacy-box">
                                <label className="checkbox-item">
                                    <input type="checkbox" checked={draft.marketing} onChange={e => setDraft({ ...draft, marketing: e.target.checked })} />
                                    <span>{t.label_marketing}</span>
                                </label>
                            </div>
                            <hr />
                            <div className="danger-zone">
                                <button className="btn-delete" onClick={() => setShowDeleteConfirm(true)}>
                                    {t.btn_delete_request}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sticky Guardar Button Section */}
                {activeTab === 'profile' && (
                    <div className="sticky-save-bar">
                        <button
                            className={`btn-save-sticky ${saveStatus === 'saving' ? 'is-saving' : ''}`}
                            onClick={() => handleSaveProfile(false)}
                            disabled={saveStatus === 'saving' || uploadStatus === 'uploading'}
                        >
                            {saveStatus === 'saving' ? t.btn_saving : t.btn_save}
                        </button>
                    </div>
                )}
            </div>

            {/* Overlays / Action Sheets */}
            {showAvatarMenu && (
                <div className="action-sheet-overlay" onClick={() => setShowAvatarMenu(false)}>
                    <div className="action-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="drag-handle"></div>
                        <h3>{t.avatar_options.title}</h3>
                        <div className="action-options">
                            <button onClick={() => document.getElementById('gallery-input')?.click()}>🖼️ {t.avatar_options.gallery}</button>
                            <button onClick={() => setShowEmojiPicker(true)}>😃 {t.avatar_options.emoji}</button>
                            <button className="danger" onClick={handleRemoveAvatar}>🗑️ {t.avatar_options.remove}</button>
                            <button className="cancel" onClick={() => setShowAvatarMenu(false)}>{t.avatar_options.cancel}</button>
                        </div>
                        <input id="gallery-input" type="file" accept="image/*" capture="user" hidden onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                        }} />
                    </div>
                </div>
            )}

            {showUnsavedPrompt && (
                <div className="modal-overlay" onClick={() => setShowUnsavedPrompt(false)}>
                    <div className="unsaved-modal animate-in" onClick={e => e.stopPropagation()}>
                        <h3>{t.unsaved_changes.title}</h3>
                        <p>{t.unsaved_changes.msg}</p>
                        <div className="unsaved-actions">
                            <button className="btn-save-exit" onClick={() => handleSaveProfile(true)}>{t.unsaved_changes.btn_save_exit}</button>
                            <button className="btn-exit-only" onClick={onClose}>{t.unsaved_changes.btn_exit_only}</button>
                            <button className="btn-cancel" onClick={() => setShowUnsavedPrompt(false)}>{t.unsaved_changes.btn_cancel}</button>
                        </div>
                    </div>
                </div>
            )}

            {showEmojiPicker && (
                <div className="modal-overlay" onClick={() => setShowEmojiPicker(false)}>
                    <div className="emoji-modal animate-fade" onClick={e => e.stopPropagation()}>
                        <h3>{t.avatar_options.emoji}</h3>
                        <div className="emoji-grid">
                            {EMOJI_COLLECTION.map(e => (
                                <div key={e} className="emoji-item" onClick={() => handleEmojiChoice(e)}>{e}</div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .account-overlay { 
                    position: fixed; inset: 0; background: #050810; z-index: 4000; 
                    overflow-y: auto; overflow-x: hidden; width: 100%;
                    padding-bottom: env(safe-area-inset-bottom, 100px); 
                }
                .account-container { 
                    width: 100%; max-width: 600px; margin: 0 auto; min-height: 100dvh; 
                    background: #0F172A; padding: 24px; position: relative; 
                    overflow-x: hidden; box-sizing: border-box;
                }
                
                .account-header { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
                .back-btn { background: none; border: none; font-size: 1.5rem; color: #94A3B8; cursor: pointer; }
                .account-header h1 { font-size: 1.8rem; font-weight: 850; color: white; }

                .account-tabs { 
                    display: flex; gap: 15px; overflow-x: auto; padding-bottom: 15px; 
                    border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 24px; 
                    scrollbar-width: none; -webkit-overflow-scrolling: touch;
                }
                .account-tabs::-webkit-scrollbar { display: none; }
                .account-tabs button { background: none; border: none; color: #64748B; font-weight: 700; font-size: 0.95rem; cursor: pointer; white-space: nowrap; padding: 8px 12px; position: relative; }
                .account-tabs button.active { color: #FACC15; }
                .account-tabs button.active::after { content: ''; position: absolute; bottom: -16px; left: 12px; right: 12px; height: 3px; background: #FACC15; border-radius: 2px; }

                .avatar-section { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-bottom: 32px; }
                .avatar-wrapper { position: relative; width: 100px; height: 100px; cursor: pointer; }
                .avatar-wrapper img, .avatar-placeholder, .avatar-emoji { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #1E293B; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,0.1); }
                .avatar-emoji { font-size: 3.5rem; }
                .avatar-placeholder { font-size: 3rem; }
                .avatar-edit-badge { position: absolute; bottom: 0; right: 0; background: #FACC15; color: #0F172A; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; border: 3px solid #0F172A; }
                .btn-change-avatar { background: none; border: none; color: #38BDF8; font-weight: 700; font-size: 0.85rem; cursor: pointer; }
                
                .upload-overlay-progress { position: absolute; inset: 0; background: rgba(0,0,0,0.5); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                .progress-ring { width: 40px; height: 40px; border: 4px solid #38BDF8; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }

                .status-banner { padding: 12px; border-radius: 12px; margin-bottom: 24px; text-align: center; font-weight: 700; font-size: 0.9rem; }
                .status-banner.saving { background: rgba(56, 189, 248, 0.1); color: #38BDF8; }
                .status-banner.success { background: rgba(16, 185, 129, 0.1); color: #10B981; }
                .status-banner.error, .status-banner.timeout { background: rgba(239, 68, 68, 0.1); color: #F87171; }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
                .input-group label { display: block; font-size: 0.75rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px; }
                .input-group input, .input-group select { 
                    width: 100%; padding: 14px; background: rgba(15, 23, 42, 0.4); 
                    border: 1.5px solid rgba(255,255,255,0.08); border-radius: 12px; 
                    color: white; outline: none; font-size: 16px; 
                } /* 16px prevents iOS auto-zoom */
                .input-group input:focus { border-color: #FACC15; }
                .input-group input.disabled { opacity: 0.5; background: rgba(0,0,0,0.2); border-style: dashed; }
                .input-group.full-width { grid-column: 1 / -1; }

                .profile-footer-actions { margin-top: 32px; padding-bottom: 120px; }
                .btn-logout-alt { width: 100%; padding: 14px; background: none; color: #F87171; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; font-weight: 700; cursor: pointer; }

                /* Sticky Bar */
                .sticky-save-bar { 
                    position: fixed; bottom: 0; left: 0; right: 0; 
                    background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(10px); 
                    -webkit-backdrop-filter: blur(10px);
                    padding: 16px 24px; padding-bottom: calc(16px + env(safe-area-inset-bottom));
                    border-top: 1px solid rgba(255,255,255,0.05); z-index: 5000; 
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.4); 
                }
                .btn-save-sticky { width: 100%; max-width: 550px; margin: 0 auto; display: block; padding: 18px; background: #FACC15; color: #050810; border: none; border-radius: 18px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.3s; transform-origin: center; box-shadow: 0 10px 30px rgba(250, 204, 21, 0.15); }
                .btn-save-sticky:active { transform: scale(0.96); }
                .btn-save-sticky:disabled { opacity: 0.5; cursor: not-allowed; }

                /* Action Sheet */
                .action-sheet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 6000; display: flex; align-items: flex-end; }
                .action-sheet { width: 100%; background: #0F172A; border-radius: 30px 30px 0 0; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); box-shadow: 0 -10px 40px rgba(0,0,0,0.5); }
                .drag-handle { width: 40px; height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 0 auto 20px; }
                .action-sheet h3 { text-align: center; margin-bottom: 20px; font-weight: 850; color: white; }
                .action-options { display: flex; flex-direction: column; gap: 10px; }
                .action-options button { width: 100%; padding: 16px; background: rgba(255,255,255,0.05); color: white; border: none; border-radius: 15px; font-weight: 700; text-align: left; cursor: pointer; }
                .action-options button.danger { color: #F87171; }
                .action-options button.cancel { background: none; text-align: center; margin-top: 10px; color: #64748B; }

                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 7000; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .emoji-modal { background: #1E293B; width: 100%; max-width: 320px; border-radius: 24px; padding: 24px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
                .emoji-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
                .emoji-item { font-size: 2.5rem; cursor: pointer; transition: 0.2s; }
                .emoji-item:active { transform: scale(1.4); }

                .unsaved-modal { background: #1E293B; width: 100%; max-width: 340px; border-radius: 28px; padding: 32px; text-align: center; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05); }
                .unsaved-modal h3 { font-size: 1.4rem; font-weight: 850; color: white; margin-bottom: 12px; }
                .unsaved-modal p { color: #94A3B8; font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px; }
                .unsaved-actions { display: flex; flex-direction: column; gap: 10px; }
                .unsaved-actions button { width: 100%; padding: 14px; border-radius: 14px; font-weight: 700; cursor: pointer; border: none; }
                .btn-save-exit { background: #FACC15; color: #0F172A; }
                .btn-exit-only { background: rgba(239, 68, 68, 0.1); color: #F87171; }
                .btn-cancel { background: none; color: #64748B; }

                .animate-in { animation: slideUpFix 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUpFix { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                @media (max-width: 480px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .account-container { padding: 16px; width: 100%; }
                }
            `}</style>
        </div>
    );
}
