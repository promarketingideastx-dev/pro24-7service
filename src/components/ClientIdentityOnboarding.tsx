'use client';

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { sanitizeData, withTimeout } from '@/lib/firestoreUtils';

type Step = 'name' | 'optional' | 'privacy';

const TRANSLATIONS = {
    es: {
        title_name: '¿Cómo te llamas?',
        subtitle_name: 'Usaremos esto para que los proveedores sepan con quién hablan.',
        placeholder_name: 'Nombre y Apellido',
        title_optional: 'Personaliza tu experiencia',
        subtitle_optional: 'Estos datos nos ayudan a recomendarte mejores servicios cerca de ti.',
        label_phone: 'Teléfono',
        label_city: 'Ciudad o Zona',
        label_gender: 'Género',
        label_age: 'Rango de edad',
        placeholder_phone: '+1 234 567 890',
        placeholder_city: 'Ej: Miami, FL',
        title_privacy: 'Privacidad y Preferencias',
        subtitle_privacy: 'Tu seguridad y privacidad son nuestra prioridad.',
        label_marketing: 'Quiero recibir novedades y promociones exclusivas.',
        label_privacy: 'He leído y acepto la Política de Privacidad y Términos de Uso.',
        btn_next: 'Siguiente',
        btn_finish: 'Finalizar Registro',
        btn_skip: 'Omitir por ahora',
        error_name: 'Por favor, ingresa tu nombre completo.',
        error_privacy: 'Debes aceptar la política de privacidad para continuar.',
        gender_options: ['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'],
        age_options: ['18-24', '25-34', '35-44', '45-54', '55+'],
    },
    en: {
        title_name: 'What’s your name?',
        subtitle_name: 'We’ll use this so providers know who they’re talking to.',
        placeholder_name: 'Full Name',
        title_optional: 'Personalize your experience',
        subtitle_optional: 'This data helps us recommend better services near you.',
        label_phone: 'Phone Number',
        label_city: 'City or Area',
        label_gender: 'Gender',
        label_age: 'Age range',
        placeholder_phone: '+1 234 567 890',
        placeholder_city: 'e.g., Miami, FL',
        title_privacy: 'Privacy & Preferences',
        subtitle_privacy: 'Your security and privacy are our priority.',
        label_marketing: 'I want to receive news and exclusive promotions.',
        label_privacy: 'I have read and accept the Privacy Policy and Terms of Use.',
        btn_next: 'Next',
        btn_finish: 'Finish Registration',
        btn_skip: 'Skip for now',
        error_name: 'Please enter your full name.',
        error_privacy: 'You must accept the privacy policy to continue.',
        gender_options: ['Male', 'Female', 'Other', 'Prefer not to say'],
        age_options: ['18-24', '25-34', '35-44', '45-54', '55+'],
    },
    pt: {
        title_name: 'Como você se chama?',
        subtitle_name: 'Usaremos isso para que os fornecedores saibam com quem estão falando.',
        placeholder_name: 'Nome e sobrenome',
        title_optional: 'Personalize sua experiência',
        subtitle_optional: 'Esses dados nos ajudam a recomendar melhores serviços perto de você.',
        label_phone: 'Telefone',
        label_city: 'Cidade ou Zona',
        label_gender: 'Gênero',
        label_age: 'Faixa etária',
        placeholder_phone: '+55 11 98765-4321',
        placeholder_city: 'Ex: São Paulo, SP',
        title_privacy: 'Privacidade e Preferências',
        subtitle_privacy: 'Sua segurança e privacidade são nossa prioridade.',
        label_marketing: 'Quero receber novidades e promoções exclusivas.',
        label_privacy: 'Li e aceito a Política de Privacidade e os Termos de Uso.',
        btn_next: 'Próximo',
        btn_finish: 'Finalizar Cadastro',
        btn_skip: 'Pular por enquanto',
        error_name: 'Por favor, insira seu nome completo.',
        error_privacy: 'Você deve aceitar a política de privacidade para continuar.',
        gender_options: ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'],
        age_options: ['18-24', '25-34', '35-44', '45-54', '55+'],
    }
};

