'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Loader2, LogIn } from 'lucide-react';
import { Step1Identity } from './steps/Step1Identity';
import { Step2Category } from './steps/Step2Category';
import { Step3Location } from './steps/Step3Location';
import { Step4Portfolio } from './steps/Step4Portfolio';
import Link from 'next/link';
import { BusinessProfileService } from '@/services/businessProfile.service';
import { useAuth } from '@/context/AuthContext';
import { AuthService } from '@/services/auth.service';

export default function BusinessWizard() {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        businessName: '',
        description: '',
        category: '',
        subcategory: '',
        specialties: [] as string[],
        modality: '', // 'home', 'local', 'both'
        address: '',
        country: 'HN', // Default
        city: '',
        images: [] as any[]
    });

    const totalSteps = 4;

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, totalSteps + 1));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const updateData = (key: string, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleLogin = async () => {
        try {
            await AuthService.loginWithGoogle();
        } catch (error) {
            console.error(error);
            setError('Error al iniciar sesión con Google.');
        }
    };

    const handleFinish = async () => {
        if (!user) {
            setError('Debes iniciar sesión para crear un perfil.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            // MOCK GEOCODING (To be replaced by Google Maps API later)
            // Default center for San Pedro Sula (HN) or generic
            const baseLat = 15.50417;
            const baseLng = -88.02500;
            // Add slight jitter so they don't stack on map
            const mockLocation = {
                lat: baseLat + (Math.random() - 0.5) * 0.05,
                lng: baseLng + (Math.random() - 0.5) * 0.05
            };

            const profileData = {
                ...formData,
                userId: user.uid,
                email: user.email || '',
                images: [],
                location: mockLocation, // Ensure map has data
                modality: formData.modality as 'home' | 'local' | 'both'
            };

            await BusinessProfileService.createProfile(user.uid, profileData);
            setCurrentStep(totalSteps + 1);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al crear el perfil. Intenta de nuevo.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (currentStep > totalSteps) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/20">
                    <Check className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">¡Perfil Creado con Éxito!</h2>
                <p className="text-slate-400 max-w-md mb-8">
                    Tu negocio <strong>{formData.businessName}</strong> ha sido registrado. Ahora puedes gestionar tus citas y servicios desde tu panel.
                </p>
                <Link href="/" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-colors">
                    Ir al Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row">
            {/* Sidebar / Progress (Desktop) */}
            <div className="hidden md:flex w-1/3 bg-slate-800/50 p-12 flex-col justify-between border-r border-white/5">
                <div>
                    <div className="mb-12">
                        <h1 className="text-2xl font-bold text-blue-400">PRO24/7 Business</h1>
                        <p className="text-slate-400 mt-2">Configura tu perfil profesional en minutos.</p>
                    </div>

                    <div className="space-y-6">
                        <StepIndicator step={1} current={currentStep} label="Identidad del Negocio" />
                        <StepIndicator step={2} current={currentStep} label="Especialidad y Servicios" />
                        <StepIndicator step={3} current={currentStep} label="Ubicación y Modalidad" />
                        <StepIndicator step={4} current={currentStep} label="Portafolio Visual" />
                    </div>
                </div>

                <div className="text-xs text-slate-500">
                    © 2024 PRO24/7 Inc.
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative">
                {/* Mobile Header */}
                <div className="md:hidden p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/80 backdrop-blur-md sticky top-0 z-50">
                    <span className="font-bold text-blue-400">Paso {currentStep} de {totalSteps}</span>
                    <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Login Banner for Testing - ONLY IF NOT LOGGED IN */}
                {!user && (
                    <div className="bg-blue-600/10 border-b border-blue-500/20 p-4 flex flex-col md:flex-row justify-between items-center animate-in slide-in-from-top duration-500 gap-4">
                        <div className="flex items-center text-blue-200">
                            <span className="mr-2 text-xl">👋</span>
                            <span className="text-sm font-medium">Inicia sesión ahora para guardar tu progreso sin interrupciones.</span>
                        </div>
                        <button
                            onClick={handleLogin}
                            className="flex items-center bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg whitespace-nowrap"
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Ingresar con Google
                        </button>
                    </div>
                )}

                <div className="flex-1 p-6 md:p-12 overflow-y-auto">
                    <div className="max-w-2xl mx-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentStep === 1 && (
                                    <Step1Identity data={formData} update={updateData} />
                                )}
                                {currentStep === 2 && (
                                    <Step2Category data={formData} update={updateData} />
                                )}
                                {currentStep === 3 && (
                                    <Step3Location data={formData} update={updateData} />
                                )}
                                {currentStep === 4 && (
                                    <Step4Portfolio data={formData} update={updateData} />
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/5 bg-slate-900/80 backdrop-blur-md flex justify-between items-center max-w-5xl mx-auto w-full z-10">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={`flex items-center px-6 py-3 rounded-xl font-medium transition-colors ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5 mr-2" />
                        Atrás
                    </button>

                    <button
                        onClick={currentStep === totalSteps ? handleFinish : nextStep}
                        disabled={isSubmitting}
                        className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                {currentStep === totalSteps ? 'Finalizar' : 'Continuar'}
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </>
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="absolute bottom-24 left-0 w-full flex justify-center pointer-events-none">
                        <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-xl shadow-xl border border-red-400/50 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto">
                            {error}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StepIndicator({ step, current, label }: { step: number, current: number, label: string }) {
    const status = current === step ? 'active' : current > step ? 'completed' : 'pending';

    return (
        <div className={`flex items-center transition-opacity duration-300 ${status === 'pending' ? 'opacity-40' : 'opacity-100'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mr-4 transition-all duration-300 ${status === 'active' ? 'border-blue-400 text-blue-400 bg-blue-400/10' :
                status === 'completed' ? 'border-green-500 bg-green-500 text-white' :
                    'border-slate-600 text-slate-600'
                }`}>
                {status === 'completed' ? <Check className="w-4 h-4" /> : step}
            </div>
            <span className={`font-medium ${status === 'active' ? 'text-white' : 'text-slate-400'}`}>
                {label}
            </span>
        </div>
    );
}
