import { CountryCode, DEFAULT_COUNTRY, isSupportedCountry } from './locations';

const COOKIE_NAME = 'pro247_country';
const SESSION_KEY = 'pro247_country_session'; // sessionStorage: clears on browser/tab close

export const ActiveCountry = {
    /**
     * Set the active country in sessionStorage only.
     * Using sessionStorage means the selector appears every new browser session (tab/window open),
     * giving users a fresh country selection each time they open the app.
     * Cookie is also set for SSR reads during the session.
     */
    set(code: CountryCode) {
        if (!isSupportedCountry(code)) return;

        // sessionStorage: persists within the tab session, clears on browser/tab close
        if (typeof window !== 'undefined') {
            try {
                sessionStorage.setItem(SESSION_KEY, code);
            } catch (e) {
                console.warn('sessionStorage access denied', e);
            }
        }

        // Session cookie (no max-age = expires when browser closes)
        if (typeof document !== 'undefined') {
            document.cookie = `${COOKIE_NAME}=${code}; path=/; SameSite=Lax`;
        }
    },

    /**
     * Get the active country from sessionStorage (preferred on client) or session cookie.
     * Falls back to DEFAULT_COUNTRY.
     */
    get(): CountryCode {
        if (typeof window === 'undefined') return DEFAULT_COUNTRY;

        // 1. Try sessionStorage
        try {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (session && isSupportedCountry(session)) return session as CountryCode;
        } catch (e) {
            // Ignore error
        }

        // 2. Try Cookie (SSR fallback)
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        const cookieVal = match ? match[2] : null;
        if (cookieVal && isSupportedCountry(cookieVal)) return cookieVal as CountryCode;

        // 3. Fallback
        return DEFAULT_COUNTRY;
    },

    /**
     * Returns true only if the user has selected a country in this session.
     * Returns false on every new browser session (new tab/window open).
     */
    hasExplicitSelection(): boolean {
        if (typeof window === 'undefined') return false;

        // Check sessionStorage only (no localStorage = no cross-session persistence)
        try {
            const session = sessionStorage.getItem(SESSION_KEY);
            if (session && isSupportedCountry(session)) return true;
        } catch (e) {
            // Ignore error
        }

        // Fallback: check session cookie
        const match = document.cookie.match(new RegExp('(^| )' + COOKIE_NAME + '=([^;]+)'));
        const cookieVal = match ? match[2] : null;
        if (cookieVal && isSupportedCountry(cookieVal)) return true;

        return false;
    },

    /**
     * Clear the country selection (useful for "change country" button).
     */
    clear() {
        if (typeof window !== 'undefined') {
            try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
            document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
        }
    }
};
