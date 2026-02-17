import { auth } from '@/lib/firebase';
import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from 'firebase/auth';
import { UserService } from './user.service';

export const AuthService = {
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
                await user.delete();
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    },


};
