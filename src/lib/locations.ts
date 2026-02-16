export type CountryCode =
    | 'HN' // Central America
    | 'GT' | 'SV' | 'MX' | 'CO'
    | 'NI' | 'CR' | 'PA'
    | 'EC' | 'PE' | 'BO' | 'CL' | 'AR' | 'UY' | 'PY' | 'BR' | 'VE'
    | 'DO' | 'CU' // Caribbean
    | 'US' | 'CA' | 'ES'; // Global

export type RegionType = 'department' | 'state' | 'province' | 'region';

export interface CountryConfig {
    code: CountryCode;
    name: string;
    flag: string;            // Emoji flag
    currency: string;        // ISO 4217
    phonePrefix: string;     // International prefix
    regionType: RegionType;
    regionLabel: string;     // UI Label (Spanish for now)
    coordinates: {           // Map Focus (Capital/Center)
        lat: number;
        lng: number;
        zoom: number;
    };
    mainCity: string;        // Name of the capital or main city for the map label
    states: { name: string; cities?: string[] }[];
}

export const DEFAULT_COUNTRY: CountryCode = 'HN';

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
    // CENTRAL AMERICA
    HN: {
        code: 'HN', name: 'Honduras', flag: '🇭🇳', currency: 'HNL', phonePrefix: '+504', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: 14.0818, lng: -87.2068, zoom: 7 }, // Tegucigalpa
        mainCity: 'Tegucigalpa',
        states: [
            { name: 'Atlántida', cities: ['La Ceiba'] }, { name: 'Choluteca', cities: ['Choluteca'] },
            { name: 'Colón', cities: ['Trujillo'] }, { name: 'Comayagua', cities: ['Comayagua'] },
            { name: 'Copán', cities: ['Santa Rosa de Copán'] }, { name: 'Cortés', cities: ['San Pedro Sula'] },
            { name: 'El Paraíso', cities: ['Yuscarán'] }, { name: 'Francisco Morazán', cities: ['Tegucigalpa'] },
            { name: 'Gracias a Dios', cities: ['Puerto Lempira'] }, { name: 'Intibucá', cities: ['La Esperanza'] },
            { name: 'Islas de la Bahía', cities: ['Roatán'] }, { name: 'La Paz', cities: ['La Paz'] },
            { name: 'Lempira', cities: ['Gracias'] }, { name: 'Ocotepeque', cities: ['Ocotepeque'] },
            { name: 'Olancho', cities: ['Juticalpa'] }, { name: 'Santa Bárbara', cities: ['Santa Bárbara'] },
            { name: 'Valle', cities: ['Nacaome'] }, { name: 'Yoro', cities: ['Yoro'] }
        ]
    },
    GT: {
        code: 'GT', name: 'Guatemala', flag: '🇬🇹', currency: 'GTQ', phonePrefix: '+502', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: 14.6349, lng: -90.5069, zoom: 7 }, // Guatemala City
        mainCity: 'Ciudad de Guatemala',
        states: [
            { name: 'Alta Verapaz' }, { name: 'Baja Verapaz' }, { name: 'Chimaltenango' }, { name: 'Chiquimula' },
            { name: 'El Progreso' }, { name: 'Escuintla' }, { name: 'Guatemala' }, { name: 'Huehuetenango' },
            { name: 'Izabal' }, { name: 'Jalapa' }, { name: 'Jutiapa' }, { name: 'Petén' },
            { name: 'Quetzaltenango' }, { name: 'Quiché' }, { name: 'Retalhuleu' }, { name: 'Sacatepéquez' },
            { name: 'San Marcos' }, { name: 'Santa Rosa' }, { name: 'Sololá' }, { name: 'Suchitepéquez' },
            { name: 'Totonicapán' }, { name: 'Zacapa' }
        ]
    },
    SV: {
        code: 'SV', name: 'El Salvador', flag: '🇸🇻', currency: 'USD', phonePrefix: '+503', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: 13.6929, lng: -89.2182, zoom: 8 }, // San Salvador
        mainCity: 'San Salvador',
        states: [
            { name: 'Ahuachapán' }, { name: 'Cabañas' }, { name: 'Chalatenango' }, { name: 'Cuscatlán' },
            { name: 'La Libertad' }, { name: 'La Paz' }, { name: 'La Unión' }, { name: 'Morazán' },
            { name: 'San Miguel' }, { name: 'San Salvador' }, { name: 'San Vicente' }, { name: 'Santa Ana' },
            { name: 'Sonsonate' }, { name: 'Usulután' }
        ]
    },
    NI: {
        code: 'NI', name: 'Nicaragua', flag: '🇳🇮', currency: 'NIO', phonePrefix: '+505', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: 12.1150, lng: -86.2362, zoom: 7 }, // Managua
        mainCity: 'Managua',
        states: [
            { name: 'Boaco' }, { name: 'Carazo' }, { name: 'Chinandega' }, { name: 'Chontales' },
            { name: 'Estelí' }, { name: 'Granada' }, { name: 'Jinotega' }, { name: 'León' },
            { name: 'Madriz' }, { name: 'Managua' }, { name: 'Masaya' }, { name: 'Matagalpa' },
            { name: 'Nueva Segovia' }, { name: 'Rivas' }, { name: 'Río San Juan' },
            { name: 'Región Autónoma de la Costa Caribe Norte' }, { name: 'Región Autónoma de la Costa Caribe Sur' }
        ]
    },
    CR: {
        code: 'CR', name: 'Costa Rica', flag: '🇨🇷', currency: 'CRC', phonePrefix: '+506', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 9.9281, lng: -84.0907, zoom: 7 }, // San Jose
        mainCity: 'San José',
        states: [
            { name: 'San José' }, { name: 'Alajuela' }, { name: 'Cartago' }, { name: 'Heredia' },
            { name: 'Guanacaste' }, { name: 'Puntarenas' }, { name: 'Limón' }
        ]
    },
    PA: {
        code: 'PA', name: 'Panamá', flag: '🇵🇦', currency: 'PAB', phonePrefix: '+507', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 8.9824, lng: -79.5199, zoom: 7 }, // Panama City
        mainCity: 'Ciudad de Panamá',
        states: [
            { name: 'Bocas del Toro' }, { name: 'Coclé' }, { name: 'Colón' }, { name: 'Chiriquí' },
            { name: 'Darién' }, { name: 'Herrera' }, { name: 'Los Santos' }, { name: 'Panamá' },
            { name: 'Veraguas' }, { name: 'Panamá Oeste' }
        ]
    },

    // NORTH AMERICA (LATAM)
    MX: {
        code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN', phonePrefix: '+52', regionType: 'state', regionLabel: 'Estado',
        coordinates: { lat: 19.4326, lng: -99.1332, zoom: 5 }, // Mexico City (Broad Zoom)
        mainCity: 'Ciudad de México',
        states: [
            { name: 'Aguascalientes' }, { name: 'Baja California' }, { name: 'Baja California Sur' }, { name: 'Campeche' },
            { name: 'Chiapas' }, { name: 'Chihuahua' }, { name: 'Ciudad de México' }, { name: 'Coahuila' },
            { name: 'Colima' }, { name: 'Durango' }, { name: 'Guanajuato' }, { name: 'Guerrero' },
            { name: 'Hidalgo' }, { name: 'Jalisco' }, { name: 'México' }, { name: 'Michoacán' },
            { name: 'Morelos' }, { name: 'Nayarit' }, { name: 'Nuevo León' }, { name: 'Oaxaca' },
            { name: 'Puebla' }, { name: 'Querétaro' }, { name: 'Quintana Roo' }, { name: 'San Luis Potosí' },
            { name: 'Sinaloa' }, { name: 'Sonora' }, { name: 'Tabasco' }, { name: 'Tamaulipas' },
            { name: 'Tlaxcala' }, { name: 'Veracruz' }, { name: 'Yucatán' }, { name: 'Zacatecas' }
        ]
    },

    // SOUTH AMERICA
    CO: {
        code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP', phonePrefix: '+57', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: 4.7110, lng: -74.0721, zoom: 6 }, // Bogota
        mainCity: 'Bogotá',
        states: [{ name: 'Amazonas' }, { name: 'Antioquia' }, { name: 'Arauca' }, { name: 'Atlántico' }, { name: 'Bolívar' }, { name: 'Boyacá' }, { name: 'Caldas' }, { name: 'Caquetá' }, { name: 'Casanare' }, { name: 'Cauca' }, { name: 'Cesar' }, { name: 'Chocó' }, { name: 'Córdoba' }, { name: 'Cundinamarca' }, { name: 'Guainía' }, { name: 'Guaviare' }, { name: 'Huila' }, { name: 'La Guajira' }, { name: 'Magdalena' }, { name: 'Meta' }, { name: 'Nariño' }, { name: 'Norte de Santander' }, { name: 'Putumayo' }, { name: 'Quindío' }, { name: 'Risaralda' }, { name: 'San Andrés y Providencia' }, { name: 'Santander' }, { name: 'Sucre' }, { name: 'Tolima' }, { name: 'Valle del Cauca' }, { name: 'Vaupés' }, { name: 'Vichada' }]
    },
    VE: {
        code: 'VE', name: 'Venezuela', flag: '🇻🇪', currency: 'VES', phonePrefix: '+58', regionType: 'state', regionLabel: 'Estado',
        coordinates: { lat: 10.4806, lng: -66.9036, zoom: 6 }, // Caracas
        mainCity: 'Caracas',
        states: [{ name: 'Distrito Capital' }, { name: 'Zulia' }, { name: 'Miranda' }, { name: 'Carabobo' }, { name: 'Lara' }, { name: 'Aragua' }, { name: 'Anzoátegui' }, { name: 'Bolívar' }, { name: 'Táchira' }, { name: 'Falcón' }]
    },
    EC: {
        code: 'EC', name: 'Ecuador', flag: '🇪🇨', currency: 'USD', phonePrefix: '+593', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: -0.1807, lng: -78.4678, zoom: 7 }, // Quito
        mainCity: 'Quito',
        states: [{ name: 'Azuay' }, { name: 'Bolívar' }, { name: 'Cañar' }, { name: 'Carchi' }, { name: 'Chimborazo' }, { name: 'Cotopaxi' }, { name: 'El Oro' }, { name: 'Esmeraldas' }, { name: 'Galápagos' }, { name: 'Guayas' }, { name: 'Imbabura' }, { name: 'Loja' }, { name: 'Los Ríos' }, { name: 'Manabí' }, { name: 'Morona Santiago' }, { name: 'Napo' }, { name: 'Orellana' }, { name: 'Pastaza' }, { name: 'Pichincha' }, { name: 'Santa Elena' }, { name: 'Santo Domingo' }, { name: 'Sucumbíos' }, { name: 'Tungurahua' }, { name: 'Zamora Chinchipe' }]
    },
    PE: {
        code: 'PE', name: 'Perú', flag: '🇵🇪', currency: 'PEN', phonePrefix: '+51', regionType: 'region', regionLabel: 'Región',
        coordinates: { lat: -12.0464, lng: -77.0428, zoom: 5 }, // Lima
        mainCity: 'Lima',
        states: [{ name: 'Amazonas' }, { name: 'Áncash' }, { name: 'Apurímac' }, { name: 'Arequipa' }, { name: 'Ayacucho' }, { name: 'Cajamarca' }, { name: 'Callao' }, { name: 'Cusco' }, { name: 'Huancavelica' }, { name: 'Huánuco' }, { name: 'Ica' }, { name: 'Junín' }, { name: 'La Libertad' }, { name: 'Lambayeque' }, { name: 'Lima' }, { name: 'Loreto' }, { name: 'Madre de Dios' }, { name: 'Moquegua' }, { name: 'Pasco' }, { name: 'Piura' }, { name: 'Puno' }, { name: 'San Martín' }, { name: 'Tacna' }, { name: 'Tumbes' }, { name: 'Ucayali' }]
    },
    BO: {
        code: 'BO', name: 'Bolivia', flag: '🇧🇴', currency: 'BOB', phonePrefix: '+591', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: -16.5000, lng: -68.1500, zoom: 6 }, // La Paz
        mainCity: 'La Paz',
        states: [{ name: 'Beni' }, { name: 'Chuquisaca' }, { name: 'Cochabamba' }, { name: 'La Paz' }, { name: 'Oruro' }, { name: 'Pando' }, { name: 'Potosí' }, { name: 'Santa Cruz' }, { name: 'Tarija' }]
    },
    CL: {
        code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP', phonePrefix: '+56', regionType: 'region', regionLabel: 'Región',
        coordinates: { lat: -33.4489, lng: -70.6693, zoom: 4 }, // Santiago (Long country)
        mainCity: 'Santiago',
        states: [{ name: 'Arica y Parinacota' }, { name: 'Tarapacá' }, { name: 'Antofagasta' }, { name: 'Atacama' }, { name: 'Coquimbo' }, { name: 'Valparaíso' }, { name: 'Metropolitana' }, { name: 'O\'Higgins' }, { name: 'Maule' }, { name: 'Ñuble' }, { name: 'Biobío' }, { name: 'La Araucanía' }, { name: 'Los Ríos' }, { name: 'Los Lagos' }, { name: 'Aysén' }, { name: 'Magallanes' }]
    },
    AR: {
        code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', phonePrefix: '+54', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: -34.6037, lng: -58.3816, zoom: 4 }, // Buenos Aires
        mainCity: 'Buenos Aires',
        states: [{ name: 'Buenos Aires' }, { name: 'CABA' }, { name: 'Catamarca' }, { name: 'Chaco' }, { name: 'Chubut' }, { name: 'Córdoba' }, { name: 'Corrientes' }, { name: 'Entre Ríos' }, { name: 'Formosa' }, { name: 'Jujuy' }, { name: 'La Pampa' }, { name: 'La Rioja' }, { name: 'Mendoza' }, { name: 'Misiones' }, { name: 'Neuquén' }, { name: 'Río Negro' }, { name: 'Salta' }, { name: 'San Juan' }, { name: 'San Luis' }, { name: 'Santa Cruz' }, { name: 'Santa Fe' }, { name: 'Santiago del Estero' }, { name: 'Tierra del Fuego' }, { name: 'Tucumán' }]
    },
    UY: {
        code: 'UY', name: 'Uruguay', flag: '🇺🇾', currency: 'UYU', phonePrefix: '+598', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: -34.9011, lng: -56.1645, zoom: 7 }, // Montevideo
        mainCity: 'Montevideo',
        states: [{ name: 'Artigas' }, { name: 'Canelones' }, { name: 'Cerro Largo' }, { name: 'Colonia' }, { name: 'Durazno' }, { name: 'Flores' }, { name: 'Florida' }, { name: 'Lavalleja' }, { name: 'Maldonado' }, { name: 'Montevideo' }, { name: 'Paysandú' }, { name: 'Río Negro' }, { name: 'Rivera' }, { name: 'Rocha' }, { name: 'Salto' }, { name: 'San José' }, { name: 'Soriano' }, { name: 'Tacuarembó' }, { name: 'Treinta y Tres' }]
    },
    PY: {
        code: 'PY', name: 'Paraguay', flag: '🇵🇾', currency: 'PYG', phonePrefix: '+595', regionType: 'department', regionLabel: 'Departamento',
        coordinates: { lat: -25.2637, lng: -57.5759, zoom: 6 }, // Asuncion
        mainCity: 'Asunción',
        states: [{ name: 'Asunción' }, { name: 'Concepción' }, { name: 'San Pedro' }, { name: 'Cordillera' }, { name: 'Guairá' }, { name: 'Caaguazú' }, { name: 'Caazapá' }, { name: 'Itapúa' }, { name: 'Misiones' }, { name: 'Paraguarí' }, { name: 'Alto Paraná' }, { name: 'Central' }, { name: 'Ñeembucú' }, { name: 'Amambay' }, { name: 'Canindeyú' }, { name: 'Presidente Hayes' }, { name: 'Boquerón' }, { name: 'Alto Paraguay' }]
    },
    BR: {
        code: 'BR', name: 'Brasil', flag: '🇧🇷', currency: 'BRL', phonePrefix: '+55', regionType: 'state', regionLabel: 'Estado',
        coordinates: { lat: -15.8267, lng: -47.9218, zoom: 4 }, // Brasilia
        mainCity: 'Brasilia',
        states: [{ name: 'Acre' }, { name: 'Alagoas' }, { name: 'Amapá' }, { name: 'Amazonas' }, { name: 'Bahia' }, { name: 'Ceará' }, { name: 'Distrito Federal' }, { name: 'Espírito Santo' }, { name: 'Goiás' }, { name: 'Maranhão' }, { name: 'Mato Grosso' }, { name: 'Mato Grosso do Sul' }, { name: 'Minas Gerais' }, { name: 'Pará' }, { name: 'Paraíba' }, { name: 'Paraná' }, { name: 'Pernambuco' }, { name: 'Piauí' }, { name: 'Rio de Janeiro' }, { name: 'Rio Grande do Norte' }, { name: 'Rio Grande do Sul' }, { name: 'Rondônia' }, { name: 'Roraima' }, { name: 'Santa Catarina' }, { name: 'São Paulo' }, { name: 'Sergipe' }, { name: 'Tocantins' }]
    },

    // CARIBBEAN (BASIC)
    DO: {
        code: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴', currency: 'DOP', phonePrefix: '+1', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 18.4861, lng: -69.9312, zoom: 8 }, // Santo Domingo
        mainCity: 'Santo Domingo',
        states: [{ name: 'Santo Domingo' }, { name: 'Santiago' }, { name: 'La Altagracia' }, { name: 'La Romana' }, { name: 'Puerto Plata' }, { name: 'San Cristóbal' }, { name: 'San Pedro de Macorís' }, { name: 'La Vega' }, { name: 'Duarte' }]
    },
    CU: {
        code: 'CU', name: 'Cuba', flag: '🇨🇺', currency: 'CUP', phonePrefix: '+53', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 23.1136, lng: -82.3666, zoom: 6 }, // Havana
        mainCity: 'La Habana',
        states: [{ name: 'La Habana' }, { name: 'Santiago de Cuba' }, { name: 'Holguín' }, { name: 'Granma' }, { name: 'Villa Clara' }, { name: 'Matanzas' }, { name: 'Camagüey' }, { name: 'Pinar del Río' }]
    },

    // GLOBAL EXPANSION
    US: {
        code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', phonePrefix: '+1', regionType: 'state', regionLabel: 'Estado',
        coordinates: { lat: 38.9072, lng: -77.0369, zoom: 4 }, // DC
        mainCity: 'New York (Example)',
        states: [
            { name: 'Alabama' }, { name: 'Alaska' }, { name: 'Arizona' }, { name: 'Arkansas' }, { name: 'California' }, { name: 'Colorado' }, { name: 'Connecticut' }, { name: 'Delaware' }, { name: 'Florida' }, { name: 'Georgia' }, { name: 'Hawaii' }, { name: 'Idaho' }, { name: 'Illinois' }, { name: 'Indiana' }, { name: 'Iowa' }, { name: 'Kansas' }, { name: 'Kentucky' }, { name: 'Louisiana' }, { name: 'Maine' }, { name: 'Maryland' }, { name: 'Massachusetts' }, { name: 'Michigan' }, { name: 'Minnesota' }, { name: 'Mississippi' }, { name: 'Missouri' }, { name: 'Montana' }, { name: 'Nebraska' }, { name: 'Nevada' }, { name: 'New Hampshire' }, { name: 'New Jersey' }, { name: 'New Mexico' }, { name: 'New York' }, { name: 'North Carolina' }, { name: 'North Dakota' }, { name: 'Ohio' }, { name: 'Oklahoma' }, { name: 'Oregon' }, { name: 'Pennsylvania' }, { name: 'Rhode Island' }, { name: 'South Carolina' }, { name: 'South Dakota' }, { name: 'Tennessee' }, { name: 'Texas' }, { name: 'Utah' }, { name: 'Vermont' }, { name: 'Virginia' }, { name: 'Washington' }, { name: 'West Virginia' }, { name: 'Wisconsin' }, { name: 'Wyoming' }
        ]
    },
    CA: {
        code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', phonePrefix: '+1', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 45.4215, lng: -75.6972, zoom: 4 }, // Ottawa
        mainCity: 'Ottawa',
        states: [
            { name: 'Alberta' }, { name: 'British Columbia' }, { name: 'Manitoba' }, { name: 'New Brunswick' }, { name: 'Newfoundland and Labrador' }, { name: 'Nova Scotia' }, { name: 'Ontario' }, { name: 'Prince Edward Island' }, { name: 'Quebec' }, { name: 'Saskatchewan' }
        ]
    },
    ES: {
        code: 'ES', name: 'España', flag: '🇪🇸', currency: 'EUR', phonePrefix: '+34', regionType: 'province', regionLabel: 'Provincia',
        coordinates: { lat: 40.4168, lng: -3.7038, zoom: 6 }, // Madrid
        mainCity: 'Madrid',
        states: [
            { name: 'Álava' }, { name: 'Albacete' }, { name: 'Alicante' }, { name: 'Almería' }, { name: 'Asturias' }, { name: 'Ávila' }, { name: 'Badajoz' }, { name: 'Barcelona' }, { name: 'Burgos' }, { name: 'Cáceres' }, { name: 'Cádiz' }, { name: 'Cantabria' }, { name: 'Castellón' }, { name: 'Ciudad Real' }, { name: 'Córdoba' }, { name: 'Cuenca' }, { name: 'Gerona' }, { name: 'Granada' }, { name: 'Guadalajara' }, { name: 'Guipúzcoa' }, { name: 'Huelva' }, { name: 'Huesca' }, { name: 'Islas Baleares' }, { name: 'Jaén' }, { name: 'La Coruña' }, { name: 'La Rioja' }, { name: 'Las Palmas' }, { name: 'León' }, { name: 'Lérida' }, { name: 'Lugo' }, { name: 'Madrid' }, { name: 'Málaga' }, { name: 'Murcia' }, { name: 'Navarra' }, { name: 'Orense' }, { name: 'Palencia' }, { name: 'Pontevedra' }, { name: 'Salamanca' }, { name: 'Santa Cruz de Tenerife' }, { name: 'Segovia' }, { name: 'Sevilla' }, { name: 'Soria' }, { name: 'Tarragona' }, { name: 'Teruel' }, { name: 'Toledo' }, { name: 'Valencia' }, { name: 'Valladolid' }, { name: 'Vizcaya' }, { name: 'Zamora' }, { name: 'Zaragoza' }
        ]
    },
};

export function getCountryConfig(code: CountryCode): CountryConfig {
    return COUNTRIES[code] || COUNTRIES[DEFAULT_COUNTRY];
}

export function isSupportedCountry(code: string): code is CountryCode {
    return code in COUNTRIES;
}
