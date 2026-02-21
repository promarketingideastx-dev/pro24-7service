import ComingSoon from '@/components/admin/ComingSoon';
import { CreditCard } from 'lucide-react';
export default function PlansPage() {
    return <ComingSoon title="Planes & Pagos" description="Gestión de suscripciones, webhooks de Stripe y Pagadito, e ingresos por país." fase="Fase D" icon={<CreditCard size={28} />} />;
}
