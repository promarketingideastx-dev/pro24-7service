'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TAXONOMY } from '@/lib/taxonomy';
import { useAuth } from '@/context/AuthContext';
import { BusinessProfileService } from '@/services/businessProfile.service';

// ==========================================
// SUB-COMPONENTS (STEPS)
// ==========================================

const Step1_Category = ({ data, updateData, next }: any) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Elije tu Rubro 🎨</h2>
            <p className="text-gray-500 mb-8 text-lg">¿En qué área te especializas más?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(TAXONOMY).map((cat: any) => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            updateData({ category: cat.id, subcategory: null, specialties: [] }); // Reset children
                            next();
                        }}
                        className={`
                            group relative overflow-hidden p-6 rounded-2xl text-left border-2 transition-all duration-300
                            ${data.category === cat.id
                                ? 'border-black bg-gray-900 text-white shadow-xl scale-[1.02]'
                                : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-md'}
                        `}
                    >
                        <span className="text-4xl mb-3 block text-center">{cat.id === 'art_design' ? '🎨' : '📁'}</span>
                        <h3 className="font-bold text-xl text-center">{cat.label.es}</h3>
                        <p className={`text-sm mt-1 text-center ${data.category === cat.id ? 'text-gray-300' : 'text-gray-500'}`}>
                            {cat.subcategories.length} especialidades disponibles
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Step2_Details = ({ data, updateData, next, prev }: any) => {
    const category = TAXONOMY[data.category as keyof typeof TAXONOMY];
    const subcategories = category?.subcategories || [];

    // Find current subcategory object if selected
    const currentSub = subcategories.find((s: any) => s.id === data.subcategory);

    const toggleSpecialty = (spec: string) => {
        const current = data.specialties || [];
        if (current.includes(spec)) {
            updateData({ specialties: current.filter((s: string) => s !== spec) });
        } else {
            updateData({ specialties: [...current, spec] });
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Detalles del Servicio 🛠️</h2>
            <p className="text-gray-500 mb-8 text-lg">Define exactamente qué haces.</p>

            {/* Subcategories */}
            <div className="mb-8">
                <label className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-3 block">Especialidad Principal</label>
                <div className="flex flex-wrap gap-3">
                    {subcategories.map((sub: any) => (
                        <button
                            key={sub.id}
                            onClick={() => updateData({ subcategory: sub.id })}
                            className={`
                                px-5 py-3 rounded-xl font-bold text-sm transition-all border
                                ${data.subcategory === sub.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}
                            `}
                        >
                            {sub.label.es}
                        </button>
                    ))}
                </div>
            </div>

            {/* Specialties (Show only if subcategory selected) */}
            {currentSub && (
                <div className="mb-8 animate-in fade-in zoom-in-95">
                    <label className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-3 block">
                        Habilidades Específicas ({data.specialties?.length || 0})
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentSub.specialties.map((spec: string) => (
                            <button
                                key={spec}
                                onClick={() => toggleSpecialty(spec)}
                                className={`
                                    flex items-center p-3 rounded-lg border text-left transition-all
                                    ${(data.specialties || []).includes(spec)
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors
                                    ${(data.specialties || []).includes(spec) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                                `}>
                                    {(data.specialties || []).includes(spec) && <span className="text-white text-xs">✓</span>}
                                </div>
                                <span className="text-sm font-medium">{spec}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex justify-between pt-6 border-t border-gray-100">
                <button onClick={prev} className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900">Atrás</button>
                <button
                    onClick={next}
                    disabled={!data.subcategory}
                    className="bg-black text-white px-8 py-3 rounded-xl font-bold disabled:opacity-30 hover:bg-gray-800 transition-colors shadow-lg"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

const Step3_Identity = ({ data, updateData, next, prev }: any) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Identidad de Marca ⭐</h2>
            <p className="text-gray-500 mb-8 text-lg">¿Cómo te recordarán los clientes?</p>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
                    <input
                        type="text"
                        value={data.brandName || ''}
                        onChange={(e) => updateData({ brandName: e.target.value })}
                        className="w-full text-xl font-bold p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black focus:bg-white transition-all outline-none"
                        placeholder="Ej. Studio Creativo Luna"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Corta</label>
                    <textarea
                        value={data.bio || ''}
                        onChange={(e) => updateData({ bio: e.target.value })}
                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-black focus:bg-white transition-all outline-none h-32 resize-none"
                        placeholder="Cuenta un poco sobre tu experiencia y lo que ofreces..."
                    />
                </div>
            </div>

            <div className="flex justify-between pt-8 pb-4">
                <button onClick={prev} className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900">Atrás</button>
                <button
                    onClick={next}
                    disabled={!data.brandName || !data.bio}
                    className="bg-black text-white px-8 py-3 rounded-xl font-bold disabled:opacity-30 hover:bg-gray-800 transition-colors shadow-lg"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
};

const Step4_Contact = ({ data, updateData, prev, onFinish, isSubmitting }: any) => {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Contacto Seguro 🔒</h2>
            <p className="text-gray-500 mb-8 text-lg">Tus datos están protegidos. Solo clientes registrados podrán contactarte.</p>

            <div className="space-y-6">
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <span className="text-2xl">📱</span>
                        <div>
                            <label className="block font-bold text-gray-900">Número de WhatsApp</label>
                            <p className="text-sm text-gray-500 mb-3">Para enviarte notificaciones de citas y mensajes.</p>
                            <input
                                type="tel"
                                value={data.phone || ''}
                                onChange={(e) => updateData({ phone: e.target.value })}
                                className="w-full text-lg font-medium p-3 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="+504 9999-9999"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 border border-gray-100 rounded-2xl opacity-70">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">📍</span>
                        <div>
                            <h4 className="font-bold">Ubicación (Automática)</h4>
                            <p className="text-xs">Se usará tu ubicación actual aproximada para el mapa.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between pt-8 pb-4">
                <button onClick={prev} className="px-6 py-3 font-medium text-gray-500 hover:text-gray-900">Atrás</button>
                <div className="flex-1"></div>
                <button
                    onClick={onFinish}
                    disabled={!data.phone || isSubmitting}
                    className={`
                        px-8 py-4 rounded-xl font-bold text-white transition-all shadow-xl
                        ${!data.phone || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105 shadow-green-600/30'}
                    `}
                >
                    {isSubmitting ? 'Creando Negocio...' : '🚀 Lanzar Negocio'}
                </button>
            </div>
        </div>
    );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function BusinessWizard() {
    const { user, refreshProfile } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<any>({ category: 'art_design' }); // Default selection
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateData = (newData: any) => setFormData((d: any) => ({ ...d, ...newData }));
    const next = () => setStep(s => s + 1);
    const prev = () => setStep(s => s - 1);

    const handleFinish = async () => {
        setIsSubmitting(true);
        if (!user) {
            alert("Error: No estás autenticado.");
            return;
        }

        try {
            await BusinessProfileService.createProfile(user, formData);
            await refreshProfile();
            // TODO: Redirect to real dashboard
            alert("¡Perfil de Negocio Creado! (Redirigiendo...)");
            router.push('/admin/dashboard');
        } catch (error: any) {
            console.error(error);
            alert('Error al crear perfil: ' + error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
                {/* Progress Indicators */}
                <div className="flex justify-center mb-10 gap-2">
                    {[1, 2, 3, 4].map((s) => (
                        <div
                            key={s}
                            className={`h-2 rounded-full transition-all duration-500 ease-out 
                                ${s <= step ? 'w-16 bg-black' : 'w-4 bg-gray-300'}
                            `}
                        />
                    ))}
                </div>

                <div className="bg-white py-12 px-8 shadow-2xl rounded-3xl m-4 border border-gray-100">
                    {step === 1 && <Step1_Category data={formData} updateData={updateData} next={next} />}
                    {step === 2 && <Step2_Details data={formData} updateData={updateData} next={next} prev={prev} />}
                    {step === 3 && <Step3_Identity data={formData} updateData={updateData} next={next} prev={prev} />}
                    {step === 4 && <Step4_Contact data={formData} updateData={updateData} prev={prev} onFinish={handleFinish} isSubmitting={isSubmitting} />}
                </div>
            </div>
        </div>
    );
}
