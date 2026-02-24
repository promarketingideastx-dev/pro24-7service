'use client';

import { useEffect, useState } from 'react';
import { EmployeeService, EmployeeData } from '@/services/employee.service';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TeamTabProps {
    businessId: string;
}

function AvatarCircle({ emp }: { emp: EmployeeData }) {
    const GRADIENTS = [
        'from-violet-500 to-indigo-600',
        'from-rose-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-emerald-500 to-teal-600',
        'from-sky-500 to-blue-600',
        'from-fuchsia-500 to-purple-600',
    ];
    const gradient = GRADIENTS[emp.name.charCodeAt(0) % GRADIENTS.length];

    if (emp.photoUrl) {
        return (
            <img
                src={emp.photoUrl}
                alt={emp.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 mx-auto"
            />
        );
    }
    return (
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-2xl mx-auto border-2 border-slate-200`}>
            {emp.name.charAt(0).toUpperCase()}
        </div>
    );
}

export default function TeamTab({ businessId }: TeamTabProps) {
    const t = useTranslations('business');
    const [members, setMembers] = useState<EmployeeData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        EmployeeService.getEmployees(businessId)
            .then(emps => setMembers(emps.filter(e => e.active)))
            .finally(() => setLoading(false));
    }, [businessId]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-slate-300 border-t-[#14B8A6] rounded-full animate-spin" />
            </div>
        );
    }

    if (members.length === 0) {
        return (
            <div className="flex flex-col items-center py-16 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Users size={28} />
                </div>
                <p className="text-slate-400 text-sm">{t('publicProfile.noTeamMembers')}</p>
            </div>
        );
    }

    // Map stable roleType ids to translation keys
    const ROLE_KEY_MAP: Record<string, string> = {
        manager: 'team.roleManager',
        reception: 'team.roleReception',
        customer_service: 'team.roleCustomerService',
        sales_marketing: 'team.roleSales',
        technician: 'team.roleTechnician',
        assistant: 'team.roleAssistant',
        other: 'team.roleOther',
    };

    return (
        <div className="px-4 py-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-5 tracking-wider">
                {t('publicProfile.ourTeam')}
            </h3>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
                {members.map(emp => {
                    // For 'other': use the custom text if set, otherwise fall back to translated 'Other'
                    const roleLabel = emp.roleType === 'other'
                        ? emp.roleCustom || t('team.roleOther')
                        : t(ROLE_KEY_MAP[emp.roleType] ?? 'agenda.staffDefault');

                    return (
                        <div
                            key={emp.id}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-slate-200 hover:border-[#14B8A6]/20 transition-colors"
                        >
                            <AvatarCircle emp={emp} />
                            <div className="text-center mt-1">
                                <p className="text-slate-900 font-semibold text-sm leading-tight">{emp.name}</p>
                                {emp.role && (
                                    <p className="text-[#0F766E] text-xs font-medium mt-0.5">{emp.role}</p>
                                )}
                                <p className="text-slate-500 text-[11px] mt-0.5">{roleLabel}</p>
                                {emp.description && (
                                    <p className="text-slate-400 text-[11px] mt-2 leading-relaxed line-clamp-3">
                                        {emp.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
