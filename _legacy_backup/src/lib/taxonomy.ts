export const TAXONOMY = {
    'art_design': {
        id: 'art_design',
        label: { es: 'Arte y Diseño', en: 'Art & Design', pt: 'Arte e Design' },
        subcategories: [
            {
                id: 'photography',
                label: { es: 'Fotografía', en: 'Photography', pt: 'Fotografia' },
                specialties: [
                    'Retrato / Sesión personal',
                    'Fotografía de eventos',
                    'Fotografía de producto (e-commerce)',
                    'Fotografía gastronómica',
                    'Fotografía inmobiliaria / arquitectura',
                    'Fotografía corporativa',
                    'Fotografía familiar / niños',
                    'Fotografía de bodas',
                    'Fotografía con dron'
                ]
            },
            {
                id: 'videography',
                label: { es: 'Videografía', en: 'Videography', pt: 'Videografia' },
                specialties: [
                    'Video para eventos',
                    'Video corporativo',
                    'Video para redes (Reels/TikTok)',
                    'Video publicitario / comercial',
                    'Video inmobiliario',
                    'Videoclips musicales',
                    'Grabación con dron',
                    'Streaming / cobertura en vivo'
                ]
            },
            {
                id: 'editing',
                label: { es: 'Edición (Foto/Video)', en: 'Editing', pt: 'Edição' },
                specialties: [
                    'Edición de video (cortes + narrativa)',
                    'Colorización / color grading',
                    'Motion graphics / animación básica',
                    'Subtítulos (multi-idioma)',
                    'Edición para Reels/TikTok',
                    'Restauración de fotos',
                    'Retoque profesional (piel, limpieza)',
                    'Fotomontaje / composición',
                    'Optimización para redes (formatos)'
                ]
            },
            {
                id: 'graphic_design',
                label: { es: 'Diseño Gráfico', en: 'Graphic Design', pt: 'Design Gráfico' },
                specialties: [
                    'Logos / branding',
                    'Flyers / posters',
                    'Artes para redes sociales',
                    'Presentaciones (pitch/empresa)',
                    'Identidad visual completa',
                    'Diseño para impresión (tarjetas, banners)',
                    'Packaging / etiquetas',
                    'Mockups de producto'
                ]
            },
            {
                id: 'music',
                label: { es: 'Música', en: 'Music', pt: 'Música' },
                specialties: [
                    'DJ (eventos)',
                    'Producción musical',
                    'Mezcla y masterización',
                    'Grabación de voz',
                    'Beats / instrumentales',
                    'Música para videos (jingles/intro)',
                    'Sonido en vivo (setup básico)'
                ]
            },
            {
                id: 'dance',
                label: { es: 'Baile', en: 'Dance', pt: 'Dança' },
                specialties: [
                    'Clases (individual/grupal)',
                    'Coreografías para eventos',
                    'Baile urbano',
                    'Salsa / bachata / merengue',
                    'Folklor / tradicional',
                    'K-Pop / moderno',
                    'Pole Dance'
                ]
            },
            {
                id: 'crafts',
                label: { es: 'Manualidades', en: 'Crafts', pt: 'Artesanato' },
                specialties: [
                    'Decoración artesanal',
                    'Personalizados (tazas, camisetas, regalos)',
                    'Arreglos/centros de mesa',
                    'Piñatas / decoraciones',
                    'Bisutería / accesorios',
                    'Detalles para eventos'
                ]
            },
            {
                id: 'self_defense',
                label: { es: 'Defensa Personal', en: 'Self Defense', pt: 'Defesa Pessoal' },
                specialties: [
                    'Artes marciales (general)',
                    'Karate',
                    'Taekwondo',
                    'Jiu-Jitsu / MMA',
                    'Boxeo',
                    'Kickboxing',
                    'Yoga',
                    'Defensa personal para mujeres'
                ]
            }
        ]
    }
    // ... future categories
};

// ==========================================
// BACKWARD COMPATIBILITY ADAPTER
// ==========================================

// Helper to get emoji for category/subcategory
const getIcon = (id: string, isSub = false) => {
    // Basic mapping, can be improved or use default
    if (id === 'art_design') return '🎨';
    if (id === 'photography') return '📷';
    if (id === 'videography') return '🎥';
    if (id === 'music') return '🎵';
    return isSub ? '🔹' : '📁';
};

// Exportamos CATEGORIES con la estructura legacy completa (name, icon, specialties)
// @ts-ignore - Ignore type mismatches for legacy code
export const CATEGORIES = Object.values(TAXONOMY).map(cat => ({
    id: cat.id,
    name: cat.label.es, // Map to legacy 'name'
    icon: getIcon(cat.id),
    subcategories: cat.subcategories.map(sub => ({
        id: sub.id,
        name: sub.label.es, // Map to legacy 'name'
        icon: getIcon(sub.id, true),
        specialties: sub.specialties // Needed by ProfileEditor
    }))
}));

// Legacy helper object used by ProfileEditor
export const taxonomy = {
    getSubcategoryById: (mainId: string, subId: string) => {
        const cat = CATEGORIES.find(c => c.id === mainId);
        return cat?.subcategories.find(s => s.id === subId);
    },
    isValidSpecialty: (mainId: string, subId: string, specialty: string) => {
        const cat = CATEGORIES.find(c => c.id === mainId);
        const sub = cat?.subcategories.find(s => s.id === subId);
        return sub?.specialties.includes(specialty) && true;
    }
};
