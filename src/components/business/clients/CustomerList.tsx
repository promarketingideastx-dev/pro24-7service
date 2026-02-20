'use client';

import { useState } from 'react';
import { Search, Edit2, Phone, Mail, Trash2, TrendingUp, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Customer } from '@/services/customer.service';
import { CustomerStats } from '@/app/business/clients/page';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface CustomerListProps {
    customers: Customer[];
    appointmentStats: Record<string, CustomerStats>;
    onEdit: (customer: Customer) => void;
    onDelete: (customer: Customer) => void;
}

export default function CustomerList({ customers, appointmentStats, onEdit, onDelete }: CustomerListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const filteredCustomers = customers.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStats = (customer: Customer): CustomerStats => {
        const key = customer.id || `phone:${customer.phone}`;
        return appointmentStats[key] || { ltv: 0, lastVisit: null, nextAppointment: null, appointmentCount: 0 };
    };

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '—';
        return `L ${amount.toLocaleString('es-HN', { minimumFractionDigits: 0 })}`;
    };

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
                    className="w-full bg-[#1a1030] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-white/10 transition-all"
                />
            </div>

            {/* Stats Summary */}
            {customers.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[#1a1030] border border-white/5 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{customers.length}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Clientes</p>
                    </div>
                    <div className="bg-[#1a1030] border border-white/5 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-brand-neon-cyan">
                            L {Object.values(appointmentStats).reduce((sum, s) => sum + s.ltv, 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">LTV Total</p>
                    </div>
                    <div className="bg-[#1a1030] border border-white/5 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-green-400">
                            {Object.values(appointmentStats).reduce((sum, s) => sum + s.appointmentCount, 0)}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">Citas Totales</p>
                    </div>
                </div>
            )}

            {/* List Header (Desktop) */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-3">Cliente</div>
                <div className="col-span-2">Contacto</div>
                <div className="col-span-2">Última Visita</div>
                <div className="col-span-2">Próxima Cita</div>
                <div className="col-span-2 text-brand-neon-cyan">LTV</div>
                <div className="col-span-1 text-right">Acc.</div>
            </div>

            {/* List */}
            <div className="space-y-2">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-[#1a1030]/50 rounded-xl border border-white/5 border-dashed">
                        {searchTerm ? 'No se encontraron clientes con esa búsqueda.' : 'No tienes clientes registrados aún.'}
                    </div>
                ) : (
                    filteredCustomers.map((customer) => {
                        const stats = getStats(customer);
                        return (
                            <div
                                key={customer.id}
                                className="group bg-[#1a1030] hover:bg-[#1a2138] border border-white/5 rounded-xl p-4 transition-all hover:shadow-lg hover:border-white/10 cursor-pointer"
                                onClick={() => router.push(`/business/clients/${customer.id}`)}
                            >
                                <div className="flex flex-col md:grid md:grid-cols-12 gap-3 items-center">

                                    {/* Client Info */}
                                    <div className="w-full md:col-span-3 flex items-center gap-3">
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center border border-white/10 shadow-inner">
                                                <span className="font-bold text-white text-sm">
                                                    {customer.fullName.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            {stats.appointmentCount > 0 && (
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#1a1030] flex items-center justify-center">
                                                    <span className="text-[8px] font-bold text-black">{stats.appointmentCount}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white truncate group-hover:text-brand-neon-cyan transition-colors">{customer.fullName}</h3>
                                            {customer.tags?.includes('public_request') && (
                                                <span className="text-[10px] text-purple-400 font-medium">Reserva Online</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="w-full md:col-span-2 flex flex-col gap-1 text-sm">
                                        {customer.phone && (
                                            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                                                <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                                                <span>{customer.phone}</span>
                                            </div>
                                        )}
                                        {customer.email && (
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                                                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                                                <span className="truncate max-w-[120px]">{customer.email}</span>
                                            </div>
                                        )}
                                        {!customer.phone && !customer.email && (
                                            <span className="text-xs text-slate-600 italic">Sin contacto</span>
                                        )}
                                    </div>

                                    {/* Last Visit */}
                                    <div className="w-full md:col-span-2 text-xs text-slate-400 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-slate-600 shrink-0" />
                                        {stats.lastVisit ? (
                                            <span>{format(stats.lastVisit, "d MMM yyyy", { locale: es })}</span>
                                        ) : (
                                            <span className="text-slate-600 italic">Sin visitas</span>
                                        )}
                                    </div>

                                    {/* Next Appointment */}
                                    <div className="w-full md:col-span-2 text-xs flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3 text-slate-600 shrink-0" />
                                        {stats.nextAppointment ? (
                                            <span className="text-green-400 font-medium">{format(stats.nextAppointment, "d MMM", { locale: es })}</span>
                                        ) : (
                                            <span className="text-slate-600 italic">Ninguna</span>
                                        )}
                                    </div>

                                    {/* LTV */}
                                    <div className="w-full md:col-span-2 flex items-center gap-1.5">
                                        <TrendingUp className={`w-3 h-3 shrink-0 ${stats.ltv > 0 ? 'text-brand-neon-cyan' : 'text-slate-600'}`} />
                                        <span className={`text-sm font-bold ${stats.ltv > 0 ? 'text-brand-neon-cyan' : 'text-slate-600'}`}>
                                            {formatCurrency(stats.ltv)}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="w-full md:col-span-1 flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(customer); }}
                                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-500 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-slate-600 self-center ml-1 md:block hidden" />
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
