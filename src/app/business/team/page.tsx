'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { Plus, Users, Edit2, Trash2, X, Check, Shield, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { EmployeeService, EmployeeData, WeeklySchedule } from '@/services/employee.service';
import { ServicesService, ServiceData } from '@/services/businessProfile.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import EmployeeWorkloadModal from '@/components/business/team/EmployeeWorkloadModal';
import WeeklyScheduleEditor from '@/components/business/WeeklyScheduleEditor';

export default function TeamPage() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<EmployeeData>>({
        name: '',
        role: '', // Title
        roleType: 'technician',
        roleCustom: '',
        active: true,
        serviceIds: []
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<EmployeeData | null>(null);

    // Schedule State
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [currentScheduleMember, setCurrentScheduleMember] = useState<EmployeeData | null>(null);

    // Workload State
    const [workloadModalOpen, setWorkloadModalOpen] = useState(false);
    const [currentWorkloadMember, setCurrentWorkloadMember] = useState<EmployeeData | null>(null);
    const [workloadAppointments, setWorkloadAppointments] = useState<Appointment[]>([]);
    const [workloadLoading, setWorkloadLoading] = useState(false);

    // Fetch Initial Data
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [emps, servs] = await Promise.all([
                EmployeeService.getEmployees(user.uid),
                ServicesService.getServices(user.uid)
            ]);
            setEmployees(emps);
            setServices(servs);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name) return;

        setIsSubmitting(true);
        try {
            if (editingId) {
                await EmployeeService.updateEmployee(user.uid, editingId, formData);
            } else {
                await EmployeeService.addEmployee(user.uid, {
                    name: formData.name!,
                    role: formData.role || '',
                    roleType: formData.roleType || 'technician',
                    roleCustom: formData.roleCustom,
                    active: formData.active ?? true,
                    serviceIds: formData.serviceIds || [],
                    photoUrl: '' // Future: Handle upload
                });
            }
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error("Error saving employee:", error);
            toast.error("Error al guardar empleado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (emp: EmployeeData) => {
        setMemberToDelete(emp);
    };

    const confirmDelete = async () => {
        if (!user || !memberToDelete) return;
        setIsSubmitting(true);
        try {
            await EmployeeService.deleteEmployee(user.uid, memberToDelete.id!);
            setMemberToDelete(null);
            fetchData();
        } catch (error) {
            console.error("Error deleting:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (emp: EmployeeData) => {
        setFormData(emp);
        setEditingId(emp.id!);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: '', role: '', roleType: 'technician', roleCustom: '', active: true, serviceIds: [] });
        setEditingId(null);
    };

    const toggleService = (serviceId: string) => {
        const currentIds = formData.serviceIds || [];
        if (currentIds.includes(serviceId)) {
            setFormData({ ...formData, serviceIds: currentIds.filter(id => id !== serviceId) });
        } else {
            setFormData({ ...formData, serviceIds: [...currentIds, serviceId] });
        }
    };

    const getServiceNames = (ids: string[]) => {
        return services
            .filter(s => ids.includes(s.id!))
            .map(s => s.name);
    };

    const getRoleLabel = (emp: EmployeeData) => {
        const type = emp.roleType || 'technician';
        if (type === 'other') return emp.roleCustom || 'Otro';

        const labels: Record<string, string> = {
            manager: 'Manager / Admin',
            reception: 'Recepción',
            customer_service: 'Servicio al Cliente',
            sales_marketing: 'Ventas / Marketing',
            technician: 'Técnico / Especialista',
            assistant: 'Asistente'
        };
        return labels[type] || 'Staff';
    };

    // Schedule Handlers
    const handleOpenSchedule = (emp: EmployeeData) => {
        setCurrentScheduleMember(emp);
        setScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (schedule: WeeklySchedule) => {
        if (!user || !currentScheduleMember) return;

        try {
            await EmployeeService.updateEmployee(user.uid, currentScheduleMember.id!, {
                availabilityWeekly: schedule
            });
            toast.success("Horario guardado correctamente");
            setScheduleModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Error saving schedule:", error);
            toast.error("Error al guardar horario");
        }
    };

    const handleOpenWorkload = async (emp: EmployeeData) => {
        if (!user) return;
        setCurrentWorkloadMember(emp);
        setWorkloadModalOpen(true);
        setWorkloadLoading(true);
        try {
            const apts = await AppointmentService.getAppointmentsByEmployee(user.uid, emp.id!);
            setWorkloadAppointments(apts);
        } catch (error) {
            console.error("Error loading workload:", error);
            toast.error("Error al cargar agenda");
        } finally {
            setWorkloadLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mi Equipo</h1>
                    <p className="text-slate-400 text-sm">Gestiona tu staff y asigna servicios</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,200,255,0.3)]"
                >
                    <Plus size={16} />
                    Nuevo Miembro
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            ) : employees.length === 0 ? (
                <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-white/20">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Aún no tienes equipo</h3>
                    <p className="text-slate-400 max-w-sm mb-6">
                        Agrega a los profesionales que trabajan contigo para asignarles citas.
                    </p>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        Agregar Primer Miembro
                    </button>
                </GlassPanel>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map(emp => (
                        <GlassPanel key={emp.id} className="p-5 flex flex-col group relative hover:border-brand-neon-cyan/30 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                        {emp.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-none">{emp.name}</h3>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-brand-neon-cyan font-bold">{getRoleLabel(emp)}</span>
                                            {emp.role && <span className="text-[10px] text-slate-400">{emp.role}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex bg-white/5 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(emp)} className="p-1.5 hover:text-cyan-400 text-slate-400"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteClick(emp)} className="p-1.5 hover:text-red-400 text-slate-400"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="mb-4">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                                    <Shield size={10} /> Servicios Asignados
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {getServiceNames(emp.serviceIds).length > 0 ? (
                                        getServiceNames(emp.serviceIds).map((name, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-slate-300 border border-white/5">
                                                {name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-xs text-slate-600 italic">Ninguno asignado</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${emp.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {emp.active ? 'Activo' : 'Inactivo'}
                                </span>
                                <button
                                    onClick={() => handleOpenSchedule(emp)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-2 py-1 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Clock size={14} className={emp.availabilityWeekly ? "text-brand-neon-cyan" : "text-slate-500"} />
                                    {emp.availabilityWeekly ? "Horario Configurado" : "Horario Default"}
                                </button>
                                <button
                                    onClick={() => handleOpenWorkload(emp)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-brand-neon-cyan px-2 py-1 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Users size={14} />
                                    Ver Agenda
                                </button>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1a1030] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#0f0d1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    placeholder="Ej. Nombre Completo"
                                />
                            </div>



                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Rol en el Negocio</label>
                                <select
                                    value={formData.roleType || 'technician'}
                                    onChange={e => setFormData({ ...formData, roleType: e.target.value as any })}
                                    className="w-full bg-[#0f0d1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none appearance-none"
                                >
                                    <option value="manager">Manager / Administrador</option>
                                    <option value="reception">Recepción / Front Desk</option>
                                    <option value="customer_service">Servicio al Cliente</option>
                                    <option value="sales_marketing">Ventas / Marketing</option>
                                    <option value="technician">Técnico / Especialista</option>
                                    <option value="assistant">Asistente / Ayudante</option>
                                    <option value="other">Otro</option>
                                </select>
                            </div>

                            {formData.roleType === 'other' && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Especificar Rol</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.roleCustom || ''}
                                        onChange={e => setFormData({ ...formData, roleCustom: e.target.value })}
                                        className="w-full bg-[#0f0d1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        placeholder="Ej. Fotógrafo"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Título / Descripción (Opcional)</label>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-[#0f0d1a] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    placeholder="Ej. Especialista Senior"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase">Servicios que realiza</label>
                                <div className="bg-[#0f0d1a] border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                                    {services.length === 0 ? (
                                        <p className="text-xs text-slate-500 p-2 text-center">No hay servicios creados aún.</p>
                                    ) : (
                                        services.map(service => {
                                            const isSelected = (formData.serviceIds || []).includes(service.id!);
                                            return (
                                                <div
                                                    key={service.id}
                                                    onClick={() => toggleService(service.id!)}
                                                    className={`
                                                        flex items-center gap-3 p-2 rounded cursor-pointer transition-colors
                                                        ${isSelected ? 'bg-brand-neon-cyan/10 border border-brand-neon-cyan/30' : 'hover:bg-white/5 border border-transparent'}
                                                    `}
                                                >
                                                    <div className={`
                                                        w-4 h-4 rounded border flex items-center justify-center transition-colors
                                                        ${isSelected ? 'bg-brand-neon-cyan border-brand-neon-cyan' : 'border-slate-600'}
                                                    `}>
                                                        {isSelected && <Check size={10} className="text-black" />}
                                                    </div>
                                                    <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                        {service.name}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <div
                                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                                    className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${formData.active ? 'bg-green-500' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.active ? 'left-5' : 'left-1'}`} />
                                </div>
                                <span className="text-sm text-slate-300">
                                    {formData.active ? 'Miembro Activo' : 'Miembro Inactivo'}
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-brand-neon-cyan text-black font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all mt-4 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Guardando...' : 'Guardar Miembro'}
                            </button>
                        </form>
                    </div>
                </div >
            )
            }
            {/* Delete Confirmation Modal */}
            {
                memberToDelete && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-[#1a1030] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                    <AlertTriangle size={24} />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-white">¿Eliminar miembro?</h3>
                                    <p className="text-slate-400 text-sm mt-2">
                                        Estás a punto de eliminar a <span className="text-white font-bold">{memberToDelete.name}</span>. Esta acción no se puede deshacer.
                                    </p>
                                </div>

                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setMemberToDelete(null)}
                                        className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                                    >
                                        {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Schedule Modal */}
            <WeeklyScheduleEditor
                isOpen={scheduleModalOpen}
                onClose={() => setScheduleModalOpen(false)}
                onSave={handleSaveSchedule}
                initialSchedule={currentScheduleMember?.availabilityWeekly}
                entityName={currentScheduleMember?.name}
            />

            {/* Workload Modal */}
            <EmployeeWorkloadModal
                isOpen={workloadModalOpen}
                onClose={() => setWorkloadModalOpen(false)}
                employee={currentWorkloadMember}
                appointments={workloadAppointments}
                loading={workloadLoading}
            />
        </div >
    );
}
