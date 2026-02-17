'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { Plus, Clock, MoreVertical, Trash2, Edit2, X, DollarSign, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ServicesService, ServiceData } from '@/services/businessProfile.service';

export default function ServicesPage() {
    const { user } = useAuth();
    const [services, setServices] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<ServiceData>>({
        name: '',
        description: '',
        price: 0,
        durationMinutes: 30,
        currency: 'L.'
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const fetchServices = async () => {
        if (!user) return;
        setLoading(true);
        const data = await ServicesService.getServices(user.uid);
        setServices(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchServices();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name || formData.price === undefined) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                await ServicesService.updateService(user.uid, editingId, formData);
            } else {
                await ServicesService.addService(user.uid, {
                    name: formData.name,
                    description: formData.description || '',
                    price: Number(formData.price),
                    durationMinutes: Number(formData.durationMinutes),
                    currency: formData.currency || 'L.'
                });
            }
            setIsModalOpen(false);
            resetForm();
            fetchServices();
        } catch (error) {
            console.error("Error saving service:", error);
            alert("Error al guardar servicio.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!user || !confirm("¿Estás seguro de eliminar este servicio?")) return;
        try {
            await ServicesService.deleteService(user.uid, id);
            fetchServices();
        } catch (error) {
            console.error("Error deleting:", error);
        }
    };

    const handleEdit = (service: ServiceData) => {
        setFormData(service);
        setEditingId(service.id!);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', price: 0, durationMinutes: 30, currency: 'L.' });
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mis Servicios</h1>
                    <p className="text-slate-400 text-sm">Gestiona tu menú de servicios</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,200,255,0.3)]"
                >
                    <Plus size={16} />
                    Nuevo Servicio
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            ) : services.length === 0 ? (
                <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-white/20">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                        <DollarSign size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">No tienes servicios aún</h3>
                    <p className="text-slate-400 max-w-sm mb-6">
                        Agrega los servicios que ofreces para que tus clientes sepan qué pueden reservar.
                    </p>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        Agregar Primer Servicio
                    </button>
                </GlassPanel>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(service => (
                        <GlassPanel key={service.id} className="p-5 flex flex-col group relative overflow-visible hover:border-brand-neon-cyan/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-white text-lg truncate pr-6">{service.name}</h3>
                                <div className="flex bg-white/5 rounded-lg p-1 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(service)} className="p-1.5 hover:text-cyan-400 text-slate-400"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(service.id!)} className="p-1.5 hover:text-red-400 text-slate-400"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <p className="text-slate-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                                {service.description || "Sin descripción"}
                            </p>

                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                <span className="text-xl font-bold text-brand-neon-cyan">
                                    {service.currency} {service.price}
                                </span>
                                <div className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-2 py-1 rounded">
                                    <Clock size={12} />
                                    {service.durationMinutes} min
                                </div>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151b2e] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nombre del Servicio</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    placeholder="Ej. Corte Regular"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Descripción</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none resize-none h-24"
                                    placeholder="Detalles sobre el servicio..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Precio</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-500">{formData.currency}</span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Duración (min)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-3 text-slate-500"><Clock size={16} /></span>
                                        <input
                                            type="number"
                                            required
                                            min="5"
                                            step="5"
                                            value={formData.durationMinutes}
                                            onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-lg pl-9 pr-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-brand-neon-cyan text-black font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all mt-4 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Servicio'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
