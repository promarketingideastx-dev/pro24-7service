import { auth, db } from '@/lib/firebase';
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
} from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { UserService } from './user.service';

export const AuthService = {
    // Check if email exists to prevent duplicate account creation attempts
    checkEmailExists: async (email: string) => {
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            return methods.length > 0;
        } catch (error) {
            console.error('Error checking email existence:', error);
            // Default to false to not block user, or handle specific error codes if needed
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
            const result = await signInWithEmailAndPassword(auth, email, pass);
            return result.user;
        } catch (error) {
            console.error('Error logging in with Email:', error);
            throw error;
        }
    },

    registerWithEmail: async (email: string, pass: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, pass);
            await UserService.createUserProfile(result.user.uid, result.user.email || '');
            return result.user;
        } catch (error) {
            console.error('Error registering with Email:', error);
            throw error;
        }
    },

    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    },

    async sendPasswordReset(email: string) {
        try {
            await sendPasswordResetEmail(auth, email);
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

            // Main docs
            batch.delete(doc(db, 'users', user.uid));
            batch.delete(doc(db, 'businesses_public', user.uid));
            batch.delete(doc(db, 'businesses_private', user.uid));

            // Subcollections of business_private: services, portfolio_posts, reviews
            const subcollections = ['services', 'portfolio_posts', 'reviews'];
            for (const sub of subcollections) {
                try {
                    const snapshot = await getDocs(collection(db, 'businesses_private', user.uid, sub));
                    snapshot.forEach(d => batch.delete(d.ref));
                } catch (_) { /* ignore if not found */ }
            }

            await batch.commit().catch(e => console.warn('Partial Firestore cleanup:', e));

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


