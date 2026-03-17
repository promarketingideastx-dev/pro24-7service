'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { UserDocument } from '@/types/firestore-schema';
import { UserService } from '@/services/user.service';
import { clearCuriousModeStorage } from '@/hooks/useCuriousMode';

interface AuthContextType {
    user: User | null;
    userProfile: UserDocument | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true,
    refreshProfile: async () => { }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
    const [loading, setLoading] = useState(true);

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
        console.log('[AuthContext] useEffect started');
        let unsubscribeFirestore: (() => void) | null = null;

        // Handle return from signInWithRedirect (Google/Apple on mobile/PWA)
        // Only run this on the web. Native uses capacitor-firebase/authentication which handles its own flow.
        if (!Capacitor.isNativePlatform()) {
            getRedirectResult(auth)
                .then(async (result) => {
                    if (result?.user) {
                        // Profile creation is handled below by onAuthStateChanged
                        // but ensure it exists here as well (belt-and-suspenders)
                        await UserService.createUserProfile(result.user.uid, result.user.email || '')
                            .catch(() => { /* profile may already exist */ });
                    }
                })
                .catch((err) => console.error('Redirect sign-in error:', err));
        }

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log('[AuthContext] onAuthStateChanged fired, user:', currentUser?.uid || 'null');
            setUser(currentUser);

            if (currentUser) {
                // EXTREMELY CRITICAL: Lock the application router immediately.
                // Firebase just told us we have a user, but we do NOT have the userProfile yet.
                // We MUST set loading to true synchronously to prevent AuthGuard from making 
                // premature routing decisions based on an incomplete state.
                setLoading(true);
            }


            // Clean up previous Firestore listener if exists
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
                unsubscribeFirestore = null;
            }

            if (currentUser) {
                // Clear curious mode on successful session
                clearCuriousModeStorage();

                // Real-time Listener (Start immediately)
                const userRef = doc(db, 'users', currentUser.uid);
                unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        console.log('[AuthContext] Firestore profile loaded');
                        setUserProfile(docSnap.data() as UserDocument);
                        setLoading(false);
                    } else {
                        console.log('[AuthContext] Firestore profile not found, triggering creation');
                        // Profile doesn't exist yet -> Trigger creation.
                        // CRITICAL: Do NOT setLoading(false) here. The next snapshot will fire when creation completes.
                        UserService.createUserProfile(currentUser.uid, currentUser.email || '').catch(e => {
                            console.error("Profile creation failed", e);
                            setLoading(false); // Only unlock if it drastically failed
                        });
                    }
                }, (error) => {
                    console.error("AuthContext Firestore Error:", error);
                    setLoading(false);
                });
            } else {
                console.log('[AuthContext] No user, setting loading to false');
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
            }
        };
    }, []);

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.uid);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
