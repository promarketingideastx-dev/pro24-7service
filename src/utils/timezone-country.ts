/**
 * Detects the user's country code based on their device's timezone.
 * Returns an ISO-2 country code (e.g., 'HN', 'US', 'MX', 'SV').
 * Defaults to 'HN' if the timezone cannot be confidently mapped.
 */
export function getCountryFromTimezone(): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';

        // A simplified map of common timezones in America to ISO-2 country codes
        const tzMap: Record<string, string> = {
            // Central America
            'America/Tegucigalpa': 'HN',
            'America/Guatemala': 'GT',
            'America/El_Salvador': 'SV',
            'America/Managua': 'NI',
            'America/Costa_Rica': 'CR',
            'America/Belize': 'BZ',
            'America/Panama': 'PA',

            // North America
            'America/Mexico_City': 'MX',
            'America/Monterrey': 'MX',
            'America/Mascota': 'MX',
            'America/Tijuana': 'MX',
            'America/Cancun': 'MX',
            'America/Hermosillo': 'MX',
            'America/Merida': 'MX',
            'America/Chihuahua': 'MX',
            'America/Ojinaga': 'MX',
            'America/Matamoros': 'MX',

            'America/New_York': 'US',
            'America/Chicago': 'US',
            'America/Denver': 'US',
            'America/Los_Angeles': 'US',
            'America/Phoenix': 'US',
            'America/Anchorage': 'US',
            'America/Honolulu': 'US',
            'America/Detroit': 'US',
            'America/Boise': 'US',

            'America/Toronto': 'CA',
            'America/Vancouver': 'CA',
            'America/Montreal': 'CA',
            'America/Edmonton': 'CA',
            'America/Winnipeg': 'CA',
            'America/Halifax': 'CA',

            // South America
            'America/Bogota': 'CO',
            'America/Lima': 'PE',
            'America/Guayaquil': 'EC',
            'America/Caracas': 'VE',
            'America/La_Paz': 'BO',
            'America/Santiago': 'CL',
            'America/Asuncion': 'PY',
            'America/Montevideo': 'UY',
            'America/Sao_Paulo': 'BR',
            'America/Bahia': 'BR',
            'America/Manaus': 'BR',
            'America/Fortaleza': 'BR',
            'America/Belem': 'BR',
            'America/Buenos_Aires': 'AR',
            'America/Cordoba': 'AR',
            'America/Rosario': 'AR',
            'America/Mendoza': 'AR',

            // Caribbean
            'America/Havana': 'CU',
            'America/Santo_Domingo': 'DO',
            'America/Puerto_Rico': 'PR',
            'America/Jamaica': 'JM',

            // Europe (Common expat locations for testing)
            'Europe/Madrid': 'ES',
            'Europe/Paris': 'FR',
            'Europe/London': 'GB',
            'Europe/Berlin': 'DE',
            'Europe/Rome': 'IT'
        };

        // 1. Check exact match
        if (tzMap[tz]) return tzMap[tz];

        // 2. Partial match fallback logic for complex regions
        if (tz.startsWith('America/')) {
            if (tz.includes('Argentina')) return 'AR';
            if (tz.includes('Indiana') || tz.includes('Kentucky') || tz.includes('North_Dakota')) return 'US';
            // Any other generic America/ tends to be unpredictable, but let's safely default to HN
            // for PRO24-7's main market intent if not found above.
        }

        if (tz.startsWith('US/')) return 'US';
        if (tz.startsWith('Canada/')) return 'CA';
        if (tz.startsWith('Brazil/')) return 'BR';
        if (tz.startsWith('Mexico/')) return 'MX';

    } catch (e) {
        // Fallback for extremely old browsers or SSR environments where Intl is not available
        console.warn("Timezone detection failed, defaulting to HN", e);
    }

    // Default to HN if we can't figure it out, to avoid breaking existing DB schemas (ISO-2 required)
    return 'HN';
}
