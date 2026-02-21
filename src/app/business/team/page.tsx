'use client';

import { useState, useEffect } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { Plus, Users, Edit2, Trash2, X, Check, Shield, AlertTriangle, Clock, Camera, Image as ImageIcon, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { EmployeeService, EmployeeData, WeeklySchedule } from '@/services/employee.service';
import { ServicesService, ServiceData, BusinessProfileService } from '@/services/businessProfile.service';
import { AppointmentService, Appointment } from '@/services/appointment.service';
import EmployeeWorkloadModal from '@/components/business/team/EmployeeWorkloadModal';
import WeeklyScheduleEditor from '@/components/business/WeeklyScheduleEditor';

const AVATAR_COLORS = [
    'from-violet-500 to-indigo-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-fuchsia-500 to-purple-600',
];

export default function TeamPage() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [services, setServices] = useState<ServiceData[]>([]);
    const [businessSpecialties, setBusinessSpecialties] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Photo picker state
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<EmployeeData>>({
        name: '',
        role: '',
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
            BusinessProfileService.getProfile(user.uid).then(profile => {
                if (profile?.specialties?.length) setBusinessSpecialties(profile.specialties);
            }).catch(() => { });
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [user]);

    // ── Photo upload helpers ──
    const uploadEmployeePhoto = async (file: File): Promise<string> => {
        if (!user) throw new Error('No user');
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `businesses/${user.uid}/employees/${Date.now()}.${ext}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, file);
        return getDownloadURL(sRef);
    };

    const handlePhotoFile = async (file: File) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => setPhotoPreview(e.target?.result as string);
        reader.readAsDataURL(file);
        setPhotoPickerOpen(false);
        setSelectedAvatar(null);
        setPhotoUploading(true);
        try {
            const url = await uploadEmployeePhoto(file);
            setFormData(prev => ({ ...prev, photoUrl: url }));
            toast('Foto actualizada correctamente', {
                icon: '✓',
                style: {
                    background: '#0f1629',
                    border: '1px solid rgba(0,240,255,0.3)',
                    color: '#00f0ff',
                    fontWeight: '600',
                },
            });
        } catch {
            toast.error('No se pudo subir la foto. Intenta de nuevo.');
        } finally {
            setPhotoUploading(false);
        }
    };

    const handleSelectAvatar = (gradient: string) => {
        setSelectedAvatar(gradient);
        setPhotoPreview(null);
        setFormData(prev => ({ ...prev, photoUrl: '' }));
        setPhotoPickerOpen(false);
    };

    const getAvatarGradient = (emp: EmployeeData) => {
        const idx = emp.name.charCodeAt(0) % AVATAR_COLORS.length;
        return AVATAR_COLORS[idx];
    };

    // ── Form helpers ──
    const resetForm = () => {
        setFormData({ name: '', role: '', roleType: 'technician', roleCustom: '', active: true, serviceIds: [] });
        setEditingId(null);
        setPhotoPreview(null);
        setSelectedAvatar(null);
        setPhotoPickerOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.name) return;
        setIsSubmitting(true);
        try {
            if (editingId) {
                await EmployeeService.updateEmployee(user.uid, editingId, formData);
                toast.success('Miembro actualizado correctamente');
            } else {
                await EmployeeService.addEmployee(user.uid, {
                    name: formData.name!,
                    role: formData.role || '',
                    roleType: formData.roleType || 'technician',
                    roleCustom: formData.roleCustom,
                    description: formData.description || '',
                    active: formData.active ?? true,
                    serviceIds: formData.serviceIds || [],
                    photoUrl: formData.photoUrl || '',
                });
                toast.success('Miembro agregado correctamente');
            }
            setIsModalOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error('Error al guardar miembro.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (emp: EmployeeData) => {
        setFormData(emp);
        setEditingId(emp.id!);
        setPhotoPreview(emp.photoUrl || null);
        setSelectedAvatar(null);
        setPhotoPickerOpen(false);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (emp: EmployeeData) => setMemberToDelete(emp);

    const confirmDelete = async () => {
        if (!user || !memberToDelete) return;
        setIsSubmitting(true);
        try {
            await EmployeeService.deleteEmployee(user.uid, memberToDelete.id!);
            setMemberToDelete(null);
            fetchData();
        } catch (error) {
            console.error('Error deleting:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleService = (serviceId: string) => {
        const current = formData.serviceIds || [];
        setFormData({
            ...formData,
            serviceIds: current.includes(serviceId)
                ? current.filter(id => id !== serviceId)
                : [...current, serviceId]
        });
    };

    const getServiceNames = (ids: string[]) =>
        services.filter(s => ids.includes(s.id!)).map(s => s.name);

    const getRoleLabel = (emp: EmployeeData) => {
        if (emp.roleType === 'other') return emp.roleCustom || 'Otro';
        const labels: Record<string, string> = {
            manager: 'Manager / Admin',
            reception: 'Recepción',
            customer_service: 'Servicio al Cliente',
            sales_marketing: 'Ventas / Marketing',
            technician: 'Técnico / Especialista',
            assistant: 'Asistente',
        };
        return labels[emp.roleType || 'technician'] || 'Staff';
    };

    const handleOpenSchedule = (emp: EmployeeData) => {
        setCurrentScheduleMember(emp);
        setScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (schedule: WeeklySchedule) => {
        if (!user || !currentScheduleMember) return;
        try {
            await EmployeeService.updateEmployee(user.uid, currentScheduleMember.id!, { availabilityWeekly: schedule });
            toast.success('Horario guardado correctamente');
            setScheduleModalOpen(false);
            fetchData();
        } catch {
            toast.error('Error al guardar horario');
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
        } catch {
            toast.error('Error al cargar agenda');
        } finally {
            setWorkloadLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Mi Equipo</h1>
                    <p className="text-slate-400 text-sm">Gestiona tu equipo y asigna servicios</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,200,255,0.3)]"
                >
                    <Plus size={16} /> Nuevo Miembro
                </button>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
                </div>
            ) : employees.length === 0 ? (
                <GlassPanel className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center border-dashed border-white/20">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-500">
                        <Users size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Aún no tienes equipo</h3>
                    <p className="text-slate-400 max-w-sm mb-6">
                        Agrega a los miembros que trabajan contigo para asignarles citas.
                    </p>
                    <button
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-brand-neon-cyan/10 hover:bg-brand-neon-cyan/20 border border-brand-neon-cyan/30 text-brand-neon-cyan rounded-xl text-sm font-bold transition-colors"
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
                                    {emp.photoUrl ? (
                                        <img src={emp.photoUrl} alt={emp.name} className="w-12 h-12 rounded-full object-cover border-2 border-white/10" />
                                    ) : (
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${getAvatarGradient(emp)} flex items-center justify-center text-white font-bold text-lg`}>
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
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

                            <div className="mb-4 min-h-[40px]">
                                {emp.description ? (
                                    <>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                                            <Shield size={10} /> Especialidad
                                        </p>
                                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                                            {emp.description}
                                        </p>
                                    </>
                                ) : emp.role ? (
                                    <>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-1">
                                            <Shield size={10} /> Especialidad
                                        </p>
                                        <span className="px-2 py-0.5 bg-brand-neon-cyan/10 rounded text-[11px] text-brand-neon-cyan border border-brand-neon-cyan/20">
                                            {emp.role}
                                        </span>
                                    </>
                                ) : null}
                            </div>

                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${emp.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {emp.active ? 'Activo' : 'Inactivo'}
                                </span>
                                <button
                                    onClick={() => handleOpenSchedule(emp)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white px-2 py-1 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Clock size={14} className={emp.availabilityWeekly ? 'text-brand-neon-cyan' : 'text-slate-500'} />
                                    {emp.availabilityWeekly ? 'Horario Configurado' : 'Horario Default'}
                                </button>
                                <button
                                    onClick={() => handleOpenWorkload(emp)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-brand-neon-cyan px-2 py-1 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <Users size={14} /> Ver Agenda
                                </button>
                            </div>
                        </GlassPanel>
                    ))}
                </div>
            )}

            {/* ── Add / Edit Member Modal ── */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1629] border border-white/8 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {editingId ? 'Editar Miembro' : 'Nuevo Miembro'}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">Los miembros aparecerán al asignar citas</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto custom-scrollbar">

                            {/* ── Photo Picker ── */}
                            <div className="flex flex-col items-center gap-3 pb-5 border-b border-white/5">
                                <div className="relative group">
                                    <div
                                        onClick={() => setPhotoPickerOpen(v => !v)}
                                        className="w-20 h-20 rounded-full cursor-pointer overflow-hidden border-2 border-white/10 hover:border-brand-neon-cyan/50 transition-all relative"
                                    >
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                                        ) : selectedAvatar ? (
                                            <div className={`w-full h-full bg-gradient-to-br ${selectedAvatar} flex items-center justify-center text-white font-bold text-2xl`}>
                                                {(formData.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${AVATAR_COLORS[0]} flex items-center justify-center text-white font-bold text-2xl`}>
                                                {(formData.name || '?').charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera size={18} className="text-white" />
                                        </div>
                                        {photoUploading && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        onClick={() => setPhotoPickerOpen(v => !v)}
                                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-brand-neon-cyan rounded-full flex items-center justify-center cursor-pointer border-2 border-[#0f1629]"
                                    >
                                        <Camera size={11} className="text-black" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">Toca para agregar foto de perfil</p>

                                {photoPickerOpen && (
                                    <div className="w-full bg-[#0a0f1e] border border-white/10 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer border border-white/5 hover:border-white/15 transition-colors">
                                                <ImageIcon size={20} className="text-slate-300" />
                                                <span className="text-xs text-slate-400 font-medium">Galería</span>
                                                <input type="file" accept="image/*" className="hidden"
                                                    onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
                                            </label>
                                            <label className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl cursor-pointer border border-white/5 hover:border-white/15 transition-colors">
                                                <Camera size={20} className="text-slate-300" />
                                                <span className="text-xs text-slate-400 font-medium">Cámara</span>
                                                <input type="file" accept="image/*" capture="user" className="hidden"
                                                    onChange={e => e.target.files?.[0] && handlePhotoFile(e.target.files[0])} />
                                            </label>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                                <UserCircle2 size={12} /> Elegir color de avatar
                                            </p>
                                            <div className="flex gap-2 flex-wrap">
                                                {AVATAR_COLORS.map((grad, i) => (
                                                    <button key={i} type="button" onClick={() => handleSelectAvatar(grad)}
                                                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm border-2 transition-all
                                                            ${selectedAvatar === grad ? 'border-brand-neon-cyan scale-110' : 'border-transparent hover:scale-105'}`}
                                                    >
                                                        {(formData.name || '?').charAt(0).toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    placeholder="Nombre completo del miembro"
                                />
                            </div>

                            {/* Role type */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Rol en el Negocio</label>
                                <select
                                    value={formData.roleType || 'technician'}
                                    onChange={e => setFormData({ ...formData, roleType: e.target.value as any })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none appearance-none"
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

                            {/* Custom role */}
                            {formData.roleType === 'other' && (
                                <div className="animate-in fade-in slide-in-from-top-1">
                                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Especificar Rol</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.roleCustom || ''}
                                        onChange={e => setFormData({ ...formData, roleCustom: e.target.value })}
                                        className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                        placeholder="Describe el rol del miembro"
                                    />
                                </div>
                            )}

                            {/* Specialty / Title */}
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Título / Especialidad (Opcional)</label>
                                {businessSpecialties.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {businessSpecialties.map(spec => (
                                            <button
                                                key={spec}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: formData.role === spec ? '' : spec })}
                                                className={`text-xs px-2.5 py-1 rounded-full border transition-all
                                                    ${formData.role === spec
                                                        ? 'bg-brand-neon-cyan/15 border-brand-neon-cyan text-brand-neon-cyan'
                                                        : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-slate-200'}`}
                                            >
                                                {spec}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none"
                                    placeholder="Título o especialidad del miembro"
                                />
                            </div>

                            {/* Description */}
                            {(() => {
                                const words = (formData.description || '').trim().split(/\s+/).filter(Boolean).length;
                                const MAX_WORDS = 200;
                                const over = words > MAX_WORDS;
                                return (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1 uppercase">Descripción (Opcional)</label>
                                        <textarea
                                            rows={3}
                                            value={formData.description || ''}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-brand-neon-cyan focus:outline-none resize-none text-sm leading-relaxed"
                                            placeholder="Describe brevemente qué hace este miembro del equipo..."
                                        />
                                        <p className={`text-right text-xs mt-1 ${over ? 'text-red-400' : 'text-slate-600'}`}>
                                            {words} / {MAX_WORDS} palabras
                                        </p>
                                    </div>
                                );
                            })()}


                            {/* Active toggle */}
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
                                disabled={isSubmitting || photoUploading}
                                className="w-full bg-brand-neon-cyan text-black font-bold py-3 rounded-xl hover:shadow-[0_0_15px_rgba(0,240,255,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Guardando...</>
                                ) : photoUploading ? (
                                    <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Subiendo foto...</>
                                ) : (
                                    <><Check size={16} /> {editingId ? 'Guardar Cambios' : 'Agregar Miembro'}</>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {memberToDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0f1629] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
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
                                <button onClick={() => setMemberToDelete(null)} className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors font-medium">
                                    Cancelar
                                </button>
                                <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors font-bold">
                                    {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
}
