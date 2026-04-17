import { auth, db, storage } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
    signInWithCredential
} from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { UserService } from './user.service';
import { IdentityService } from './identity.service';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export const AuthService = {
    // Check if email exists to prevent duplicate account creation attempts
    checkEmailExists: async (rawEmail: string) => {
        try {
            const reg = await IdentityService.getEmailRegistry(rawEmail);
            return !!reg;
        } catch (error) {
            console.error('Error checking email existence in Registry:', error);
            return false;
        }
    },

    // Detect mobile browser or PWA standalone mode (kept for reference but unused for auth flow)
    _isMobileOrPWA: (): boolean => {
        if (typeof window === 'undefined') return false;
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        );
    },

    loginWithGoogle: async (returnTo?: string) => {
        if (Capacitor.isNativePlatform()) {
            // Capacitor Native App: use capacitor-firebase plugin
            const result = await FirebaseAuthentication.signInWithGoogle();
            const idToken = result.credential?.idToken;
            if (!idToken) throw new Error('No idToken from Google Login');
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            
            // FASE 3: Enforce Identity Registry
            const reg = await IdentityService.getEmailRegistry(userCredential.user.email || '');
            if (!reg) {
                await IdentityService.createEmailRegistry(userCredential.user.email || '', userCredential.user.uid, 'active', 'google.com');
            } else if (!reg.providers.includes('google.com')) {
                await IdentityService.updateProviders(userCredential.user.email || '', 'google.com');
            }

            const profile = await UserService.getUserProfile(userCredential.user.uid);
            if (!profile) {
                const newUser = await UserService.createUserProfile(userCredential.user.uid, userCredential.user.email || '');
                if (newUser) {
                    await UserService.updateUserProfile(userCredential.user.uid, { accountStatus: 'active', emailVerified: true });
                }
            }
            return userCredential.user;
        }

        const provider = new GoogleAuthProvider();
        
        if (returnTo) sessionStorage.setItem('auth_redirect_to', returnTo);

        try {
            const result = await signInWithPopup(auth, provider);
            
            // FASE 3: Enforce Identity Registry
            const reg = await IdentityService.getEmailRegistry(result.user.email || '');
            if (!reg) {
                await IdentityService.createEmailRegistry(result.user.email || '', result.user.uid, 'active', 'google.com');
            } else if (!reg.providers.includes('google.com')) {
                await IdentityService.updateProviders(result.user.email || '', 'google.com');
            }

            const profile = await UserService.getUserProfile(result.user.uid);
            if (!profile) {
                const newUser = await UserService.createUserProfile(result.user.uid, result.user.email || '');
                if (newUser) {
                    await UserService.updateUserProfile(result.user.uid, { accountStatus: 'active', emailVerified: true });
                }
            }
            return result.user;
        } catch (error: any) {
            console.error('[AuthService] Google Popup Error:', error);
            if (error?.code === 'auth/popup-blocked') {
                throw new Error('Tu navegador bloqueó la ventana de login. Por favor, permite las ventanas emergentes en tu navegador.');
            }
            throw error;
        }
    },

    loginWithApple: async (returnTo?: string) => {
        if (Capacitor.isNativePlatform()) {
            const result = await FirebaseAuthentication.signInWithApple();
            const idToken = result.credential?.idToken;
            const nonce = result.credential?.nonce;
            if (!idToken) throw new Error('No idToken from Apple Login');
            const provider = new OAuthProvider('apple.com');
            const credential = provider.credential({
                idToken: idToken,
                rawNonce: nonce,
            });
            const userCredential = await signInWithCredential(auth, credential);
            
            // FASE 3: Enforce Identity Registry
            const reg = await IdentityService.getEmailRegistry(userCredential.user.email || '');
            if (!reg) {
                await IdentityService.createEmailRegistry(userCredential.user.email || '', userCredential.user.uid, 'active', 'apple.com');
            } else if (!reg.providers.includes('apple.com')) {
                await IdentityService.updateProviders(userCredential.user.email || '', 'apple.com');
            }

            const profile = await UserService.getUserProfile(userCredential.user.uid);
            if (!profile) {
                const newUser = await UserService.createUserProfile(userCredential.user.uid, userCredential.user.email || '');
                if (newUser) {
                     await UserService.updateUserProfile(userCredential.user.uid, { accountStatus: 'active', emailVerified: true });
                }
            }
            return userCredential.user;
        }

        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        
        if (returnTo) sessionStorage.setItem('auth_redirect_to', returnTo);

        try {
            const result = await signInWithPopup(auth, provider);
            
            // FASE 3: Enforce Identity Registry
            const reg = await IdentityService.getEmailRegistry(result.user.email || '');
            if (!reg) {
                await IdentityService.createEmailRegistry(result.user.email || '', result.user.uid, 'active', 'apple.com');
            } else if (!reg.providers.includes('apple.com')) {
                await IdentityService.updateProviders(result.user.email || '', 'apple.com');
            }

            const profile = await UserService.getUserProfile(result.user.uid);
            if (!profile) {
                 const newUser = await UserService.createUserProfile(result.user.uid, result.user.email || '');
                 if (newUser) {
                     await UserService.updateUserProfile(result.user.uid, { accountStatus: 'active', emailVerified: true });
                 }
            }
            return result.user;
        } catch (error: any) {
            console.error('[AuthService] Apple Popup Error:', error);
            if (error?.code === 'auth/popup-blocked') {
                throw new Error('Tu navegador bloqueó la ventana de login. Por favor, permite las ventanas emergentes en tu navegador.');
            }
            throw error;
        }
    },

    loginWithEmail: async (email: string, pass: string) => {
        try {
            // CRITICAL FIX: Sanitize input to prevent mobile keyboard trailing spaces & auto-caps
            const normalizedEmail = IdentityService.normalizeEmail(email);
            
            let user;
            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseAuthentication.signInWithEmailAndPassword({ email: normalizedEmail, password: pass });
                if (!result.user) throw new Error('Native login failed without user');
                user = result.user;
            } else {
                const result = await signInWithEmailAndPassword(auth, normalizedEmail, pass);
                user = result.user;
            }

            // FASE 4: Ghost Account Recovery -> If Auth exists but no Firestore doc, heal it.
            const profile = await UserService.getUserProfile(user.uid);
            if (!profile) {
                await UserService.createUserProfile(user.uid, user.email || normalizedEmail);
            }

            return user;
        } catch (error) {
            console.error('Error logging in with Email:', error);
            throw error;
        }
    },

    registerWithEmail: async (email: string, pass: string) => {
        try {
            const normalizedEmail = IdentityService.normalizeEmail(email);
            
            // FASE 3: Enforce Identity Policy - No recreating accounts
            const existingReg = await IdentityService.getEmailRegistry(normalizedEmail);
            if (existingReg) {
                throw new Error('identity/email-reserved');
            }

            let uid: string;

            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseAuthentication.createUserWithEmailAndPassword({ email: normalizedEmail, password: pass });
                if (!result.user?.uid) throw new Error('Native register failed without uid');
                uid = result.user.uid;
            } else {
                const result = await createUserWithEmailAndPassword(auth, normalizedEmail, pass);
                uid = result.user.uid;
                
                // Require Email Verification
                const { sendEmailVerification } = await import('firebase/auth');
                await sendEmailVerification(result.user).catch((e) => console.warn('Could not send verification email', e));
            }

            // Centralized Identity Storage
            await IdentityService.createEmailRegistry(normalizedEmail, uid, 'pending_verification', 'password');
            await UserService.createUserProfile(uid, normalizedEmail);
            
            return { uid, email: normalizedEmail };
        } catch (error) {
            console.error('Error registering with Email:', error);
            throw error;
        }
    },

    async logout() {
        try {
            if (Capacitor.isNativePlatform()) {
                await FirebaseAuthentication.signOut();
            }
            await signOut(auth);

            // Forzar limpieza de localStorage de guest para que el usuario restablezca su contador al salir
            try {
                const { clearCuriousModeStorage } = await import('@/hooks/useCuriousMode');
                clearCuriousModeStorage();
            } catch (e) { /* silent */ }

            // Limpieza SELECTIVA (No global) para evitar sesiones fantasma
            if (typeof window !== 'undefined') {
                localStorage.removeItem('pro247_auth_token');
                localStorage.removeItem('pro247_user_mode');
                // Removemos cualquier otra llave inestable de auth si la hubiera.
                // NO borrar consentimientos de cookies ni settings de idioma.

                // Clear any stored redirect paths or session country cache that could lock the user
                sessionStorage.removeItem('auth_redirect_to');
            }
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    async sendPasswordReset(email: string) {
        try {
            const isProd = typeof window !== 'undefined' && window.location.hostname === 'www.pro247ya.com';
            const baseUrl = isProd ? 'https://www.pro247ya.com' : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

            await sendPasswordResetEmail(auth, email, {
                url: `${baseUrl}/es/auth/action`, // Enforces app routing rather than Firebase defaults
                handleCodeInApp: false
            });
        } catch (error) {
            console.error('Error sending password reset:', error);
            throw error;
        }
    },

    async deleteAccount() {
        // FASE 3: SOFT DELETE (Logical Closure)
        const user = auth.currentUser;
        if (!user) throw new Error('No hay usuario autenticado');

        try {
            // Retrieve actual user doc to discover properties before closing
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);
            const userData = userDoc.exists() ? userDoc.data() : null;
            
            // Revert functional states
            await updateDoc(userRef, {
                accountStatus: 'canceled',
                canceledAt: new Date().toISOString()
            });

            if (user.email) {
                await IdentityService.updateAccountStatus(user.email, 'canceled');
            }

            // Hide public businesses without destroying them
            const bizId = userData?.businessProfileId;
            if (bizId) {
                const bizPublicRef = doc(db, 'businesses_public', bizId);
                const pDoc = await getDoc(bizPublicRef);
                if (pDoc.exists()) {
                    await updateDoc(bizPublicRef, { status: 'inactive' });
                }
            }

            // Sign them out finally (no destruction of identity)
            await signOut(auth);

        } catch (error: any) {
            console.error('[deleteAccount] Soft Delete Failed', error);
            throw error;
        }
    },

    // FASE 3: Enforce OAuth Linking
    async loginAndLink(password: string, pendingCred: any) {
        const user = auth.currentUser;
        if (!user) {
            // Wait, to link we need to be logged in first.
            // If we are not, we need to supply email to login with.
            throw new Error('Debe autenticarse con contraseña primero para vincular la cuenta.');
        }
        try {
            const { linkWithCredential } = await import('firebase/auth');
            const result = await linkWithCredential(user, pendingCred);
            
            // Update Identity Registry
            if (user.email) {
                const reg = await IdentityService.getEmailRegistry(user.email);
                if (reg && pendingCred.providerId === 'google.com' && !reg.providers.includes('google.com')) {
                    await IdentityService.updateProviders(user.email, 'google.com');
                } else if (reg && pendingCred.providerId === 'apple.com' && !reg.providers.includes('apple.com')) {
                    await IdentityService.updateProviders(user.email, 'apple.com');
                }
            }
            return result.user;
        } catch (error) {
            console.error('[AuthService] Error vinculando credencial:', error);
            throw error;
        }
    },

    // Re-authenticate with password and then soft delete (for email/pass users)
    async reauthAndDelete(password: string) {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('No hay usuario autenticado con email');

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        // After successful reauth, delete account
        return AuthService.deleteAccount();
    },
};


