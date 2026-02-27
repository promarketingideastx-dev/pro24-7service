'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getRedirectResult } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserDocument } from '@/types/firestore-schema';
import { UserService } from '@/services/user.service';

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
        let unsubscribeFirestore: (() => void) | null = null;

        // Handle return from signInWithRedirect (Google/Apple on mobile/PWA)
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

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            // Clean up previous Firestore listener if exists
            if (unsubscribeFirestore) {
                unsubscribeFirestore();
                unsubscribeFirestore = null;
            }

            if (currentUser) {
                // Real-time Listener (Start immediately)
                const userRef = doc(db, 'users', currentUser.uid);
                unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data() as UserDocument);
                    } else {
                        // Profile doesn't exist yet -> Trigger creation in background
                        UserService.createUserProfile(currentUser.uid, currentUser.email || '').catch(e => console.error(e));
                        setUserProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("AuthContext Firestore Error:", error);
                    setLoading(false);
                });
            } else {
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
