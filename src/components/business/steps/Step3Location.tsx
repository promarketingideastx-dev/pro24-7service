'use client';

export function Step3Location({ data, update }: any) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold mb-2">Ubicación y Modalidad</h2>
                <p className="text-slate-400">Define cómo y dónde entregarás tus servicios a los clientes.</p>
            </div>

            {/* 1. Modality Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { id: 'local', label: 'En mi Local', icon: '🏪', desc: 'El cliente viene a mí' },
                    { id: 'home', label: 'A Domicilio', icon: '🚚', desc: 'Yo voy donde el cliente' },
                    { id: 'both', label: 'Ambos', icon: '🔄', desc: 'Tengo local y también me movilizo' }
                ].map((option) => (
                    <div
                        key={option.id}
                        onClick={() => update('modality', option.id)}
                        className={`cursor-pointer p-6 rounded-xl border text-center transition-all ${data.modality === option.id
                            ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                            : 'bg-slate-800 border-white/5 hover:bg-slate-700/50'
                            }`}
                    >
                        <div className="text-4xl mb-4">{option.icon}</div>
                        <h3 className={`font-bold text-lg mb-1 ${data.modality === option.id ? 'text-white' : 'text-slate-200'}`}>
                            {option.label}
                        </h3>
                        <p className="text-sm text-slate-400">{option.desc}</p>
                    </div>
                ))}
            </div>

            {/* 2. Conditional Fields */}
            {/* 2. Conditional Fields */}
            {(data.modality === 'local' || data.modality === 'both') && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">📍 Dirección del Local / Taller</h3>

                    {/* Country Selector (For now Fixed/Simple) */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">País</label>
                        <select
                            value={data.country || 'HN'}
                            onChange={(e) => update('country', e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                        >
                            <option value="HN">Honduras 🇭🇳</option>
                            <option value="SV">El Salvador 🇸🇻</option>
                            <option value="GT">Guatemala 🇬🇹</option>
                        </select>
                    </div>

                    {/* City Input */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Ciudad</label>
                        <input
                            type="text"
                            value={data.city || ''}
                            onChange={(e) => update('city', e.target.value)}
                            placeholder="Ej. Ciudad Principal"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Dirección Exacta</label>
                        <textarea
                            value={data.address || ''}
                            onChange={(e) => update('address', e.target.value)}
                            placeholder="Ej. Colonia Palmira, Edificio X, local 4..."
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                        />
                    </div>
                </div>
            )}

            {(data.modality === 'home' || data.modality === 'both') && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500 bg-slate-800/50 p-6 rounded-xl border border-white/5 space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">🗺️ Zonas de Cobertura</h3>

                    {/* Country Selector (For Home Modality too) */}
                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">País Principal de Operación</label>
                        <select
                            value={data.country || 'HN'}
                            onChange={(e) => update('country', e.target.value)}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                        >
                            <option value="HN">Honduras 🇭🇳</option>
                            <option value="SV">El Salvador 🇸🇻</option>
                            <option value="GT">Guatemala 🇬🇹</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-sm text-slate-400 mb-1 block">Ciudad Base</label>
                        <input
                            type="text"
                            value={data.city || ''}
                            onChange={(e) => update('city', e.target.value)}
                            placeholder="Ej. Tegucigalpa"
                            className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <p className="text-sm text-slate-400">Escribe las zonas específicas donde ofreces servicio.</p>
                    <input
                        type="text"
                        placeholder="Ej. Todo el casco urbano, Valle de Ángeles..."
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            )}
        </div>
    );
}
