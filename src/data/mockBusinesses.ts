import { MapPin, Camera, Wrench, Car, Footprints, Heart, User, Sparkles } from 'lucide-react';

export interface BusinessMock {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    lat: number;
    lng: number;
    icon: any; // Lucide Icon component or string
    color: string;
    description: string;
}

export const DEMO_BUSINESSES = [
    {
        id: '1',
        name: 'Zapatería El Catracho',
        category: 'Servicios Generales',
        subcategory: 'Zapatería',
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
        lat: 15.502,
        lng: -88.027,
        icon: '🚗',
        color: 'bg-red-500',
        description: 'Mecánica general y scanner.'
    }
];
