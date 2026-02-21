import ComingSoon from '@/components/admin/ComingSoon';
import { Bell } from 'lucide-react';
export default function NotificationsPage() {
    return <ComingSoon title="Notificaciones" description="Envío de notificaciones push y en-app por país o segmento de usuarios." fase="Fase B" icon={<Bell size={28} />} />;
}
