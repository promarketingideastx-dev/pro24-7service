'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { UserDocument } from '@/types/firestore-schema';
import { UserService } from '@/services/user.service';
import { IdentityService } from '@/services/identity.service';
import { clearCuriousModeStorage } from '@/hooks/useCuriousMode';

interface AuthContextType {
    user: User | null;
    userProfile: UserDocument | null;
    loading: boolean;
    isResolvingAuth: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    isResolvingAuth: true,
    refreshProfile: async () => { }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [isResolvingAuth, setIsResolvingAuth] = useState(true);

    // Fetch profile manually (one-time fetch)
    const fetchProfile = async (uid: string) => {
        try {
            const profile = await UserService.getUserProfile(uid);
            setUserProfile(profile);
        } catch (error) {
            console.error("Failed to fetch user profile", error);
            setUserProfile(null);
        }
    };

    useEffect(() => {
        console.log('[AuthContext] useEffect started (Popup Mode)');
        let unsubscribeFirestore: (() => void) | null = null;
        
        setIsResolvingAuth(false); // Eliminado el flujo de Redirect globalmente

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log('[AuthContext] AUTH USER SET | onAuthStateChanged fired, user:', currentUser?.uid || 'null');
            setUser(currentUser);

            if (currentUser) {
                setLoading(true);

                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }

                clearCuriousModeStorage();

                // Real-time Listener (Start immediately)
                const userRef = doc(db, 'users', currentUser.uid);
                unsubscribeFirestore = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        console.log('[AuthContext] Firestore profile loaded');
                        setUserProfile(docSnap.data() as UserDocument);
                        setLoading(false);
                    } else {
                        console.warn('[AuthContext] Profile missing in snapshot. Forcing direct network fetch...');
                        try {
                            // Bypass local cache entirely to prevent false-positives
                            const { getDocFromServer } = await import('firebase/firestore');
                            const directSnap = await getDocFromServer(userRef);
                            if (directSnap.exists()) {
                                setUserProfile(directSnap.data() as UserDocument);
                            } else {
                                setUserProfile(null);
                            }
                        } catch (err) {
                            console.error('[AuthContext] Network fetch failed:', err);
                            setUserProfile(null);
                        }
                        setLoading(false);
                    }
                }, (error) => {
                    console.error("AuthContext Firestore Error:", error);
                    setLoading(false);
                    // Critical fallback if Snapshot fails permission checks
                    setUserProfile(null); 
                });
            } else {
                console.log('[AuthContext] No user confirmed. Setting loading to false');
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            if (unsubscribeAuth) unsubscribeAuth();
            if (unsubscribeFirestore) unsubscribeFirestore();
        };
    }, []);

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.uid);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, isResolvingAuth, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
