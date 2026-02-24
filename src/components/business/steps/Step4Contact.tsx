'use client';

import { Globe, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

function WhatsAppIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.118 1.524 5.843L.072 23.928l6.224-1.433A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.74 9.74 0 01-4.966-1.358l-.357-.211-3.693.85.871-3.597-.231-.37A9.75 9.75 0 1112 21.75z" />
        </svg>
    );
}

function TikTokIcon() {
    return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.73a8.17 8.17 0 004.79 1.52V6.79a4.83 4.83 0 01-1.02-.1z" />
        </svg>
    );
}

export function Step4Contact({ data, update }: any) {
    const t = useTranslations('wizard.step4contact');

    const fields = [
        {
            key: 'phone',
            label: t('phoneLabel'),
            placeholder: '+504 9999-9999',
            icon: <WhatsAppIcon />,
            prefix: '',
            color: 'text-green-400',
            hint: t('phoneHint'),
        },
        {
            key: 'website',
            label: t('websiteLabel'),
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

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">{t('title')}</h2>
                <p className="text-slate-400">{t('subtitle')}</p>
            </div>

            <div className="space-y-4">
                {fields.map((field) => (
                    <div key={field.key} className="space-y-1">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                            <span className={field.color}>{field.icon}</span>
                            {field.label}
                            {field.key === 'phone' && <span className="text-red-400 text-xs ml-1">*</span>}
                        </label>

                        <div className="flex items-center bg-slate-800 border border-slate-200 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
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
                    <p className="text-sm font-medium text-blue-300">{t('whyTitle')}</p>
                    <p className="text-xs text-blue-400/70 mt-1">{t('whyDesc')}</p>
                </div>
            </div>
        </div>
    );
}
