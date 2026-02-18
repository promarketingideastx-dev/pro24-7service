'use client';

import { useState } from 'react';
import { Search, Edit2, Phone, Mail, MapPin, Calendar, MessageSquare } from 'lucide-react';
import { Customer } from '@/services/customer.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomerListProps {
    customers: Customer[];
    onEdit: (customer: Customer) => void;
}

export default function CustomerList({ customers, onEdit }: CustomerListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Buscar por nombre, teléfono o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#151b2e] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all"
                />
            </div>

            {/* List Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">Cliente</div>
                <div className="col-span-3">Contacto</div>
                <div className="col-span-3">Última Interacción</div>
                <div className="col-span-2 text-right">Acciones</div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-[#151b2e]/50 rounded-xl border border-white/5 border-dashed">
                        {searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'No tienes clientes registrados aún.'}
                    </div>
                ) : (
                    filteredCustomers.map((customer) => (
                        <div
                            key={customer.id}
                            className="group bg-[#151b2e] hover:bg-[#1a2138] border border-white/5 rounded-xl p-4 transition-all hover:shadow-lg hover:border-white/10"
                        >
                            <div className="flex flex-col md:grid md:grid-cols-12 gap-4 items-center">

                                {/* Client Info */}
                                <div className="w-full md:col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/5 shadow-inner">
                                        <span className="font-bold text-white text-sm">
                                            {customer.fullName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-white truncate">{customer.fullName}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            {customer.address && (
                                                <span className="flex items-center gap-1 truncate max-w-[150px]">
                                                    <MapPin className="w-3 h-3" /> {customer.address}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Contact */}
                                <div className="w-full md:col-span-3 flex flex-col gap-1 text-sm">
                                    {customer.phone && (
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Phone className="w-3 h-3 text-slate-500" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Mail className="w-3 h-3 text-slate-500" />
                                            <span className="truncate">{customer.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Last Interaction */}
                                <div className="w-full md:col-span-3 text-sm text-slate-400 flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-brand-neon-cyan/50" />
                                    <span>
                                        {customer.lastInteractionAt ? (
                                            format(customer.lastInteractionAt.toDate(), "d 'de' MMM, yyyy", { locale: es })
                                        ) : (
                                            'Sin actividad reciente'
                                        )}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="w-full md:col-span-2 flex justify-end gap-2 mt-2 md:mt-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onEdit(customer)}
                                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                        title="Editar Cliente"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => {/* View Details / History - Phase 3 */ }}
                                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-brand-neon-cyan transition-colors"
                                        title="Ver Historial (Próximamente)"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
