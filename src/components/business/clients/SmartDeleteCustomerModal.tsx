'use client';

import { useState } from 'react';
import { X, Archive, Loader2, Info } from 'lucide-react';
import { Customer, CustomerService } from '@/services/customer.service';
import { toast } from 'sonner';

interface SmartDeleteCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer: Customer | null;
    businessId: string;
}

export default function SmartDeleteCustomerModal({
    isOpen, onClose, onSuccess, customer, businessId
}: SmartDeleteCustomerModalProps) {
    const [isArchiving, setIsArchiving] = useState(false);

    const handleArchive = async () => {
        if (!customer) return;
        setIsArchiving(true);
        try {
            await CustomerService.archiveCustomer(businessId, customer);
            toast.success("Cliente ocultado correctamente");
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error archiving:', error);
            toast.error("Problemas al ocultar el cliente");
        } finally {
            setIsArchiving(false);
        }
    };

    if (!isOpen || !customer) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800">
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                        {isArchiving ? (
                            <Loader2 className="animate-spin" size={32} />
                        ) : (
                            <Archive size={32} />
                        )}
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        {isArchiving ? "Ocultando..." : `Ocultar a ${customer.fullName}`}
                    </h2>
                    
                    {!isArchiving && (
                        <p className="text-slate-500 text-sm px-2">
                            ¿Estás seguro de que deseas quitar a este cliente de tu lista visible?
                        </p>
                    )}
                </div>

                {!isArchiving && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left flex items-start gap-3">
                            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-blue-800 leading-relaxed">
                                <strong>Acción Segura:</strong> Sus citas previas y su historial se mantendrán <b>intactos</b> para tus reportes y métricas. Si el cliente vuelve a agendar, reaparecerá automáticamente en esta lista.
                            </p>
                        </div>

                        <button
                            onClick={handleArchive}
                            className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
                        >
                            Quitar de mi lista
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="w-full py-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
