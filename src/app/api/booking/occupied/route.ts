import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic'; // Ensure no Vercel caching for availability

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');
        const date = searchParams.get('date');

        if (!businessId || !date) {
            return NextResponse.json({ error: 'Faltan parámetros businessId o date' }, { status: 400 });
        }

        // Utiliza Firebase Admin (ignora Security Rules) para leer la tabla estructurada
        const bookingsRef = db.collection('bookings');
        
        // Consultar de forma segura únicamente los registros relevantes
        const snapshot = await bookingsRef
            .where('businessId', '==', businessId)
            .where('date', '==', date)
            .where('status', 'in', ['pending', 'confirmed']) // solo ocupa el slot si está pendiente o confirmado
            .get();

        if (snapshot.empty) {
            return NextResponse.json({ occupied: [] }, { status: 200 });
        }

        const occupiedTimes = snapshot.docs.map(doc => {
            const data = doc.data();
            return data.time as string;
        });

        return NextResponse.json({ occupied: occupiedTimes }, { status: 200 });
    } catch (error: any) {
        console.error('[API Occupied Slots] Error interno:', error);
        return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
    }
}
