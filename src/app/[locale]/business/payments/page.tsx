'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PaymentService } from '@/services/payment.service';
import { ServicePaymentDocument } from '@/types/firestore-schema';
import { useTranslations } from 'next-intl';

export default function BusinessPaymentsPage() {
    const t = useTranslations();
    const { user } = useAuth();
    const [payments, setPayments] = useState<ServicePaymentDocument[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = PaymentService.onPaymentsByBusiness(user.uid, (data) => {
            setPayments(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <div className="animate-spin w-8 h-8 rounded-full border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Pagos de Servicios</h1>
                <p className="text-slate-500 mt-1">
                    Historial independiente de pagos registrados por tus clientes.
                </p>
            </div>

            {payments.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <p className="text-slate-500 font-medium">Aún no tienes registros de pagos.</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Cliente</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Servicio</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Monto</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Estado</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Método</th>
                                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">Comprobante</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.map(payment => (
                                    <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-semibold text-slate-800">{payment.clientSnapshot.name}</p>
                                            {payment.clientSnapshot.email && (
                                                <p className="text-xs text-slate-500">{payment.clientSnapshot.email}</p>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600 line-clamp-1">{payment.serviceName}</td>
                                        <td className="p-4">
                                            <p className="font-bold text-slate-800">${payment.amount}</p>
                                            <p className="text-xs text-slate-400 uppercase">{payment.currency}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                payment.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                payment.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {payment.status === 'under_review' ? 'En Revisión' : payment.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-slate-500 capitalize">{payment.paymentMethod}</td>
                                        <td className="p-4">
                                            {payment.proofImageUrl && (
                                                <a 
                                                    href={payment.proofImageUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-block"
                                                >
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 relative bg-slate-100 hover:opacity-80 transition-opacity">
                                                        <img 
                                                            src={payment.proofImageUrl} 
                                                            alt="Comprobante" 
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