// Onboarding V26.2

export default function ClientIdentityOnboarding() {
    const { user, profile, refreshProfile } = useAuth();
    const [step, setStep] = useState<Step>('name');
    const [loading, setLoading] = useState(false);

    // Identity Data
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [city, setCity] = useState('');
    const [gender, setGender] = useState('');
    const [ageRange, setAgeRange] = useState('');

    // Consent
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [error, setError] = useState('');

    const locale = (profile?.settings?.locale as keyof typeof TRANSLATIONS) || 'es';
    const t = TRANSLATIONS[locale] || TRANSLATIONS.es;

    useEffect(() => {
        console.log('[AuthTelemetry] identity_onboarding_started');
    }, []);

    const handleNext = () => {
        if (step === 'name') {
            if (!fullName.trim()) {
                setError(t.error_name);
                return;
            }
            setError('');
            setStep('optional');
        } else if (step === 'optional') {
            setStep('privacy');
        }
    };

    const handleSkipOptional = () => {
        console.log('[AuthTelemetry] identity_onboarding_skipped_optional');
        setStep('privacy');
    };

    const handleFinish = async () => {
        if (!privacyAccepted) {
            setError(t.error_privacy);
            return;
        }

        setLoading(true);
        console.log('[ONBOARDING_SAVE_START]');
        try {
            const userRef = doc(db, 'users', user!.uid);
            console.log('[AuthTelemetry] V26.2 starting...');
            const rawPayload = {
                full_name: fullName.trim(),
                phone: phone || null,
                city_zone: city || null,
                gender: gender || null,
                age_range: ageRange || null,
                consent: {
                    marketing_opt_in: marketingOptIn,
                    privacy_policy_accepted: true,
                    updated_at: new Date().toISOString()
                },
                updatedAt: new Date().toISOString(),
                _v: '26.2'
            };

            const cleanPayload = sanitizeData(rawPayload);

            console.log('[ONBOARDING_SAVE_WRITE] Sending to Firestore...');
            const startTime = Date.now();
            await withTimeout(
                setDoc(userRef, cleanPayload, { merge: true }),
                45000,
                'Error: El servidor de registro está tardando demasiado. Verifica tu conexión.'
            );

            console.log(`[ONBOARDING_SAVE_OK] Finish in ${Date.now() - startTime}ms`);
            await refreshProfile();
        } catch (err: any) {
            console.error('[ONBOARDING_SAVE_FAIL]', err);
            setError(err.message || 'Error al guardar. Inténtalo de nuevo.');
            alert("Error en Registro: " + (err.message || "Conexión fallida"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card animate-in">
                {/* Progress Indicators */}
                <div className="progress-bar">
                    <div className={`segment ${step === 'name' || step === 'optional' || step === 'privacy' ? 'active' : ''}`} />
                    <div className={`segment ${step === 'optional' || step === 'privacy' ? 'active' : ''}`} />
                    <div className={`segment ${step === 'privacy' ? 'active' : ''}`} />
                </div>

                {step === 'name' && (
                    <div className="step-content">
                        <h2>{t.title_name}</h2>
                        <p>{t.subtitle_name}</p>
                        <div className="input-box">
                            <input
                                type="text"
                                placeholder={t.placeholder_name}
                                value={fullName}
                                onChange={(e) => { setFullName(e.target.value); setError(''); }}
                                autoFocus
                            />
                        </div>
                        {error && <p className="error-text">{error}</p>}
                        <button className="btn-primary" onClick={handleNext}>{t.btn_next}</button>
                    </div>
                )}

                {step === 'optional' && (
                    <div className="step-content">
                        <h2>{t.title_optional}</h2>
                        <p>{t.subtitle_optional}</p>

                        <div className="form-grid">
                            <div className="input-group">
                                <label>{t.label_phone}</label>
                                <input type="tel" placeholder={t.placeholder_phone} value={phone} onChange={e => setPhone(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>{t.label_city}</label>
                                <input type="text" placeholder={t.placeholder_city} value={city} onChange={e => setCity(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>{t.label_gender}</label>
                                <select value={gender} onChange={e => setGender(e.target.value)}>
                                    <option value="">--</option>
                                    {t.gender_options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>{t.label_age}</label>
                                <select value={ageRange} onChange={e => setAgeRange(e.target.value)}>
                                    <option value="">--</option>
                                    {t.age_options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="actions-vertical">
                            <button className="btn-primary" onClick={handleNext}>{t.btn_next}</button>
                            <button className="btn-link" onClick={handleSkipOptional}>{t.btn_skip}</button>
                        </div>
                    </div>
                )}

                {step === 'privacy' && (
                    <div className="step-content">
                        <h2>{t.title_privacy}</h2>
                        <p>{t.subtitle_privacy}</p>

                        <div className="consent-list">
                            <label className="checkbox-item">
                                <input type="checkbox" checked={marketingOptIn} onChange={e => setMarketingOptIn(e.target.checked)} />
                                <span>{t.label_marketing}</span>
                            </label>
                            <label className="checkbox-item">
                                <input type="checkbox" checked={privacyAccepted} onChange={e => { setPrivacyAccepted(e.target.checked); setError(''); }} />
                                <span>{t.label_privacy}</span>
                            </label>
                        </div>

                        {error && <p className="error-text">{error}</p>}

                        <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                            {loading ? '...' : t.btn_finish}
                        </button>
                    </div>
                )}
            </div>

            <style jsx>{`
                .onboarding-overlay { position: fixed; inset: 0; background: #050810; z-index: 3000; display: flex; align-items: center; justify-content: center; }
                .onboarding-card { width: 95%; max-width: 480px; background: #0F172A; border: 1px solid rgba(255,255,255,0.1); border-radius: 40px; padding: 40px; box-shadow: 0 50px 100px rgba(0,0,0,0.5); }
                
                .progress-bar { display: flex; gap: 8px; margin-bottom: 40px; }
                .segment { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; transition: 0.3s; }
                .segment.active { background: #FACC15; }

                .step-content h2 { font-size: 2rem; font-weight: 850; color: white; line-height: 1.1; margin-bottom: 12px; }
                .step-content p { color: #94A3B8; font-size: 1rem; line-height: 1.5; margin-bottom: 32px; }

                .input-box input { width: 100%; padding: 18px; background: rgba(255,255,255,0.05); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 20px; color: white; font-size: 1.1rem; outline: none; transition: 0.3s; }
                .input-box input:focus { border-color: #FACC15; background: rgba(250, 204, 21, 0.05); }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px; }
                .input-group label { display: block; color: #64748B; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 6px; }
                .input-group input, .input-group select { width: 100%; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; outline: none; }

                .consent-list { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }
                .checkbox-item { display: flex; gap: 12px; cursor: pointer; }
                .checkbox-item input { width: 22px; height: 22px; accent-color: #FACC15; margin-top: 2px; }
                .checkbox-item span { color: #CBD5E1; font-size: 0.95rem; line-height: 1.4; }

                .btn-primary { width: 100%; padding: 18px; background: #FACC15; color: #0F172A; border: none; border-radius: 20px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.3s; }
                .btn-primary:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(250, 204, 21, 0.2); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

                .actions-vertical { display: flex; flex-direction: column; gap: 16px; }
                .btn-link { background: none; border: none; color: #64748B; font-weight: 600; cursor: pointer; text-decoration: underline; }

                .error-text { color: #F87171; font-size: 0.9rem; margin-bottom: 16px; text-align: center; }

                .animate-in { animation: slideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

                @media (max-width: 480px) {
                    .form-grid { grid-template-columns: 1fr; }
                }
            `}</style>
        </div>
    );
}
