import { CountryCode, DEFAULT_COUNTRY, isSupportedCountry } from './locations';

const COOKIE_NAME = 'pro247_country';
const STORAGE_KEY = 'pro247_country'; // Standardizing key name

export const ActiveCountry = {
    /**
     * Set the active country in both LocalStorage and Cookies (for potential SSR).
     */
    set(code: CountryCode) {
        if (!isSupportedCountry(code)) return;

        // 1. LocalStorage (Client)
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, code);
            } catch (e) {
                console.warn('LocalStorage access denied', e);
            }
        }

        // 2. Cookie (Server/Client)
        // Simple distinct cookie setter
        // 2. Cookie (Server/Client)
        if (typeof document !== 'undefined') {
            document.cookie = `${COOKIE_NAME}=${code}; path=/; max-age=31536000; SameSite=Lax`;
        }
    },

    /**
     * Get the active country from LocalStorage (preferred on client) or Cookie.
     * Falls back to DEFAULT_COUNTRY.
     */
    get(): CountryCode {
        if (typeof window === 'undefined') return DEFAULT_COUNTRY;

        // 1. Try LocalStorage
        try {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local && isSupportedCountry(local)) return local as CountryCode;
        } catch (e) {
            // Ignore error
        }

        // 2. Try Cookie
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        const cookieVal = match ? match[2] : null;
        if (cookieVal && isSupportedCountry(cookieVal)) return cookieVal as CountryCode;

        // 3. Fallback
        return DEFAULT_COUNTRY;
    },

    /**
     * Returns true only if the user has EXPLICITLY selected a country
     * (i.e., a value is saved in localStorage or cookie).
     * Returns false for first-time visitors who have never chosen.
     */
    hasExplicitSelection(): boolean {
        if (typeof window === 'undefined') return false;

        // Check LocalStorage
        try {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local && isSupportedCountry(local)) return true;
        } catch (e) {
            // Ignore error
        }

        // Check Cookie
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        const cookieVal = match ? match[2] : null;
        if (cookieVal && isSupportedCountry(cookieVal)) return true;

        return false;
    }
};
