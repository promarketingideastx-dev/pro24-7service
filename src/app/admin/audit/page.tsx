import ComingSoon from '@/components/admin/ComingSoon';
import { BookOpen } from 'lucide-react';
export default function AuditPage() {
    return <ComingSoon title="Audit Log" description="Registro inmutable de todas las acciones administrativas en el CRM." fase="Fase C" icon={<BookOpen size={28} />} />;
}
