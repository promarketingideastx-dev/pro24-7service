'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { AlertTriangle, UserCheck, LogOut } from 'lucide-react';
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import { IdentityService } from '@/services/identity.service';
import { useState } from 'react';

export default function ReactivateAccountPage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const locale = useLocale();
    const [loading, setLoading] = useState(false);

    const handleReactivate = async () => {
        if (!user || !user.email) return;
        setLoading(true);
        try {
            await UserService.updateUserProfile(user.uid, { 
                accountStatus: 'active',
                reactivatedAt: new Date().toISOString()
            });
            await IdentityService.updateAccountStatus(user.email, 'active');
            
            window.location.href = `/${locale}/profile`; // Force reload to re-read everything in fresh state
        } catch (error) {
            console.error(error);
            alert('Error al reactivar cuenta');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await AuthService.logout();
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 shadow-xl border border-slate-100 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Cuenta Desactivada</h1>
                <p className="text-slate-600 mb-6">
                    Esta cuenta ({user?.email}) se encuentra desactivada o archivada. 
                    Si eres tú y quieres volver a la plataforma, puedes reactivar tu identidad histórica.
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={handleReactivate}
                        disabled={loading}
                        className="w-full bg-[#14B8A6] hover:bg-[#0d9488] text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Reactivando...' : <><UserCheck className="w-4 h-4" /> Reactivar Cuenta</>}
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full text-slate-500 hover:text-slate-800 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" /> Cancelar y salir
                    </button>
                </div>
            </div>
        </div>
    );
}
