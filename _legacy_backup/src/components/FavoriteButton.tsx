'use client';

import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, getDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { sanitizeData } from '@/lib/firestoreUtils';

interface FavoriteButtonProps {
    providerId: string | number;
    providerData?: any;
    size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ providerId, providerData, size = 'md' }: FavoriteButtonProps) {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(false);

    const id = String(providerId);

    useEffect(() => {
        if (!user) {
            setIsFavorite(false);
            return;
        }

        const favRef = doc(db, `users/${user.uid}/favorites`, id);
        const unsubscribe = onSnapshot(favRef, (docSnap) => {
            setIsFavorite(docSnap.exists());
        });

        return () => unsubscribe();
    }, [user, id]);

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            alert('Inicia sesión para guardar favoritos.');
            return;
        }

        setLoading(true);
        try {
            const favRef = doc(db, `users/${user.uid}/favorites`, id);
            if (isFavorite) {
                await deleteDoc(favRef);
                console.log(`[AuthTelemetry] favorite_removed: ${id}`);
            } else {
                await setDoc(favRef, sanitizeData({
                    providerId: id,
                    name: providerData?.name || 'Profesional',
                    main_category: providerData?.category || '',
                    rating: providerData?.rating || 0,
                    image: providerData?.image || '',
                    created_at: new Date().toISOString()
                }));
                console.log(`[AuthTelemetry] favorite_added: ${id}`);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        } finally {
            setLoading(false);
        }
    };

    const iconSize = size === 'sm' ? '1.2rem' : size === 'md' ? '1.5rem' : '2rem';

    return (
        <button
            className={`fav-btn ${isFavorite ? 'active' : ''}`}
            onClick={toggleFavorite}
            disabled={loading}
            aria-label="Favorite"
        >
            {isFavorite ? '❤️' : '🤍'}
            <style jsx>{`
                .fav-btn {
                    background: none;
                    border: none;
                    font-size: ${iconSize};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    padding: 4px;
                    border-radius: 50%;
                }
                .fav-btn:hover { transform: scale(1.2); }
                .fav-btn:active { transform: scale(0.9); }
                .fav-btn.active { filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5)); }
                .fav-btn:disabled { opacity: 0.5; cursor: default; }
            `}</style>
        </button>
    );
}
