import { auth, db, storage } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendPasswordResetEmail,
    signInWithCredential
} from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, writeBatch, getDoc } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { UserService } from './user.service';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export const AuthService = {
    // Check if email exists to prevent duplicate account creation attempts
    checkEmailExists: async (rawEmail: string) => {
        try {
            const email = rawEmail.trim().toLowerCase();
            // Se usa Firestore en lugar de fetchSignInMethodsForEmail para evitar el bloqueo 
            // de "Email Enumeration Protection" de Firebase Identity Platform.
            const { query, where } = await import('firebase/firestore');
            const q = query(collection(db, 'users'), where('email', '==', email));
            const snap = await getDocs(q);
            return !snap.empty;
        } catch (error) {
            console.error('Error checking email existence in Firestore:', error);
            // Si hay un error, dejamos que Firebase decida durante el Auth flow
            return false;
        }
    },

    // Detect mobile browser or PWA standalone mode (popups are blocked in these contexts)
    _isMobileOrPWA: (): boolean => {
        if (typeof window === 'undefined') return false;
        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            window.matchMedia('(display-mode: fullscreen)').matches ||
            /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        );
    },

    // Get pending redirect result (call on app mount to capture Google/Apple redirect)
    getRedirectResult: () => getRedirectResult(auth),

    loginWithGoogle: async (returnTo?: string) => {
        if (Capacitor.isNativePlatform()) {
            // Capacitor Native App: use capacitor-firebase plugin
            const result = await FirebaseAuthentication.signInWithGoogle();
            const idToken = result.credential?.idToken;
            if (!idToken) throw new Error('No idToken from Google Login');
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const profile = await UserService.getUserProfile(userCredential.user.uid);
            if (!profile) {
                await UserService.createUserProfile(userCredential.user.uid, userCredential.user.email || '');
            }
            return userCredential.user;
        }

        const provider = new GoogleAuthProvider();
        if (AuthService._isMobileOrPWA()) {
            // Mobile/PWA: store returnTo and use redirect (popup is blocked)
            if (returnTo) sessionStorage.setItem('auth_redirect_to', returnTo);
            await signInWithRedirect(auth, provider);
            return null; // page navigates away — caller should not expect a return value
        }
        // Desktop: use popup
        const result = await signInWithPopup(auth, provider);
        const profile = await UserService.getUserProfile(result.user.uid);
        if (!profile) {
            await UserService.createUserProfile(result.user.uid, result.user.email || '');
        }
        return result.user;
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
            const profile = await UserService.getUserProfile(userCredential.user.uid);
            if (!profile) {
                await UserService.createUserProfile(userCredential.user.uid, userCredential.user.email || '');
            }
            return userCredential.user;
        }

        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        if (AuthService._isMobileOrPWA()) {
            if (returnTo) sessionStorage.setItem('auth_redirect_to', returnTo);
            await signInWithRedirect(auth, provider);
            return null;
        }
        const result = await signInWithPopup(auth, provider);
        const profile = await UserService.getUserProfile(result.user.uid);
        if (!profile) {
            await UserService.createUserProfile(result.user.uid, result.user.email || '');
        }
        return result.user;
    },

    loginWithEmail: async (email: string, pass: string) => {
        try {
            let user;
            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseAuthentication.signInWithEmailAndPassword({ email, password: pass });
                if (!result.user) throw new Error('Native login failed without user');
                user = result.user;
            } else {
                const result = await signInWithEmailAndPassword(auth, email, pass);
                user = result.user;
            }

            // FASE 4: Ghost Account Recovery -> If Auth exists but no Firestore doc, heal it.
            const profile = await UserService.getUserProfile(user.uid);
            if (!profile) {
                await UserService.createUserProfile(user.uid, user.email || email);
            }

            return user;
        } catch (error) {
            console.error('Error logging in with Email:', error);
            throw error;
        }
    },

    registerWithEmail: async (email: string, pass: string) => {
        try {
            let uid: string;
            let finalEmail = email;

            if (Capacitor.isNativePlatform()) {
                const result = await FirebaseAuthentication.createUserWithEmailAndPassword({ email, password: pass });
                if (!result.user?.uid) throw new Error('Native register failed without uid');
                uid = result.user.uid;
                finalEmail = result.user.email || email;
            } else {
                const result = await createUserWithEmailAndPassword(auth, email, pass);
                uid = result.user.uid;
                finalEmail = result.user.email || email;
            }

            await UserService.createUserProfile(uid, finalEmail);
            return { uid, email: finalEmail };
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
        const user = auth.currentUser;
        if (!user) throw new Error('No hay usuario autenticado');

        try {
            // 1. Delete Firestore data (best effort)
            const batch = writeBatch(db);

            // Fetch user doc first to find their actual business Profile ID before deleting
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists() ? userDoc.data() : null;
            const bizId = userData?.businessProfileId || user.uid;

            // Main docs
            batch.delete(doc(db, 'users', user.uid));
            batch.delete(doc(db, 'businesses', bizId)); // The gated plan info document
            batch.delete(doc(db, 'businesses_public', bizId));
            batch.delete(doc(db, 'businesses_private', bizId));

            // Subcollections of business_private/public
            const publicSubcollections = ['portfolio_posts', 'reviews'];
            const privateSubcollections = ['services'];

            for (const sub of privateSubcollections) {
                try {
                    const snapshot = await getDocs(collection(db, 'businesses_private', bizId, sub));
                    snapshot.forEach(d => batch.delete(d.ref));
                } catch (_) { /* ignore if not found */ }
            }

            for (const sub of publicSubcollections) {
                try {
                    const snapshot = await getDocs(collection(db, 'businesses_public', bizId, sub));
                    snapshot.forEach(d => batch.delete(d.ref));
                } catch (_) { /* ignore if not found */ }
            }

            await batch.commit().catch(e => console.warn('Partial Firestore cleanup:', e));

            // 1.5 Delete Firebase Storage files (avatars & business_images)
            try {
                // We use listAll to get all files in a directory and delete them
                const deleteStorageFolder = async (folderPath: string) => {
                    try {
                        const folderRef = ref(storage, folderPath);
                        const result = await listAll(folderRef);
                        const deletePromises = result.items.map(item => deleteObject(item));
                        await Promise.all(deletePromises);
                    } catch (err: any) {
                        // ignore if folder doesn't exist
                        if (err.code !== 'storage/object-not-found') {
                            console.warn(`Could not empty folder ${folderPath}:`, err);
                        }
                    }
                };

                await deleteStorageFolder(`avatars/${user.uid}`);
                // Storage service uses user.uid for business images path
                await deleteStorageFolder(`business_images/${user.uid}`);
            } catch (storageErr) {
                console.warn('Storage cleanup failed:', storageErr);
            }

            // 2. Delete Firebase Auth account
            await user.delete();

        } catch (error: any) {
            // Firebase requires re-authentication if session is too old
            if (error.code === 'auth/requires-recent-login') {
                // Sign out so user can log back in
                await signOut(auth);
                // Signal to the UI that re-login is needed before deletion
                const recentLoginError = new Error('REQUIRES_REAUTH');
                (recentLoginError as any).code = 'auth/requires-recent-login';
                throw recentLoginError;
            }
            throw error;
        }
    },

    // Re-authenticate with password and then delete (for email/pass users)
    async reauthAndDelete(password: string) {
        const user = auth.currentUser;
        if (!user || !user.email) throw new Error('No hay usuario autenticado con email');

        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        // After successful reauth, delete account
        return AuthService.deleteAccount();
    },
};


