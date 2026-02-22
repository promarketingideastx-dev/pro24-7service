import BusinessWizard from '@/components/business/BusinessWizard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Crear Perfil de Negocio | PRO24/7',
    description: 'Únete a la plataforma líder de servicios premium.',
};

export default function NewBusinessPage() {
    return <BusinessWizard />;
}
