import { UserDocument } from '@/types/firestore-schema';

/**
 * Lógica "Candado" (Retención).
 * Determina qué datos puede ver el usuario actual sobre un negocio.
 */

export const PERMISSIONS = {
    canViewContactInfo: (viewer: UserDocument | null): boolean => {
        // Solo usuarios registrados pueden ver teléfono/whatsapp
        return !!viewer && !!viewer.uid;
    },

    canRequestQuote: (viewer: UserDocument | null): boolean => {
        // Solo usuarios registrados pueden cotizar
        return !!viewer && !!viewer.uid;
    },

    canChat: (viewer: UserDocument | null): boolean => {
        // Solo usuarios registrados pueden chatear
        return !!viewer && !!viewer.uid;
    }
};

/**
 * Hook simulado para uso en componentes
 * const { canViewPhone } = usePermissions();
 */
export const usePermissions = (user: UserDocument | null) => {
    return {
        canViewContactInfo: PERMISSIONS.canViewContactInfo(user),
        canRequestQuote: PERMISSIONS.canRequestQuote(user),
        canChat: PERMISSIONS.canChat(user)
    };
};
