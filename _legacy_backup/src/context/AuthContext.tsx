'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, enableNetwork, disableNetwork } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserProfile {
    email: string | null;
    uid: string;
    // Legacy mapping (kept for compatibility)
    role: 'client' | 'provider' | 'admin';
    // New granular roles
    roles: {
        client: boolean;
        provider: boolean;
        admin: boolean;
    };
    full_name: string | null;
    phone?: string | null;
    city_zone?: string | null;
    gender?: string | null;
    age_range?: string | null;
    isVerified: boolean;
    authProviders: string[];
    createdAt: any;
    lastLogin: any;
    country: string; // Legacy
    country_code: string; // ISO alpha-2 (Mandatory)
    country_name: string; // Display name
    notificationsEnabled: boolean;
    avatar: {
        type: 'photo' | 'emoji' | 'none';
        photo_url?: string | null;
        photo_path?: string | null;
        emoji?: string | null;
        updated_at: string;
    };
    consent: {
        marketing_opt_in: boolean;
        privacy_policy_accepted: boolean;
        updated_at: string;
    };
    settings: {
        locale: string;
        unit_km_mi: 'km' | 'mi';
    };
    provider_setup?: {
        category_main: string;
        subcategory_primary: string;
        specialties: string[];
        mechanic_mode: string[] | null;
        price_min: string;
        price_max: string;
        coverage: string;
        updatedAt: string;
        displayName?: string;
        bio?: string;
        experience?: string;
        profileImage?: string;
    };
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    isProfileIncomplete: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
    isProfileIncomplete: false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

    const fetchProfile = async (firebaseUser: User) => {
        try {
            const docRef = doc(db, "users", firebaseUser.uid);

            let docSnap;
            try {
                // Primary attempt: standard getDoc (handles server/cache automatically)
                docSnap = await getDoc(docRef);
            } catch (error: any) {
                console.warn("[AuthContext] Firestore server fetch failed, checking cache:", error.code);

                // If offline or network error, attempt to force cache
                if (error.code === 'unavailable' || error.code === 'network-request-failed' || error.message?.includes('offline')) {
                    try {
                        const { getDocFromCache } = await import('firebase/firestore');
                        docSnap = await getDocFromCache(docRef);
                        console.log("[AuthContext] Recovered from cache while offline");
                    } catch (cacheError) {
                        console.warn("[AuthContext] Cache recovery failed (empty cache or first-time login)");
                        // Do not throw here, just leave docSnap as undefined
                    }
                } else {
                    // For other errors (permission-denied, etc.), we might want to know
                    console.error("[AuthContext] Fatal Firestore Error:", error);
                }
            }

            const isAdminEmail = firebaseUser.email === 'promarketingideas.tx@gmail.com';

            if (docSnap && docSnap.exists()) {
                const data = docSnap.data() as any;
                let needsUpdate = false;

                // Migration: Backwards compatibility for roles object
                if (!data.roles) {
                    data.roles = {
                        client: true,
                        provider: data.role === 'provider',
                        admin: data.role === 'admin' || isAdminEmail
                    };
                    needsUpdate = true;
                }

                // Force admin sync
                if (isAdminEmail && !data.roles.admin) {
                    data.roles.admin = true;
                    data.isVerified = true;
                    needsUpdate = true;
                }

                // Migration: country_code & country_name (ISO Alpha-2)
                if (!data.country_code || !data.country_name) {
                    const legacy = data.country || data.country_code || localStorage.getItem('app_country') || 'US';
                    const countryMap: Record<string, { code: string, name: string }> = {
                        'US': { code: 'US', name: 'United States' },
                        'United States': { code: 'US', name: 'United States' },
                        'HN': { code: 'HN', name: 'Honduras' },
                        'Honduras': { code: 'HN', name: 'Honduras' },
                        'MX': { code: 'MX', name: 'México' },
                        'México': { code: 'MX', name: 'México' },
                        'ES': { code: 'ES', name: 'España' },
                        'España': { code: 'ES', name: 'España' },
                        'BR': { code: 'BR', name: 'Brasil' },
                        'Brasil': { code: 'BR', name: 'Brasil' },
                        'LATAM': { code: 'MX', name: 'México' } // Default fallback
                    };
                    const mapped = countryMap[legacy] || { code: 'US', name: 'United States' };
                    data.country_code = mapped.code;
                    data.country_name = mapped.name;
                    needsUpdate = true;
                }

                // Migration: Avatar
                if (!data.avatar) {
                    data.avatar = {
                        type: data.provider_setup?.profileImage ? 'photo' : 'none',
                        photo_url: data.provider_setup?.profileImage || null,
                        updated_at: new Date().toISOString()
                    };
                    needsUpdate = true;
                }

                // Migration: Add consent and settings if missing
                if (!data.consent) {
                    data.consent = { marketing_opt_in: false, privacy_policy_accepted: !!data.full_name, updated_at: new Date().toISOString() };
                    needsUpdate = true;
                }
                if (!data.settings) {
                    data.settings = { locale: 'es', unit_km_mi: 'km' };
                    needsUpdate = true;
                }

                if (needsUpdate) {
                    await updateDoc(docRef, {
                        roles: data.roles,
                        country_code: data.country_code,
                        country_name: data.country_name,
                        avatar: data.avatar,
                        consent: data.consent,
                        settings: data.settings,
                        isVerified: data.isVerified || false
                    });
                }

                // Check if identity onboarding is needed (mandatory full_name)
                if (!data.full_name) {
                    setIsProfileIncomplete(true);
                } else {
                    setIsProfileIncomplete(false);
                }

                setProfile(data as UserProfile);
                // Fire and forget, don't block the main flow
                updateDoc(docRef, { lastLogin: serverTimestamp() }).catch(e => console.warn("[Auth] lastLogin update failed", e));
            } else {
                // New User Flow
                const initialCountry = localStorage.getItem('app_country') || 'US';
                const countryMap: Record<string, { code: string, name: string }> = {
                    'US': { code: 'US', name: 'United States' },
                    'HN': { code: 'HN', name: 'Honduras' },
                    'MX': { code: 'MX', name: 'México' },
                    'ES': { code: 'ES', name: 'España' },
                    'BR': { code: 'BR', name: 'Brasil' }
                };
                const mapped = countryMap[initialCountry] || { code: 'US', name: 'United States' };

                const newProfile: UserProfile = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    role: isAdminEmail ? 'admin' : 'client',
                    roles: {
                        client: true,
                        provider: false,
                        admin: isAdminEmail
                    },
                    full_name: firebaseUser.displayName || null,
                    isVerified: isAdminEmail,
                    authProviders: firebaseUser.providerData.map(p => p.providerId),
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    country: initialCountry,
                    country_code: mapped.code,
                    country_name: mapped.name,
                    notificationsEnabled: true,
                    avatar: {
                        type: firebaseUser.photoURL ? 'photo' : 'none',
                        photo_url: firebaseUser.photoURL || null,
                        updated_at: new Date().toISOString()
                    },
                    consent: {
                        marketing_opt_in: false,
                        privacy_policy_accepted: false,
                        updated_at: new Date().toISOString()
                    },
                    settings: {
                        locale: 'es',
                        unit_km_mi: 'km'
                    },
                    provider_setup: {
                        displayName: firebaseUser.displayName || '',
                        profileImage: firebaseUser.photoURL || '',
                        category_main: 'generales',
                        subcategory_primary: 'limpieza',
                        specialties: [],
                        mechanic_mode: null,
                        price_min: '',
                        price_max: '',
                        coverage: '',
                        updatedAt: new Date().toISOString()
                    }
                };

                await setDoc(docRef, newProfile);
                setProfile(newProfile);
                setIsProfileIncomplete(!newProfile.full_name);

                console.log(`[AuthTelemetry] user_signup_success: ${firebaseUser.email}`);
            }
        } catch (error: any) {
            console.error("Firebase fetchProfile error:", error);
            if (error.code === 'unavailable' || error.message.includes('offline')) {
                console.warn("User is offline. Using local state if available.");
            }
        }
    };

    useEffect(() => {
        // Safety timeout for loading state
        const safetyTimeout = setTimeout(() => {
            if (loading) {
                console.warn("[AuthContext] Safety timeout triggered - forcing loading: false");
                setLoading(false);
            }
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    await fetchProfile(firebaseUser);
                } catch (e) {
                    console.error("[AuthContext] fetchProfile error during init", e);
                }
            } else {
                setProfile(null);
                setIsProfileIncomplete(false);
            }
            setLoading(false);
            clearTimeout(safetyTimeout);
        });

        return () => {
            unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []);

    const refreshProfile = async () => {
        if (user) await fetchProfile(user);
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile, isProfileIncomplete }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
