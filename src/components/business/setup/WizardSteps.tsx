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
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-teal-500 rounded-full z-0 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step) => {
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                                    ${isActive
                                        ? 'border-teal-500 bg-white text-teal-600 shadow-md shadow-teal-500/20 scale-110'
                                        : isCompleted
                                            ? 'border-green-500 bg-green-50 text-green-500'
                                            : 'border-slate-200 bg-slate-50 text-slate-400'
                                    }
                                `}
                            >
                                {isCompleted ? <Check size={18} /> : <step.icon size={18} />}
                            </div>
                            <span
                                className={`text-xs font-medium transition-colors duration-300 mt-1
                                    ${isActive ? 'text-teal-700 font-bold' : isCompleted ? 'text-green-600' : 'text-slate-500'}
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
