'use client';

import { Instagram, Facebook, Globe, Phone, LinkIcon } from 'lucide-react';

// TikTok icon (Lucide doesn't have it, so we use a simple SVG)
const TikTokIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.53V6.79a4.85 4.85 0 0 1-1.01-.1z" />
    </svg>
);

const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
);

interface ContactField {
    key: string;
    label: string;
    placeholder: string;
    icon: React.ReactNode;
    prefix: string;
    color: string;
    hint?: string;
}

const fields: ContactField[] = [
    {
        key: 'phone',
        label: 'Teléfono / WhatsApp',
        placeholder: '+504 9999-9999',
        icon: <WhatsAppIcon />,
        prefix: '',
        color: 'text-green-400',
        hint: 'Con código de país. Este número se usará para reservaciones por WhatsApp.'
    },
    {
        key: 'website',
        label: 'Sitio Web',
        placeholder: 'https://sunegocio.com',
        icon: <Globe className="w-5 h-5" />,
        prefix: '',
        color: 'text-blue-400',
    },
    {
        key: 'instagram',
        label: 'Instagram',
        placeholder: 'sunegocio',
        icon: <Instagram className="w-5 h-5" />,
        prefix: '@',
        color: 'text-pink-400',
    },
    {
        key: 'facebook',
        label: 'Facebook',
        placeholder: 'sun.egocio',
        icon: <Facebook className="w-5 h-5" />,
        prefix: 'fb.com/',
        color: 'text-blue-500',
    },
    {
        key: 'tiktok',
        label: 'TikTok',
        placeholder: 'sunegocio',
        icon: <TikTokIcon />,
        prefix: '@',
        color: 'text-slate-100',
    },
];

export function Step4Contact({ data, update }: any) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">Contacto & Redes Sociales</h2>
                <p className="text-slate-400">
                    Esta información ayuda a tus clientes a encontrarte y contactarte fácilmente.
                    Solo el teléfono es obligatorio.
                </p>
            </div>

            <div className="space-y-4">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <span className={field.color}>{field.icon}</span>
                            {field.label}
                            {field.key === 'phone' && <span className="text-red-400 text-xs ml-1">*</span>}
                        </label>

                        <div className="flex items-center bg-slate-800 border border-white/10 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
                            {field.prefix && (
                                <span className="pl-4 text-slate-500 text-sm select-none whitespace-nowrap">
                                    {field.prefix}
                                </span>
                            )}
                            <input
                                type="text"
                                value={field.key === 'phone' || field.key === 'website'
                                    ? (data[field.key] || '')
                                    : (data.socialMedia?.[field.key] || '')
                                }
                                onChange={(e) => {
                                    if (field.key === 'phone' || field.key === 'website') {
                                        update(field.key, e.target.value);
                                    } else {
                                        const currentSocial = data.socialMedia || {};
                                        update('socialMedia', { ...currentSocial, [field.key]: e.target.value });
                                    }
                                }}
                                placeholder={field.placeholder}
                                className="flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-600"
                            />
                        </div>

                        {field.hint && (
                            <p className="text-xs text-slate-500 pl-1">{field.hint}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <LinkIcon className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-blue-300">¿Por qué pedimos esto?</p>
                    <p className="text-xs text-blue-400/70 mt-1">
                        Las redes sociales aparecerán en tu perfil público y en el panel de administración de PRO24/7,
                        lo que permite que los clientes te contacten directamente y que el equipo de soporte te ayude mejor.
                    </p>
                </div>
            </div>
        </div>
    );
}
