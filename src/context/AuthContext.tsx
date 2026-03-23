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
        console.log('[AuthContext] useEffect started');
        let unsubscribeFirestore: (() => void) | null = null;
        let isRedirectResolved = false;

        // 1. Process Redirect Result centrally for Mobile/PWA
        const resolveRedirect = async () => {
            if (!Capacitor.isNativePlatform()) {
                console.log('[AuthContext] REDIRECT START');
                setIsResolvingAuth(true); // Flag global activa

                try {
                    const result = await getRedirectResult(auth);
                    console.log('[AuthContext] REDIRECT RESOLVED');
                    
                    if (result?.user) {
                        console.log('[AuthContext] getRedirectResult capturó una sesión válida:', result.user.uid);
                        
                        let providerId = 'google.com';
                        if (result.providerId) {
                            providerId = result.providerId;
                        } else if (result.user.providerData && result.user.providerData.length > 0) {
                            providerId = result.user.providerData[0].providerId;
                        }

                        // FASE 3: Aseguramos el Registro de Identidad desde el Redirect
                        const reg = await IdentityService.getEmailRegistry(result.user.email || '');
                        if (!reg) {
                            await IdentityService.createEmailRegistry(result.user.email || '', result.user.uid, 'active', providerId as any);
                        } else if (!reg.providers.includes(providerId as any)) {
                            await IdentityService.updateProviders(result.user.email || '', providerId as any);
                        }

                        // Recuperamos el Perfil usando getProfile para no destruirlo
                        const profile = await UserService.getUserProfile(result.user.uid);
                        if (!profile) {
                            const newUser = await UserService.createUserProfile(result.user.uid, result.user.email || '');
                            if (newUser) {
                                await UserService.updateUserProfile(result.user.uid, { accountStatus: 'active', emailVerified: true });
                            }
                        }
                    }
                } catch (err) {
                    console.error('Redirect sign-in error:', err);
                } finally {
                    isRedirectResolved = true;
                    // Mantenemos la bandera arriba si aún falta onAuthStateChanged. 
                    // Se bajará en el observer principal cuando aterricen los perfiles.
                    // Pero liberémosla si NO hubo user para que el app fluya
                    if (auth.currentUser === null) {
                        console.log('[AuthContext] FINAL DEL REDIRECT: No existe sesión. Liberando Guardia...');
                        setIsResolvingAuth(false);
                        setLoading(false); // CRÍTICO: Firebase fue silenciado por nuestro Escudo. Debemos apagar el Loading manualmente aquí.
                    }
                }
            } else {
                isRedirectResolved = true;
                setIsResolvingAuth(false);
            }
        };

        resolveRedirect();

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            console.log('[AuthContext] AUTH USER SET | onAuthStateChanged fired, user:', currentUser?.uid || 'null');
            
            // ESCUDO TOTAL: Ignorar emisiones null si el redirect aún no resuelve
            if (!currentUser && !isRedirectResolved) {
                console.log('[AuthContext] Ignorando pulso NULL prematuro de Firebase asumiendo redirect activo.');
                return; 
            }

            setUser(currentUser);

            if (currentUser) {
                setLoading(true);

                // Clean up previous Firestore listener if exists
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }

                clearCuriousModeStorage();

                // Real-time Listener (Start immediately)
                const userRef = doc(db, 'users', currentUser.uid);
                unsubscribeFirestore = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        console.log('[AuthContext] Firestore profile loaded from server/cache');
                        setUserProfile(docSnap.data() as UserDocument);
                    } else {
                        console.warn('[AuthContext] Firestore profile missing or cache is empty.');
                        setUserProfile(null);
                    }
                    setLoading(false);
                    setIsResolvingAuth(false);
                }, (error) => {
                    console.error("AuthContext Firestore Error:", error);
                    setLoading(false);
                    setIsResolvingAuth(false);
                });
            } else {
                console.log('[AuthContext] No user confirmated. Setting loading/resolving to false');
                setUserProfile(null);
                setLoading(false);
                setIsResolvingAuth(false);
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
        <AuthContext.Provider value={{ user, userProfile, loading, isResolvingAuth, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
