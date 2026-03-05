import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
    locales: ['es', 'en', 'pt-BR'],
    defaultLocale: 'es',
    // 'always' = todas las rutas tienen prefijo /es/ o /pt-BR/
    // Esto garantiza que el routing de [locale] funcione correctamente
    localePrefix: 'always',
    // CRÍTICO: deshabilitar detección automática por header del browser
    // El locale se controla ÚNICAMENTE por la URL (el LanguageSwitcher)
    localeDetection: false,
});

export const config = {
    // Matcher: all routes except api, _next, static files
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
