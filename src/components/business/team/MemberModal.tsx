// Componente extraído para validación (Team)
export const MemberModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden">
            {/* ... form ... */}
            <button className="w-full bg-[#14B8A6] hover:bg-[#0F9488] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_rgba(20,184,166,0.30)] flex items-center justify-center gap-2">
                Guardar
            </button>
        </div>
    </div>
);
