export type Specialty = string;

export type Subcategory = {
    id: string;
    name: string;
    icon?: string;
    specialties: Specialty[];
    requiresWorkshopMode?: boolean; // For mechanic services
};

export type Category = {
    id: string;
    name: string;
    icon: string;
    defaultImage: string;
    subcategories: Subcategory[];
};

export const CATEGORIES: Category[] = [
    {
        id: 'generales',
        name: 'Servicios Generales',
        icon: '🛠️',
        defaultImage: 'https://images.unsplash.com/photo-1581578731548-c64695ce6958?auto=format&fit=crop&w=800&q=80',
        subcategories: [
            {
                id: 'limpieza',
                name: 'Limpieza',
                icon: '✨',
                specialties: ['Limpieza Profunda', 'Hogar y Oficinas', 'Lavado de Alfombras', 'Limpieza de Vidrios', 'Post-Construcción']
            },
            {
                id: 'handyman',
                name: 'Handyman y montaje',
                icon: '🔨',
                specialties: ['Montaje de Muebles', 'Reparaciones Menores', 'Instalación de Cuadros/Soportes', 'Resanes y Parches']
            },
            {
                id: 'plomeria',
                name: 'Plomería',
                icon: '💧',
                specialties: ['Fugas de Agua/Gas', 'Destape de Drenajes', 'Instalación de Calentadores', 'Grifería y Sanitarios']
            },
            {
                id: 'electricidad',
                name: 'Electricidad',
                icon: '⚡',
                specialties: ['Cortocircuitos', 'Instalación de Lámparas', 'Tableros de Carga', 'Cableado Estructurado']
            },
            {
                id: 'pintura',
                name: 'Pintura',
                icon: '🎨',
                specialties: ['Interiores', 'Exteriores', 'Impermeabilización', 'Acabados Texturizados']
            },
            {
                id: 'clima',
                name: 'Clima y ventilación (A/C)',
                icon: '❄️',
                specialties: ['Instalación de A/C', 'Mantenimiento Preventivo', 'Recarga de Gas', 'Reparación de Compresores']
            },
            {
                id: 'jardin',
                name: 'Jardín y exteriores',
                icon: '🌿',
                specialties: ['Poda de Césped', 'Diseño de Paisajismo', 'Sistemas de Riego', 'Control de Plagas']
            },
            {
                id: 'cerrajeria',
                name: 'Cerrajería y seguridad',
                icon: '🔑',
                specialties: ['Apertura de Puertas', 'Cambio de Guardas', 'Cámaras de Seguridad', 'Cerraduras Digitales']
            },
            {
                id: 'mudanzas',
                name: 'Mudanzas y transporte',
                icon: '🚛',
                specialties: ['Fletes Locales', 'Embalaje de Muebles', 'Cargas Pesadas', 'Desarmado/Armado']
            },
            {
                id: 'zapateria',
                name: 'Zapatería',
                icon: '👞',
                specialties: [
                    'Cambio de suela', 'Reparación de tacón', 'Costura / pegado',
                    'Pintura / retoque', 'Estirado de calzado', 'Cambio de plantilla',
                    'Reparación de cierres', 'Restauración (cuero/gamuza)',
                    'Limpieza profunda', 'Express / mismo día'
                ]
            },
            {
                id: 'mecanica_autos',
                name: 'Mecánica (Autos)',
                icon: '🚗',
                requiresWorkshopMode: true,
                specialties: [
                    'Diagnóstico (scanner)', 'Cambio de aceite / filtros', 'Frenos',
                    'Suspensión', 'Alineación/balanceo', 'Motor', 'Transmisión',
                    'Electricidad automotriz', 'Aire acondicionado', 'Batería / alternador',
                    'Llantas', 'Emergencia / rescate'
                ]
            },
            {
                id: 'mecanica_motos',
                name: 'Mecánica (Motos)',
                icon: '🏍️',
                requiresWorkshopMode: true,
                specialties: [
                    'Mantenimiento general', 'Frenos', 'Cadena / sprockets',
                    'Carburación / inyección', 'Electricidad', 'Suspensión',
                    'Llantas', 'Diagnóstico', 'Servicio a domicilio'
                ]
            }
        ]
    },
    {
        id: 'belleza',
        name: 'Belleza / Cuidado del Cuerpo',
        icon: '💅',
        defaultImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
        subcategories: [
            {
                id: 'cabello',
                name: 'Cabello',
                icon: '💇‍♀️',
                specialties: ['Corte', 'Color/Tinte', 'Balayage', 'Peinados', 'Tratamientos']
            },
            {
                id: 'unias',
                name: 'Uñas',
                icon: '💅',
                specialties: ['Manicura', 'Pedicura', 'Acrílico', 'Gelish', 'Nail Art']
            },
            {
                id: 'cejas',
                name: 'Cejas y pestañas',
                icon: '👁️',
                specialties: ['Microblading', 'Lash Lift', 'Extensión de pestañas', 'Perfilado']
            },
            {
                id: 'depilacion',
                name: 'Depilación',
                icon: '✨',
                specialties: ['Cera', 'Láser', 'Hilo']
            },
            {
                id: 'maquillaje',
                name: 'Maquillaje',
                icon: '💄',
                specialties: ['Social', 'Novias', 'Editorial', 'Automaquillaje']
            },
            {
                id: 'facial',
                name: 'Facial / skincare',
                icon: '🧖‍♀️',
                specialties: ['Limpieza Facial', 'Hidratación', 'Anti-edad', 'Peeling']
            },
            {
                id: 'masajes',
                name: 'Masajes',
                icon: '💆‍♂️',
                specialties: ['Relajante', 'Descontracturante', 'Tejido Profundo']
            }
        ]
    }
];

// Helpers for the Normalization Layer
export const taxonomy = {
    getCategoryById: (id: string) => CATEGORIES.find(c => c.id === id),
    getSubcategoryById: (catId: string, subId: string) => {
        const cat = CATEGORIES.find(c => c.id === catId);
        return cat?.subcategories.find(s => s.id === subId);
    },
    isValidSpecialty: (catId: string, subId: string, specialty: string) => {
        const sub = taxonomy.getSubcategoryById(catId, subId);
        return sub?.specialties.includes(specialty);
    }
};
