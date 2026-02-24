import { ArrowRight, Building, Check, MapPin, Tag } from 'lucide-react';

interface WizardStepsProps {
    currentStep: number;
    steps: {
        id: number;
        title: string;
        icon: any;
    }[];
}

export default function WizardSteps({ currentStep, steps }: WizardStepsProps) {
    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between relative">
                {/* Progress Bar Background */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full -z-10"></div>

                {/* Active Progress Bar */}
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-neon-cyan/50 rounded-full -z-10 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isActive
                                        ? 'border-brand-neon-cyan bg-brand-neon-cyan/20 text-white shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-110'
                                        : isCompleted
                                            ? 'border-green-500 bg-green-500/20 text-green-400'
                                            : 'border-slate-200 bg-[#F4F6F8] text-slate-500'
                                    }
                                `}
                            >
                                {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                            </div>
                            <span
                                className={`text-xs font-medium transition-colors duration-300
                                    ${isActive ? 'text-white' : isCompleted ? 'text-green-400' : 'text-slate-600'}
                                `}
                            >
                                {step.title}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
