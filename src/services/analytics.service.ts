import { addDoc, collection, serverTimestamp, query, orderBy, limit, onSnapshot, where, getDocs, count, getAggregateFromServer, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Types ────────────────────────────────────────────────────────────────────
export type AnalyticsEventType =
    | 'profile_view'          // User viewed a business profile
    | 'services_view'         // User clicked Services tab
    | 'gallery_view'          // User clicked Gallery tab
    | 'reviews_view'          // User clicked Reviews tab
    | 'booking_modal_open'    // User opened the booking modal
    | 'booking_step_service'  // User selected a service
    | 'booking_step_datetime' // User selected date/time
    | 'booking_step_contact'  // User filled in contact form
    | 'booking_confirmed'     // Booking successfully submitted
    | 'share_profile'         // User shared the profile
    | 'whatsapp_click'        // User clicked WhatsApp button
    | 'website_click';        // User clicked website link

export interface AnalyticsEvent {
    type: AnalyticsEventType;
    businessId: string;
    sessionId?: string;
    userUid?: string;       // null = anonymous
    country?: string;
    referrer?: string;
    deviceType?: 'mobile' | 'desktop' | 'tablet';
    createdAt: any;
}

export interface FunnelStep {
    key: AnalyticsEventType;
    label: string;
    emoji: string;
    count: number;
    pct: number;    // percentage relative to top of funnel
    dropPct: number; // drop from previous step
}

// ── Service ────────────────────────────────────────────────────────────────
const COL = 'analytics_events';

export const AnalyticsService = {
    /**
     * Track a funnel event — fire and forget, never blocks UI
     */
    async track(event: Omit<AnalyticsEvent, 'createdAt'>): Promise<void> {
        try {
            await addDoc(collection(db, COL), {
                ...event,
                createdAt: serverTimestamp(),
            });
        } catch { /* silent */ }
    },

    /**
     * Real-time funnel data for admin dashboard
     * Returns aggregated counts for each funnel step
     */
    onFunnelData(
        filters: { businessId?: string; country?: string; days?: number },
        callback: (steps: FunnelStep[]) => void
    ): () => void {
        const STEPS: { key: AnalyticsEventType; label: string; emoji: string }[] = [
            { key: 'profile_view', label: 'Vista de Perfil', emoji: '👁️' },
            { key: 'booking_modal_open', label: 'Abrió Modal Cita', emoji: '📅' },
            { key: 'booking_step_service', label: 'Seleccionó Servicio', emoji: '⚙️' },
            { key: 'booking_step_datetime', label: 'Seleccionó Fecha/Hora', emoji: '🕒' },
            { key: 'booking_step_contact', label: 'Ingresó Contacto', emoji: '👤' },
            { key: 'booking_confirmed', label: 'Cita Confirmada', emoji: '✅' },
        ];

        const q = query(
            collection(db, COL),
            orderBy('createdAt', 'desc'),
            limit(10000)
        );

        return onSnapshot(q, snap => {
            let events = snap.docs.map(d => d.data() as AnalyticsEvent);

            // Apply filters
            if (filters.businessId) events = events.filter(e => e.businessId === filters.businessId);
            if (filters.country && filters.country !== 'ALL') events = events.filter(e => e.country === filters.country);
            if (filters.days) {
                const cutoff = Date.now() - filters.days * 24 * 60 * 60 * 1000;
                events = events.filter(e => {
                    const t = e.createdAt?.toDate?.()?.getTime?.();
                    return t && t > cutoff;
                });
            }

            // Count per type
            const counts: Record<string, number> = {};
            events.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1; });

            const topCount = counts['profile_view'] ?? 0;

            const steps: FunnelStep[] = STEPS.map((s, i) => {
                const cnt = counts[s.key] ?? 0;
                const prevCnt = i === 0 ? cnt : (counts[STEPS[i - 1].key] ?? 0);
                return {
                    ...s,
                    count: cnt,
                    pct: topCount ? Math.round(cnt / topCount * 100) : 0,
                    dropPct: prevCnt ? Math.round((1 - cnt / prevCnt) * 100) : 0,
                };
            });

            callback(steps);
        }, () => callback([]));
    },

    /**
     * Get top businesses by profile views (last N days)
     */
    onTopBusinesses(
        limitN: number,
        callback: (businesses: { businessId: string; views: number }[]) => void
    ): () => void {
        const q = query(
            collection(db, COL),
            where('type', '==', 'profile_view'),
            orderBy('createdAt', 'desc'),
            limit(5000)
        );
        return onSnapshot(q, snap => {
            const counts: Record<string, number> = {};
            snap.docs.forEach(d => {
                const bid = d.data().businessId;
                if (bid) counts[bid] = (counts[bid] ?? 0) + 1;
            });
            const sorted = Object.entries(counts)
                .map(([businessId, views]) => ({ businessId, views }))
                .sort((a, b) => b.views - a.views)
                .slice(0, limitN);
            callback(sorted);
        }, () => callback([]));
    },
};

// ── Funnel Step definition (exported for use in public pages) ─────────────────
export const FUNNEL_STEPS_DEF: { key: AnalyticsEventType; label: string }[] = [
    { key: 'profile_view', label: 'Vista de Perfil' },
    { key: 'booking_modal_open', label: 'Modal Abierto' },
    { key: 'booking_step_service', label: 'Servicio Seleccionado' },
    { key: 'booking_step_datetime', label: 'Fecha Seleccionada' },
    { key: 'booking_step_contact', label: 'Contacto Ingresado' },
    { key: 'booking_confirmed', label: 'Cita Confirmada' },
];
