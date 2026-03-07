// Componente extraído para validación (Services)
export const ServiceModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white border border-[#E6E8EC] w-full max-w-lg rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* ... form ... */}
             <button className="w-full py-3 bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(20,184,166,0.30)] flex items-center justify-center gap-2">
                Crear Servicio
             </button>
        </div>
    </div>
);
