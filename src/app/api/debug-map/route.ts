import { db } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userDoc = await db.collection('users').doc('SVHpyWI0YPahtFhFhRBc8maCQyy2').get();
    const data = userDoc.data();
    
    return new Response(JSON.stringify({ 
      javiRios: {
         roles: data?.roles,
         isBusinessActive: data?.isBusinessActive,
         businessProfileId: data?.businessProfileId
      }
    }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
