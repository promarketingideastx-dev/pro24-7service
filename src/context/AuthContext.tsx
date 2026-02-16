'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserDocument } from '@/types/firestore-schema';
import { UserService } from '@/services/user.service';

interface AuthContextType {
    user: User | null;
    userProfile: UserDocument | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userProfile: null,
    loading: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserDocument | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Real-time Listener (Start immediately, don't wait for create)
                const userRef = doc(db, 'users', currentUser.uid);
                const unsubscribeFirestore = onSnapshot(userRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data() as UserDocument);
                    } else {
                        // Profile doesn't exist yet -> Trigger creation in background
                        // This prevents blocking the UI while writing to DB
                        UserService.createUserProfile(currentUser.uid, currentUser.email || '').catch(e => console.error(e));
                        setUserProfile(null);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("AuthContext Firestore Error:", error);
                    setLoading(false);
                });

                return () => unsubscribeFirestore();
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
