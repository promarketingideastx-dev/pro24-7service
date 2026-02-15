'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    FacebookAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

type AuthView = 'login' | 'signup' | 'forgot-password';

export default function AuthModal({ onClose }: { onClose: () => void }) {
    const { user } = useAuth();
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    // Keyboard support: ESC to close
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const mapAuthError = (code: string) => {
        console.log(`[AuthTelemetry] Error Code: ${code}`);
        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Correo o contraseña incorrectos.';
            case 'auth/email-already-in-use':
                return 'Este correo ya está registrado.';
            case 'auth/invalid-email':
                return 'El formato del correo no es válido.';
            case 'auth/weak-password':
                return 'La contraseña es muy débil (mínimo 6 caracteres).';
            case 'auth/too-many-requests':
                return 'Demasiados intentos. Intenta más tarde.';
            case 'auth/network-request-failed':
                return 'Sin conexión. Revisa tu internet e inténtalo otra vez.';
            case 'timeout':
                return 'La conexión está tardando demasiado. Revisa tu señal e intenta de nuevo.';
            default:
                return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
        }
    };

    const handleSocialLogin = async (providerName: 'google' | 'facebook') => {
        setError('');
        setLoading(true);
        try {
            const provider = providerName === 'google'
                ? new GoogleAuthProvider()
                : new FacebookAuthProvider();

            await signInWithPopup(auth, provider);
            console.log(`[AuthTelemetry] ${providerName}_login_success`);
            onClose();
        } catch (err: any) {
            console.error(`[AuthTelemetry] ${providerName}_login_error`, err.code);
            setError(mapAuthError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
            console.log('[AuthTelemetry] auth_reset_sent');
        } catch (err: any) {
            setError(mapAuthError(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Security timer to prevent stuck state
        const timeoutId = setTimeout(() => {
            if (loading) {
                setLoading(false);
                setError(mapAuthError('timeout'));
            }
        }, 15000);

        try {
            if (view === 'login') {
                await signInWithEmailAndPassword(auth, email, password);
                console.log('[AuthTelemetry] auth_login_success');
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                console.log('[AuthTelemetry] auth_signup_success');
            }
            clearTimeout(timeoutId);
            onClose();
        } catch (err: any) {
            clearTimeout(timeoutId);
            console.error(`[AuthTelemetry] auth_${view}_error`, err.code);
            setError(mapAuthError(err.code));
        } finally {
            setLoading(false);
        }
    };

    if (user) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                    <button className="close-x" onClick={onClose}>&times;</button>
                    <div className="user-icon">👤</div>
                    <h3>Sesión Activa</h3>
                    <p className="user-email">{user.email}</p>
                    <div className="modal-actions">
                        <button className="btn-neon outline" onClick={() => signOut(auth)}>Cerrar Sesión</button>
                        <button className="btn-neon primary" onClick={onClose}>Volver a la App</button>
                    </div>
                </div>
                <style jsx>{`
                    .modal-overlay { position: fixed; inset: 0; background: rgba(5, 8, 16, 0.9); backdrop-filter: blur(15px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                    .modal-content { position: relative; width: 90%; max-width: 400px; padding: 48px; text-align: center; background: rgba(15, 23, 42, 0.8); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
                    .close-x { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #475569; font-size: 2rem; cursor: pointer; line-height: 1; transition: 0.2s; }
                    .close-x:hover { color: white; }
                    .user-icon { font-size: 3.5rem; margin-bottom: 12px; }
                    h3 { font-size: 1.8rem; font-weight: 800; color: white; margin-bottom: 8px; }
                    .user-email { color: #94A3B8; margin-bottom: 35px; font-weight: 600; }
                    .modal-actions { display: flex; flex-direction: column; gap: 14px; }
                    .btn-neon { border-radius: 14px; padding: 14px; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 0.95rem; border: 1px solid transparent; }
                    .btn-neon.outline { background: rgba(255,255,255,0.05); color: white; border-color: rgba(255,255,255,0.1); }
                    .btn-neon.primary { background: rgba(245, 158, 11, 0.1); color: #FACC15; border-color: rgba(245, 158, 11, 0.3); }
                    .animate-in { animation: modalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
                    @keyframes modalIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-in" onClick={e => e.stopPropagation()}>
                <button className="close-x" onClick={onClose}>&times;</button>

                <header className="modal-header">
                    {resetSent ? (
                        <>
                            <h3>¡Enlace enviado!</h3>
                            <p>Revisa tu correo para restablecer tu contraseña.</p>
                        </>
                    ) : (
                        <>
                            <h3>{view === 'login' ? '¡Qué bueno verte!' : view === 'signup' ? 'Únete a la Red Premium' : 'Recuperar Cuenta'}</h3>
                            <p>
                                {view === 'login' ? 'Ingresa tus datos para continuar' :
                                    view === 'signup' ? 'Regístrate para encontrar los mejores servicios' :
                                        'Te enviaremos un enlace para cambiar tu contraseña'}
                            </p>
                        </>
                    )}
                </header>

                {resetSent ? (
                    <button className="btn-submit-neon" style={{ marginTop: '30px' }} onClick={() => { setResetSent(false); setView('login'); }}>
                        Volver a Iniciar Sesión
                    </button>
                ) : (
                    <>
                        <form onSubmit={view === 'forgot-password' ? handleResetPassword : handleSubmit} style={{ marginTop: '32px' }}>
                            <div className="input-group-neon">
                                <label>Correo Electrónico</label>
                                <input
                                    type="email"
                                    className="input-field-neon"
                                    placeholder="nombre@gmail.com"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    required
                                />
                            </div>

                            {view !== 'forgot-password' && (
                                <div className="input-group-neon" style={{ marginTop: '20px' }}>
                                    <label>Contraseña</label>
                                    <div className="password-wrapper">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className="input-field-neon"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? '👁️' : '🙈'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {view === 'login' && (
                                <p className="forgot-password" onClick={() => { setView('forgot-password'); setError(''); }}>
                                    ¿Olvidaste tu contraseña?
                                </p>
                            )}

                            {error && <div className="error-box-neon">{error}</div>}

                            <button type="submit" className="btn-submit-neon" disabled={loading}>
                                {loading ? 'Procesando...' :
                                    view === 'login' ? 'Iniciar Sesión' :
                                        view === 'signup' ? 'Registrarse Gratis' : 'Enviar Enlace'}
                            </button>
                        </form>

                        {view !== 'forgot-password' && (
                            <>
                                <div className="social-separator">
                                    <span>O continúa con</span>
                                </div>

                                <div className="social-grid">
                                    <button className="social-btn google" onClick={() => handleSocialLogin('google')}>G</button>
                                    <button className="social-btn facebook" onClick={() => handleSocialLogin('facebook')}>F</button>
                                </div>
                            </>
                        )}

                        <p className="toggle-text-neon" onClick={() => {
                            if (view === 'forgot-password') setView('login');
                            else setView(view === 'login' ? 'signup' : 'login');
                            setError('');
                        }}>
                            {view === 'login' ? '¿Nuevo aquí? Crea una cuenta' :
                                view === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : 'Volver a Iniciar Sesión'}
                        </p>

                        <button className="close-link-neon" onClick={onClose}>Cancelar y volver</button>
                    </>
                )}
            </div>
            <style jsx>{`
                .modal-overlay { position: fixed; inset: 0; background: rgba(5, 8, 16, 0.85); backdrop-filter: blur(20px); z-index: 2000; display: flex; align-items: center; justify-content: center; }
                .modal-content { position: relative; width: 95%; max-width: 440px; padding: 48px; border-radius: 40px; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(255,255,255,0.1); box-shadow: 0 50px 100px rgba(0,0,0,0.7); position: relative; }
                .close-x { position: absolute; top: 20px; right: 20px; background: none; border: none; color: #475569; font-size: 2rem; cursor: pointer; line-height: 1; transition: 0.2s; z-index: 10; }
                .close-x:hover { color: white; }
                .modal-header h3 { font-size: 1.8rem; font-weight: 800; color: white; }
                .modal-header p { color: #94A3B8; font-size: 0.95rem; margin-top: 8px; }
                
                .input-group-neon label { display: block; margin-bottom: 8px; font-weight: 700; color: #64748B; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .input-field-neon { width: 100%; padding: 14px 18px; background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.1); border-radius: 16px; color: white; font-size: 1rem; outline: none; transition: 0.3s; }
                .input-field-neon:focus { border-color: #38BDF8; background: rgba(56, 189, 248, 0.05); }
                
                .password-wrapper { position: relative; display: flex; align-items: center; }
                .password-toggle-btn { 
                    position: absolute; right: 15px; background: none; border: none; 
                    cursor: pointer; font-size: 1.2rem; filter: grayscale(1); opacity: 0.6; 
                    transition: 0.3s;
                }
                .password-toggle-btn:hover { opacity: 1; filter: grayscale(0); }
                
                .forgot-password { text-align: right; font-size: 0.8rem; color: #38BDF8; margin-top: 8px; cursor: pointer; font-weight: 600; }
                .forgot-password:hover { text-decoration: underline; }
                
                .btn-submit-neon { width: 100%; height: 56px; margin-top: 24px; border-radius: 18px; border: none; background: linear-gradient(135deg, #FACC15 0%, #EAB308 100%); color: #0F172A; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.3s; box-shadow: 0 10px 25px rgba(234, 179, 8, 0.3); }
                .btn-submit-neon:disabled { opacity: 0.6; cursor: not-allowed; }
                
                .social-separator { display: flex; align-items: center; margin: 30px 0; color: #475569; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; }
                .social-separator::before, .social-separator::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.05); }
                .social-separator span { padding: 0 15px; }
                
                .social-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                .social-btn { height: 50px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: white; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: 0.3s; }
                .social-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.3); transform: translateY(-3px); }
                .social-btn.google { color: #EA4335; }
                .social-btn.facebook { color: #1877F2; }
                
                .toggle-text-neon { margin-top: 32px; text-align: center; font-size: 0.95rem; color: #38BDF8; cursor: pointer; font-weight: 700; transition: 0.2s; }
                .toggle-text-neon:hover { color: white; }
                .close-link-neon { background: none; border: none; width: 100%; margin-top: 24px; color: #475569; cursor: pointer; font-size: 0.9rem; font-weight: 600; text-decoration: underline; }
                .error-box-neon { background: rgba(239, 68, 68, 0.1); color: #F87171; padding: 14px; border-radius: 12px; font-size: 0.9rem; margin-top: 20px; border: 1px solid rgba(239, 68, 68, 0.2); text-align: center; animation: shake 0.4s ease-in-out; }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-in { animation: modalIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
}
