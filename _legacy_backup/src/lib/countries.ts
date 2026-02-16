export type Country = {
  code: string;
  name: string;
  currency: string;
  unit: 'km' | 'mi';
  flag: string;
  phoneCode: string;
  lat: number;
  lng: number;
};

export const COUNTRIES: Country[] = [
  { code: 'MX', name: 'México', currency: 'MXN', unit: 'km', flag: '🇲🇽', phoneCode: '+52', lat: 19.4326, lng: -99.1332 },
  { code: 'HN', name: 'Honduras', currency: 'HNL', unit: 'km', flag: '🇭🇳', phoneCode: '+504', lat: 15.5049, lng: -88.0250 }, // San Pedro Sula
  { code: 'US', name: 'United States', currency: 'USD', unit: 'mi', flag: '🇺🇸', phoneCode: '+1', lat: 38.8951, lng: -77.0364 },
  { code: 'ES', name: 'España', currency: 'EUR', unit: 'km', flag: '🇪🇸', phoneCode: '+34', lat: 40.4168, lng: -3.7038 },
  { code: 'AR', name: 'Argentina', currency: 'ARS', unit: 'km', flag: '🇦🇷', phoneCode: '+54', lat: -34.6037, lng: -58.3816 },
  { code: 'BO', name: 'Bolivia', currency: 'BOB', unit: 'km', flag: '🇧🇴', phoneCode: '+591', lat: -16.5000, lng: -68.1500 },
  { code: 'BR', name: 'Brasil', currency: 'BRL', unit: 'km', flag: '🇧🇷', phoneCode: '+55', lat: -15.7801, lng: -47.9292 },
  { code: 'CL', name: 'Chile', currency: 'CLP', unit: 'km', flag: '🇨🇱', phoneCode: '+56', lat: -33.4489, lng: -70.6693 },
  { code: 'CO', name: 'Colombia', currency: 'COP', unit: 'km', flag: '🇨🇴', phoneCode: '+57', lat: 4.7110, lng: -74.0721 },
  { code: 'CR', name: 'Costa Rica', currency: 'CRC', unit: 'km', flag: '🇨🇷', phoneCode: '+506', lat: 9.9281, lng: -84.0907 },
  { code: 'CU', name: 'Cuba', currency: 'CUP', unit: 'km', flag: '🇨🇺', phoneCode: '+53', lat: 23.1136, lng: -82.3666 },
  { code: 'EC', name: 'Ecuador', currency: 'USD', unit: 'km', flag: '🇪🇨', phoneCode: '+593', lat: -0.1807, lng: -78.4678 },
  { code: 'SV', name: 'El Salvador', currency: 'USD', unit: 'km', flag: '🇸🇻', phoneCode: '+503', lat: 13.6929, lng: -89.2182 },
  { code: 'GT', name: 'Guatemala', currency: 'GTQ', unit: 'km', flag: '🇬🇹', phoneCode: '+502', lat: 14.6349, lng: -90.5069 },
  { code: 'NI', name: 'Nicaragua', currency: 'NIO', unit: 'km', flag: '🇳🇮', phoneCode: '+505', lat: 12.1150, lng: -86.2362 },
  { code: 'PA', name: 'Panamá', currency: 'PAB', unit: 'km', flag: '🇵🇦', phoneCode: '+507', lat: 8.9833, lng: -79.5167 },
  { code: 'PY', name: 'Paraguay', currency: 'PYG', unit: 'km', flag: '🇵🇾', phoneCode: '+595', lat: -25.2637, lng: -57.5759 },
  { code: 'PE', name: 'Perú', currency: 'PEN', unit: 'km', flag: '🇵🇪', phoneCode: '+51', lat: -12.0464, lng: -77.0428 },
  { code: 'PR', name: 'Puerto Rico', currency: 'USD', unit: 'mi', flag: '🇵🇷', phoneCode: '+1', lat: 18.4655, lng: -66.1057 },
  { code: 'DO', name: 'Rep. Dominicana', currency: 'DOP', unit: 'km', flag: '🇩🇴', phoneCode: '+1', lat: 18.4861, lng: -69.9312 },
  { code: 'UY', name: 'Uruguay', currency: 'UYU', unit: 'km', flag: '🇺🇾', phoneCode: '+598', lat: -34.9011, lng: -56.1645 },
  { code: 'VE', name: 'Venezuela', currency: 'VES', unit: 'km', flag: '🇻🇪', phoneCode: '+58', lat: 10.4806, lng: -66.8983 },
];
