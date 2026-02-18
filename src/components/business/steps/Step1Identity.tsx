'use client';

export function Step1Identity({ data, update }: any) {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Comencemos por lo básico</h2>
                <p className="text-slate-400">¿Cómo se llama tu negocio o cómo te conocen tus clientes?</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Negocio / Profesional</label>
                    <input
                        type="text"
                        value={data.businessName}
                        onChange={(e) => update('businessName', e.target.value)}
                        placeholder="Ej. Soluciones Técnicas, Estudio Creativo..."
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Descripción Corta</label>
                    <textarea
                        rows={4}
                        value={data.description}
                        onChange={(e) => update('description', e.target.value)}
                        placeholder="Describe brevemente lo que haces. Ej: Ofrecemos servicios profesionales con calidad garantizada y atención personalizada..."
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-2 text-right">{data.description.length}/300 caracteres</p>
                </div>
            </div>
        </div>
    );
}
