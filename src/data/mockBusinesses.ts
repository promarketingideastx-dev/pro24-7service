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
}

export const DEMO_BUSINESSES: BusinessMock[] = [
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
        description: 'Reparación de calzado y cuero.'
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
        description: 'Masajes relajantes y terapéuticos.'
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
        description: 'Sesiones de fotos y eventos.'
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
        description: 'Reparaciones de fugas 24/7.'
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
        description: 'Mecánica general y scanner.'
    }
];
