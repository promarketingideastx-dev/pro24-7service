export const TAXONOMY = {
    // =========================================
    // PILAR 1: ARTE Y DISEÑO
    // =========================================
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
                    'Menús (diseño)',
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
    },

    // =========================================
    // PILAR 2: SERVICIOS GENERALES
    // =========================================
    'general_services': {
        id: 'general_services',
        label: { es: 'Servicios Generales', en: 'General Services', pt: 'Serviços Gerais' },
        subcategories: [
            {
                id: 'cleaning',
                label: { es: 'Limpieza', en: 'Cleaning', pt: 'Limpeza' },
                specialties: ['Limpieza de Hogar', 'Limpieza de Oficinas', 'Limpieza Post-obra', 'Lavado de Vehículos']
            },
            {
                id: 'handyman',
                label: { es: 'Handyman / Montaje', en: 'Handyman', pt: 'Marido de Aluguel' },
                specialties: ['Montaje de muebles', 'Reparaciones menores', 'Instalación de cuadros/TV', 'Cortinas/Persianas']
            },
            {
                id: 'plumbing',
                label: { es: 'Plomería', en: 'Plumbing', pt: 'Encanamento' },
                specialties: ['Fugas de agua', 'Instalación de grifos', 'Destape de drenajes', 'Reparación de inodoros', 'Bombas de agua']
            },
            {
                id: 'electrical',
                label: { es: 'Electricidad', en: 'Electrical', pt: 'Elétrica' },
                specialties: ['Instalación de lámparas', 'Reparación de cortocircuitos', 'Cambio de tomacorrientes', 'Cableado estructurado']
            },
            {
                id: 'painting',
                label: { es: 'Pintura', en: 'Painting', pt: 'Pintura' },
                specialties: ['Pintura de interiores', 'Pintura de exteriores', 'Impermeabilización', 'Resanado de paredes']
            },
            {
                id: 'hvac',
                label: { es: 'Clima / Aire Acond.', en: 'HVAC', pt: 'Ar Condicionado' },
                specialties: ['Instalación A/C', 'Mantenimiento preventivo', 'Reparación y carga de gas', 'Ventilación']
            },
            {
                id: 'gardening',
                label: { es: 'Jardinería', en: 'Gardening', pt: 'Jardinagem' },
                specialties: ['Corte de césped', 'Poda de árboles', 'Diseño de jardines', 'Fumigación']
            },
            {
                id: 'locksmith',
                label: { es: 'Cerrajería', en: 'Locksmith', pt: 'Chaveiro' },
                specialties: ['Apertura de puertas', 'Cambio de chapas', 'Cerrajería automotriz', 'Duplicados']
            },
            {
                id: 'moving',
                label: { es: 'Mudanzas', en: 'Moving', pt: 'Mudanças' },
                specialties: ['Fletes locales', 'Mudanza completa', 'Embalaje y protección', 'Transporte de carga']
            },
            {
                id: 'shoe_repair',
                label: { es: 'Zapatería', en: 'Shoe Repair', pt: 'Sapataria' },
                specialties: ['Cambio de suela', 'Reparación de tacón', 'Costura / pegado', 'Restauración (cuero/gamuza)', 'Limpieza profunda']
            },
            {
                id: 'auto_mechanic',
                label: { es: 'Mecánica Automotriz', en: 'Auto Mechanic', pt: 'Mecânica Auto' },
                specialties: ['Diagnóstico (scanner)', 'Cambio de aceite / filtros', 'Frenos', 'Motor', 'Aire acondicionado', 'Emergencia / rescate']
            },
            {
                id: 'moto_mechanic',
                label: { es: 'Mecánica de Motos', en: 'Moto Mechanic', pt: 'Mecânica Moto' },
                specialties: ['Mantenimiento general', 'Frenos', 'Cadena / sprockets', 'Carburación / inyección', 'Llantas']
            }
        ]
    },

    // =========================================
    // PILAR 3: BELLEZA Y BIENESTAR
    // =========================================
    'beauty_wellness': {
        id: 'beauty_wellness',
        label: { es: 'Belleza y Bienestar', en: 'Beauty & Wellness', pt: 'Beleza e Bem-estar' },
        subcategories: [
            {
                id: 'hair',
                label: { es: 'Cabello', en: 'Hair', pt: 'Cabelo' },
                specialties: ['Corte de Dama', 'Corte de Caballero (Barbería)', 'Colorimetría/Tintes', 'Tratamientos capilares', 'Peinados']
            },
            {
                id: 'nails',
                label: { es: 'Uñas', en: 'Nails', pt: 'Unhas' },
                specialties: ['Manicure', 'Pedicure', 'Uñas acrílicas', 'Gel/Semipermanente']
            },
            {
                id: 'brows_lashes',
                label: { es: 'Cejas y Pestañas', en: 'Brows & Lashes', pt: 'Sobrancelhas e Cílios' },
                specialties: ['Lifting de pestañas', 'Microblading', 'Extensiones de pestañas', 'Laminado de cejas']
            },
            {
                id: 'hair_removal',
                label: { es: 'Depilación', en: 'Hair Removal', pt: 'Depilação' },
                specialties: ['Depilación con cera', 'Depilación con hilo', 'Depilación láser']
            },
            {
                id: 'makeup',
                label: { es: 'Maquillaje', en: 'Makeup', pt: 'Maquiagem' },
                specialties: ['Maquillaje social', 'Maquillaje de novia', 'Maquillaje artístico']
            },
            {
                id: 'skincare',
                label: { es: 'Facial / Skincare', en: 'Skincare', pt: 'Cuidados com a Pele' },
                specialties: ['Limpieza facial profunda', 'Hidratación', 'Tratamientos anti-edad']
            },
            {
                id: 'massage',
                label: { es: 'Masajes', en: 'Massage', pt: 'Massagem' },
                specialties: ['Masaje relajante', 'Masaje descontracturante', 'Masaje terapéutico', 'Drenaje linfático']
            }
        ]
    }
};

// ==========================================
// HELPERS
// ==========================================

export const getAllCategories = () => {
    return Object.values(TAXONOMY).flatMap(group => group.subcategories.map(sub => ({
        ...sub,
        groupLabel: group.label.es,
        groupId: group.id
    })));
};

export const getCategoryById = (id: string) => {
    for (const group of Object.values(TAXONOMY)) {
        const found = group.subcategories.find(s => s.id === id);
        if (found) return found;
    }
    return null;
};
