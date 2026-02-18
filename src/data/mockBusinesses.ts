import { MapPin, Camera, Wrench, Car, Footprints, Heart, User, Sparkles } from 'lucide-react';

export interface BusinessMock {
    id: string;
    name: string;
    category: string;
    subcategory: string; // This matches TAXONOMY subcategory.id or label
    tags: string[]; // Keywords for search (Specialties)
    lat: number;
    lng: number;
    icon: any;
    color: string;
    description: string;
    countryCode?: string; // Optional: To filter by selected country
}

// Deterministic Pseudo-Random Generator (to avoid hydration mismatches)
const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// Base Manual Businesses (Honduras Focus)
const MANUAL_BUSINESSES: BusinessMock[] = [
    {
        id: '1',
        name: 'Zapatería El Catracho',
        category: 'Servicios Generales',
        subcategory: 'Zapatería',
        tags: ['Cambio de suela', 'Reparación de tacón', 'Costura', 'Cuero', 'Limpieza'],
        lat: 15.505,
        lng: -88.025,
        icon: '👞',
        color: 'bg-orange-500',
        description: 'Reparación de calzado y cuero.',
        countryCode: 'HN'
    },
    {
        id: '2',
        name: 'Spa Relax SPS',
        category: 'Belleza / Cuidado',
        subcategory: 'Masajes',
        tags: ['Masaje relajante', 'Masaje terapéutico', 'Drenaje linfático', 'Stress'],
        lat: 15.504,
        lng: -88.024,
        icon: '💆‍♀️',
        color: 'bg-pink-500',
        description: 'Masajes relajantes y terapéuticos.',
        countryCode: 'HN'
    },
    {
        id: '3',
        name: 'Foto Estudio Pro',
        category: 'Arte y Diseño',
        subcategory: 'Fotografía',
        tags: ['Bodas', 'Eventos', 'Retrato', 'Sesión personal', 'Graduaciones'],
        lat: 15.506,
        lng: -88.026,
        icon: '📸',
        color: 'bg-purple-500',
        description: 'Sesiones de fotos y eventos.',
        countryCode: 'HN'
    },
    {
        id: '4',
        name: 'Plomería Rápida',
        category: 'Servicios Generales',
        subcategory: 'Plomería',
        tags: ['Fugas de agua', 'Grifos', 'Drenajes', 'Inodoros', 'Emergencia'],
        lat: 15.503,
        lng: -88.023,
        icon: '🔧',
        color: 'bg-blue-500',
        description: 'Reparaciones de fugas 24/7.',
        countryCode: 'HN'
    },
    {
        id: '5',
        name: 'Taller AutoFix',
        category: 'Servicios Generales',
        subcategory: 'Mecánica',
        tags: ['Cambio de aceite', 'Frenos', 'Motor', 'Aire acondicionado', 'Scanner'],
        lat: 15.502,
        lng: -88.027,
        icon: '🚗',
        color: 'bg-red-500',
        description: 'Mecánica general y scanner.',
        countryCode: 'HN'
    }
];

// Generate Test Data for ALL Countries
// This ensures we have data to test the map/list filtering for every country.
import { COUNTRIES } from '@/lib/locations';

const generateGlobalTestBusinesses = (): BusinessMock[] => {
    const generated: BusinessMock[] = [];
    let idCounter = 100;

    Object.values(COUNTRIES).forEach(country => {
        // Create 5 "City Hubs" to simulate distribution
        // Hub 0 is Capital, others are offsets
        const hubs = Array.from({ length: 5 }).map((_, i) => {
            // Seeded random offsets
            const latOffset = (seededRandom(country.code.charCodeAt(0) + i) - 0.5) * 2; // +/- 1 degree (~110km)
            const lngOffset = (seededRandom(country.code.charCodeAt(0) + i + 50) - 0.5) * 2;

            // Pick a mock state name if available
            const stateName = country.states[i % country.states.length]?.name || 'Central';

            return {
                lat: country.coordinates.lat + (i === 0 ? 0 : latOffset),
                lng: country.coordinates.lng + (i === 0 ? 0 : lngOffset),
                name: i === 0 ? country.mainCity : `${stateName} City`
            };
        });

        hubs.forEach((hub, hubIdx) => {
            // For each hub, generate the 3 core business types

            // 1. Mechanic
            generated.push({
                id: (idCounter++).toString(),
                name: `Mecánica ${country.name} ${hub.name} ${hubIdx + 1}`,
                category: 'Servicios Generales',
                subcategory: 'Mecánica',
                tags: ['Auto', 'Frenos', 'Motor', 'Aceite', 'Llantas'],
                lat: hub.lat + (seededRandom(idCounter) - 0.5) * 0.02, // Local scatter
                lng: hub.lng + (seededRandom(idCounter + 1) - 0.5) * 0.02,
                icon: '🚗',
                color: 'bg-red-500',
                description: `Taller mecánico profesional en ${hub.name}, ${country.name}.`,
                countryCode: country.code
            });

            // 2. Beauty/Style
            generated.push({
                id: (idCounter++).toString(),
                name: `Estudio ${hub.name} Style`,
                category: 'Belleza / Cuidado',
                subcategory: 'Estilismo',
                tags: ['Imagen', 'Consultoría', 'Facial', 'Estilo', 'Color'],
                lat: hub.lat + (seededRandom(idCounter) - 0.5) * 0.02,
                lng: hub.lng + (seededRandom(idCounter + 1) - 0.5) * 0.02,
                icon: '✨',
                color: 'bg-blue-500',
                description: `Centro de imagen y estilismo en ${hub.name}.`,
                countryCode: country.code
            });

            // 3. Tattoo/Art
            generated.push({
                id: (idCounter++).toString(),
                name: `Ink Studio ${hub.name}`,
                category: 'Arte y Diseño',
                subcategory: 'Tatuajes',
                tags: ['Tatuaje', 'Piercing', 'Arte', 'Diseño', 'Henna'],
                lat: hub.lat + (seededRandom(idCounter) - 0.5) * 0.02,
                lng: hub.lng + (seededRandom(idCounter + 1) - 0.5) * 0.02,
                icon: '🎨',
                color: 'bg-purple-500',
                description: `Estudio de arte corporal en ${hub.name}.`,
                countryCode: country.code
            });

            // 4. Extra: Plumber (to add variety)
            if (hubIdx % 2 === 0) {
                generated.push({
                    id: (idCounter++).toString(),
                    name: `Plomería ${hub.name} 24/7`,
                    category: 'Servicios Generales',
                    subcategory: 'Plomería',
                    tags: ['Fugas', 'Baños', 'Tuberías', 'Emergencia'],
                    lat: hub.lat + (seededRandom(idCounter) - 0.5) * 0.02,
                    lng: hub.lng + (seededRandom(idCounter + 1) - 0.5) * 0.02,
                    icon: '🔧',
                    color: 'bg-orange-500',
                    description: `Servicios de plomería urgente en ${hub.name}.`,
                    countryCode: country.code
                });
            }
        });
    });

    return generated;
};

export const DEMO_BUSINESSES: BusinessMock[] = [...MANUAL_BUSINESSES, ...generateGlobalTestBusinesses()];
