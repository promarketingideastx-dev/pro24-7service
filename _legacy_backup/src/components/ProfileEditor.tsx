'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CATEGORIES, taxonomy } from '@/lib/taxonomy';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { sanitizeData, withTimeout } from '@/lib/firestoreUtils';
import { compressImage } from '@/lib/imageUtils';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// V2: Structural Fix - Firestore Resilience
const SCHEMA_VERSION = 2;

export default function ProfileEditor({ onSave, isLoading: parentLoading }: { onSave?: () => void, isLoading?: boolean }) {
    const { user, profile, refreshProfile } = useAuth();
    const hasLoadedInitial = useRef(false);

    // Categories & Skills
    const [selectedMainCatId, setSelectedMainCatId] = useState<string>('generales');
    const [selectedSubcatId, setSelectedSubcatId] = useState<string>('limpieza');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);

    // Identity & Content
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [profileImage, setProfileImage] = useState('');

    // Business Details
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [coverage, setCoverage] = useState('');

    const [loading, setLoading] = useState(false);
    const [debugStatus, setDebugStatus] = useState('Verificando...');

    const normalizeAndLoad = useCallback(async () => {
        if (hasLoadedInitial.current) return;
        if (!profile?.provider_setup) {
            setDebugStatus('Perfil Nuevo');
            hasLoadedInitial.current = true;
            return;
        }
        const setup = profile.provider_setup;

        // Load IDs
        const validMainId = CATEGORIES.find(c => c.id === setup.category_main)?.id || 'generales';
        const validSubId = taxonomy.getSubcategoryById(validMainId, setup.subcategory_primary)?.id
            || CATEGORIES.find(c => c.id === validMainId)?.subcategories[0].id
            || 'limpieza';

        const validSpecialties = (setup.specialties || []).filter((s: string) =>
            taxonomy.isValidSpecialty(validMainId, validSubId, s)
        );

        setSelectedMainCatId(validMainId);
        setSelectedSubcatId(validSubId);
        setSelectedSpecialties(validSpecialties);

        // Load Content
        setDisplayName(setup.displayName || '');
        setBio(setup.bio || '');
        setExperience(setup.experience || '');
        setProfileImage(setup.profileImage || '');

        // Load Business
        setPriceMin(setup.price_min || '');
        setPriceMax(setup.price_max || '');
        setCoverage(setup.coverage || '');

        hasLoadedInitial.current = true;
        setDebugStatus('Perfil Cargado');
    }, [profile]);

    useEffect(() => {
        if (profile) normalizeAndLoad();
    }, [profile, normalizeAndLoad]);

    const handleMainCatChange = (id: string) => {
        setSelectedMainCatId(id);
        const firstSub = CATEGORIES.find(c => c.id === id)?.subcategories[0].id || '';
        setSelectedSubcatId(firstSub);
    };

    const toggleSpecialty = (s: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(s) ? prev.filter(item => item !== s) : [...prev, s]
        );
    };

    const handlePublish = async () => {
        if (!user) {
            alert('Error: No hay sesión activa. Recarga la página.');
            return;
        }
        setLoading(true);
        setDebugStatus('Guardando...');
        console.log('[BUSINESS_SAVE_START]');

        try {
            const rawData = {
                role: 'provider',
                provider_setup: {
                    schema_version: SCHEMA_VERSION,
                    category_main: selectedMainCatId,
                    subcategory_primary: selectedSubcatId,
                    specialties: selectedSpecialties,
                    displayName,
                    bio,
                    experience,
                    profileImage,
                    price_min: priceMin || null,
                    price_max: priceMax || null,
                    coverage: coverage || null,
                    updatedAt: new Date().toISOString()
                }
            };

            const cleanPayload = sanitizeData(rawData);
            const userRef = doc(db, "users", user.uid);

            console.log('[BUSINESS_SAVE_WRITE] Sending to Firestore...');
            const startTime = Date.now();
            await withTimeout(
                setDoc(userRef, cleanPayload, { merge: true }),
                45000,
                'Error: El servidor de perfiles está tardando demasiado. Verifica tu conexión.'
            );

            // VERIFICATION STEP
            console.log('[BUSINESS_SAVE_VERIFY] Confirming write...');
            const verifySnap = await getDoc(userRef);
            if (!verifySnap.exists()) {
                throw new Error('Error crítico: El perfil de negocio no se guardó.');
            }

            console.log(`[BUSINESS_SAVE_OK] Finish in ${Date.now() - startTime}ms`);
            await refreshProfile();
            if (onSave) onSave();
            setDebugStatus('Publicado');
            alert('¡PERFIL CONFIGURADO Y PUBLICADO! ✅');
        } catch (error: any) {
            setDebugStatus('Error');
            console.error('[BUSINESS_SAVE_FAIL]', error);
            alert('Error al guardar perfil de negocio: ' + (error.message || 'Error de conexión'));
        } finally {
            setLoading(false);
        }
    };

    const currentMainCat = CATEGORIES.find(c => c.id === selectedMainCatId) || CATEGORIES[0];
    const currentSubcat = currentMainCat.subcategories.find(s => s.id === selectedSubcatId) || currentMainCat.subcategories[0];

    return (
        <div className="editor-premium-v3 animate-in">
            <header className="header-row">
                <div className="header-text">
                    <h3>Panel de Profesional</h3>
                    <p>Configura cómo te ven los clientes en el catálogo.</p>
                </div>
                <span className="status-badge">{debugStatus}</span>
            </header>

            {/* Identidad de Marca */}
            <div className="form-section branding-box">
                <label className="section-label">Identidad de Marca</label>
                <div className="branding-grid">
                    <div className="photo-upload">
                        {profileImage ? <img src={profileImage} alt="Profile" /> : <div className="placeholder">📷</div>}
                        <input
                            type="file"
                            accept="image/*"
                            id="business-logo-input"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    try {
                                        setDebugStatus('Comprimiendo...');
                                        const blob = await compressImage(file);
                                        setDebugStatus('Subiendo...');
                                        const path = `business/${user!.uid}/${Date.now()}.webp`;
                                        const storageRef = ref(storage, path);
                                        const { uploadBytes } = await import('firebase/storage');
                                        await uploadBytes(storageRef, blob);
                                        const url = await getDownloadURL(storageRef);
                                        setProfileImage(url);
                                        setDebugStatus('Foto lista');
                                    } catch (err) {
                                        console.error(err);
                                        alert('Error al subir imagen');
                                        setDebugStatus('Error');
                                    }
                                }
                            }}
                        />
                        <button
                            className="btn-upload-mini"
                            onClick={() => document.getElementById('business-logo-input')?.click()}
                        >
                            Subir Logo
                        </button>
                    </div>
                    <div className="fields">
                        <input type="text" placeholder="Nombre de tu negocio" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                        <input type="text" placeholder="Experiencia (ej. 5 años)" value={experience} onChange={e => setExperience(e.target.value)} />
                    </div>
                </div>
                <textarea
                    placeholder="Escribe una biografía corta que atraiga clientes..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="bio-textarea"
                />
            </div>

            {/* Categorías */}
            <div className="form-section">
                <label className="section-label">Categoría Principal</label>
                <div className="cat-grid-compact">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            className={`cat-item-mini ${selectedMainCatId === cat.id ? 'active' : ''}`}
                            onClick={() => handleMainCatChange(cat.id)}
                        >
                            <span className="icon">{cat.icon}</span>
                            <span className="name">{cat.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="form-section">
                <label className="section-label">Sub-categoría</label>
                <div className="sub-pills-wrap">
                    {currentMainCat.subcategories.map(sub => (
                        <button
                            key={sub.id}
                            className={`sub-pill ${selectedSubcatId === sub.id ? 'active' : ''}`}
                            onClick={() => setSelectedSubcatId(sub.id)}
                        >
                            {sub.icon} {sub.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Specialties */}
            <div className="form-section highlight-box">
                <label className="section-label">Habilidades Especializadas</label>
                <div className="spec-list-compact">
                    {currentSubcat.specialties.map(spec => (
                        <div
                            key={spec}
                            className={`spec-row ${selectedSpecialties.includes(spec) ? 'active' : ''}`}
                            onClick={() => toggleSpecialty(spec)}
                        >
                            <div className="checkbox">{selectedSpecialties.includes(spec) && "✓"}</div>
                            <span className="label">{spec}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Business Det */}
            <div className="details-row">
                <div className="field">
                    <label className="section-label">Rango de Precios ($)</label>
                    <div className="flex-inputs">
                        <input type="number" placeholder="Min" value={priceMin} onChange={e => setPriceMin(e.target.value)} />
                        <span className="sep">-</span>
                        <input type="number" placeholder="Max" value={priceMax} onChange={e => setPriceMax(e.target.value)} />
                    </div>
                </div>
                <div className="field">
                    <label className="section-label">Área de Cobertura</label>
                    <input type="text" placeholder="Ej. Ciudad, Zona" value={coverage} onChange={e => setCoverage(e.target.value)} />
                </div>
            </div>

            <button className="publish-btn-premium" onClick={handlePublish} disabled={loading}>
                {loading ? 'SINCRONIZANDO...' : 'GUARDAR Y PUBLICAR EN EL MAPA'}
            </button>

            <style jsx>{`
                .editor-premium-v3 { color: white; padding-bottom: 40px; }
                .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
                .header-text h3 { font-size: 1.25rem; font-weight: 900; }
                .header-text p { font-size: 0.8rem; color: #64748B; margin-top: 4px; }
                .status-badge { font-size: 0.65rem; background: rgba(56, 189, 248, 0.1); color: #38BDF8; padding: 4px 12px; border-radius: 6px; font-weight: 800; text-transform: uppercase; }
                
                .form-section { margin-bottom: 24px; }
                .section-label { display: block; font-size: 0.75rem; color: #94A3B8; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px; }

                /* Branding Box */
                .branding-box { background: rgba(255,255,255,0.02); padding: 20px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
                .branding-grid { display: flex; gap: 20px; margin-bottom: 16px; }
                .photo-upload { width: 100px; display: flex; flex-direction: column; gap: 8px; }
                .photo-upload .placeholder { width: 100px; height: 100px; background: #1E293B; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 2rem; border: 2px dashed rgba(255,255,255,0.1); }
                .photo-upload img { width: 100px; height: 100px; border-radius: 16px; object-fit: cover; border: 2px solid var(--accent-primary); }
                .btn-upload-mini { font-size: 0.7rem; padding: 4px 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: white; cursor: pointer; margin-top: 4px; }
                
                .branding-grid .fields { flex: 1; display: flex; flex-direction: column; gap: 10px; }
                .bio-textarea { width: 100%; height: 100px; background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; color: white; font-family: inherit; font-size: 0.9rem; outline: none; resize: none; }
                .bio-textarea:focus { border-color: var(--accent-primary); }

                .cat-grid-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .cat-item-mini { 
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); 
                    padding: 12px; border-radius: 14px; display: flex; align-items: center; gap: 10px;
                    cursor: pointer; transition: 0.2s; color: white;
                }
                .cat-item-mini.active { border-color: #38BDF8; background: rgba(56, 189, 248, 0.08); }
                .cat-item-mini .name { font-size: 0.85rem; font-weight: 700; }

                .sub-pills-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
                .sub-pill { 
                    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
                    color: #94A3B8; padding: 8px 16px; border-radius: 10px; font-size: 0.8rem; 
                    font-weight: 700; cursor: pointer; transition: 0.2s;
                }
                .sub-pill.active { background: white; color: #050810; border-color: white; }

                .highlight-box { background: rgba(56, 189, 248, 0.03); padding: 20px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.1); }
                .spec-list-compact { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .spec-row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 8px; border-radius: 10px; transition: 0.2s; }
                .spec-row.active { background: rgba(56, 189, 248, 0.05); }
                .checkbox { width: 22px; height: 22px; border: 2px solid #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #38BDF8; }
                .spec-row.active .checkbox { border-color: #38BDF8; background: rgba(56, 189, 248, 0.1); }
                .spec-row .label { font-size: 0.85rem; font-weight: 600; color: #F1F5F9; }

                .details-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
                .flex-inputs { display: flex; align-items: center; gap: 10px; }
                .sep { color: #475569; font-weight: 900; }
                input { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 12px; color: white; width: 100%; outline: none; font-size: 0.9rem; font-weight: 600; }
                input:focus { border-color: #38BDF8; }

                .publish-btn-premium { 
                    width: 100%; margin-top: 32px; padding: 20px; border-radius: 16px; 
                    background: #38BDF8; color: #050810; font-weight: 900; font-size: 1rem; 
                    border: none; cursor: pointer; transition: 0.3s;
                    box-shadow: 0 10px 25px rgba(56, 189, 248, 0.2);
                }
                .publish-btn-premium:active { transform: scale(0.97); }
                .publish-btn-premium:disabled { opacity: 0.5; }

                @media (max-width: 600px) {
                    .branding-grid { flex-direction: column; }
                    .photo-upload { width: 100%; align-items: center; }
                    .cat-grid-compact, .spec-list-compact, .details-row { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}
