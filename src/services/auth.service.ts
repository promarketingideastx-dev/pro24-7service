import { auth, db } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
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

    // ... existing login methods ...
    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // Check if profile exists, if not create it
            const profile = await UserService.getUserProfile(result.user.uid);
            if (!profile) {
                await UserService.createUserProfile(result.user.uid, result.user.email || '');
            }
            return result.user;
        } catch (error) {
            console.error('Error logging in with Google:', error);
            throw error;
        }
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

    async deleteAccount() {
        try {
            const user = auth.currentUser;
            if (user) {
                // 1. Clean Firestore Data (Best Effort)
                try {
                    await deleteDoc(doc(db, 'users', user.uid));
                    // Try to delete business profiles if they exist (assuming ID = UID)
                    await deleteDoc(doc(db, 'businesses_public', user.uid)).catch(() => { });
                    await deleteDoc(doc(db, 'businesses_private', user.uid)).catch(() => { });
                } catch (dbError) {
                    console.warn("Error cleaning up user data:", dbError);
                    // Continue to delete auth even if DB cleanup fails partially
                }

                // 2. Delete Auth Account
                await user.delete();
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    },
};


