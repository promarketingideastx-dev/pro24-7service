import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, getDoc, Timestamp, updateDoc, limit } from 'firebase/firestore';
import { Resend } from 'resend';

// NOTE: Since firebase/firestore's runTransaction uses web SDK, Edge runtime may have issues.
// Use nodejs just in case for complex nested serverless firebase operations.
export const runtime = 'nodejs';

function chatReminderHtml(data: {
    messageCount: number;
    senderName: string;
    textPreview: string;
    chatUrl: string;
}, lang: string) {
    const texts = {
        es: {
            title: "Nuevo(s) mensaje(s) sin leer",
            greeting: `Hola, tienes ${data.messageCount} mensaje(s) nuevo(s) de ${data.senderName}:`,
            btn: "Ver y responder en el Chat",
            footer: "Pro24/7YA · Este es un mensaje automático."
        },
        en: {
            title: "New unread message(s)",
            greeting: `Hello, you have ${data.messageCount} new message(s) from ${data.senderName}:`,
            btn: "View and reply in Chat",
            footer: "Pro24/7YA · This is an automated message."
        },
        pt: {
            title: "Nova(s) mensagem(ns) não lida(s)",
            greeting: `Olá, você tem ${data.messageCount} nova(s) mensagem(ns) de ${data.senderName}:`,
            btn: "Ver e responder no Chat",
            footer: "Pro24/7YA · Esta é uma mensagem automática."
        }
    };

    const t = texts[lang as keyof typeof texts] || texts['en'];

    return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#0d1f3c,#0882b0);border-radius:16px;padding:28px 32px;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px;">
        <span style="font-size:28px;">💬</span>
        <span style="font-size:20px;font-weight:700;color:#fff;">${t.title}</span>
      </div>
    </div>
    <div style="background:#ffffff;border-radius:16px;padding:28px 32px;margin-bottom:16px;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
      <p style="color:#0f172a;font-size:16px;font-weight:600;margin:0 0 16px;">${t.greeting}</p>
      
      <div style="background:#f8fafc;border-left:4px solid #06b6d4;padding:16px;margin-bottom:24px;border-radius:0 8px 8px 0;">
        <p style="color:#475569;font-size:14px;margin:0;font-style:italic;">"${data.textPreview}"</p>
      </div>

      <div style="text-align:center;">
        <a href="${data.chatUrl}" style="display:inline-block;background:#14b8a6;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;">${t.btn}</a>
      </div>
    </div>
    <p style="color:#94a3b8;font-size:11px;text-align:center;margin:0;">${t.footer}</p>
  </div>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');

    // 1) CRON security (deny by default):
    if (!process.env.CRON_SECRET) {
        console.error('[cron/chat-retries] CRON_SECRET is not defined');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    try {
        // Fetch jobs that are 'pending' AND due, OR 'processing' but stuck (recovery)
        const tenMinsAgo = new Date(now.getTime() - 10 * 60000);

        // Note: Firestore requires composite indexes for complex OR queries. 
        // We will fetch pending jobs first. The recovery logic runs in a separate pass if needed, 
        // or we handle it in the transaction if we were scanning all jobs.
        // For efficiency, we query 'pending' normally.
        const qPending = query(
            collection(db, 'notification_jobs'),
            where('status', '==', 'pending'),
            where('scheduledFor', '<=', Timestamp.fromDate(now)),
            limit(50)
        );
        const snapPending = await getDocs(qPending);

        // 2) Lock robusto - Recuperación de stuck jobs
        const qStuck = query(
            collection(db, 'notification_jobs'),
            where('status', '==', 'processing'),
            where('processingAt', '<=', Timestamp.fromDate(tenMinsAgo)),
            limit(10)
        );
        const snapStuck = await getDocs(qStuck);

        if (snapPending.empty && snapStuck.empty) {
            return NextResponse.json({ ok: true, processed: 0, recovered: 0, reason: 'no_jobs' });
        }

        const resend = new Resend(process.env.RESEND_API_KEY || 're_fail');
        let processed = 0;
        let recoveredCount = 0;

        // --- Process Stuck Jobs (Recovery) ---
        for (const stuckDoc of snapStuck.docs) {
            const jobId = stuckDoc.id;
            try {
                await updateDoc(doc(db, 'notification_jobs', jobId), {
                    status: 'pending',
                    processingAt: null,
                    updatedAt: Timestamp.fromDate(now)
                });
                recoveredCount++;
            } catch (e) {
                console.error('[cron/chat-retries] Error recovering stuck job:', jobId, e);
            }
        }

        // --- Process Pending Jobs ---
        for (const jobDoc of snapPending.docs) {
            const jobId = jobDoc.id;
            try {
                // a) Transaction: Lock pending -> processing
                const lockedJob = await runTransaction(db, async (t) => {
                    const docRef = doc(db, 'notification_jobs', jobId);
                    const current = await t.get(docRef);

                    if (!current.exists() || current.data().status !== 'pending') {
                        return null;
                    }

                    const data = current.data();
                    // 2) Lock robusto: guardar processingAt=now
                    t.update(docRef, {
                        status: 'processing',
                        processingAt: Timestamp.fromDate(now),
                        updatedAt: Timestamp.fromDate(now)
                    });
                    return data;
                });

                if (!lockedJob) continue; // Locked or updated by another worker concurrent execution

                const {
                    relatedEntityId: chatId,
                    userRole,
                    userId,
                    userEmail,
                    payload,
                    messageCount,
                    attempts,
                    maxAttempts = 2
                } = lockedJob;

                // b) Verify "visto" via chat metadata unread tags
                const chatSnap = await getDoc(doc(db, 'chats', chatId));
                const chatData = chatSnap.exists() ? chatSnap.data() : null;
                const jobRef = doc(db, 'notification_jobs', jobId);

                // 3) "Visto" vs "chat no existe"
                if (!chatSnap.exists() || !chatData) {
                    await updateDoc(jobRef, {
                        status: 'failed',
                        errorMessage: 'chat_not_found',
                        processingAt: null,
                        updatedAt: Timestamp.fromDate(new Date())
                    });
                    continue;
                }

                const unreadField = userRole === 'client' ? 'unreadClient' : 'unreadBusiness';
                const unreadCount = chatData[unreadField] || 0;

                // Cancelled solo si unreadCount == 0
                if (unreadCount === 0) {
                    await updateDoc(jobRef, {
                        status: 'cancelled',
                        processingAt: null,
                        updatedAt: Timestamp.fromDate(new Date())
                    });
                    continue;
                }

                // Prepare Email HTML and lang
                let rawLang = 'en';
                if (userRole === 'client') {
                    const uSnap = await getDoc(doc(db, 'users', userId));
                    rawLang = uSnap.data()?.language || 'en';
                } else if (userRole === 'business') {
                    const bSnap = await getDoc(doc(db, 'businesses_private', userId));
                    rawLang = bSnap.data()?.language || 'en';
                }

                // 4) Normalización de idioma
                let lang = 'en';
                if (rawLang.startsWith('es')) lang = 'es';
                else if (rawLang.startsWith('pt')) lang = 'pt-BR'; // Match next.js /pt-BR routing

                // Note: Ensure texts template object supports 'pt-BR' key instead of 'pt' if needed. 
                // We'll map pt-BR to pt for the HTML template if it uses 'pt' internally, 
                // but use pt-BR for the URL to avoid Next.js 404s.
                const templateLang = lang === 'pt-BR' ? 'pt' : lang;

                const chatUrl = `https://pro247ya.com/${lang}/${userRole === 'client' ? 'user/messages' : 'business/messages'}`;
                const subjects = {
                    es: `Tienes ${messageCount} mensaje(s) nuevo(s)`,
                    en: `You have ${messageCount} new message(s)`,
                    'pt-BR': `Você tem ${messageCount} nova(s) mensagem(ns)`,
                    pt: `Você tem ${messageCount} nova(s) mensagem(ns)`
                };
                const subject = subjects[lang as keyof typeof subjects] || subjects['en'];

                // c) Send Email via Resend
                try {
                    const sendResult = await resend.emails.send({
                        from: 'onboarding@resend.dev', // Default local wrapper test identity
                        to: userEmail,
                        subject,
                        html: chatReminderHtml({
                            messageCount,
                            senderName: payload.senderName || 'Usuario',
                            textPreview: payload.textPreview || '',
                            chatUrl
                        }, templateLang),
                    });

                    if (sendResult.error) {
                        // Resend returns error object explicitly
                        throw new Error(sendResult.error.message || 'Resend API returned an error');
                    }

                    // d) If success iteration bounds
                    if (attempts < maxAttempts - 1) {
                        await updateDoc(jobRef, {
                            attempts: attempts + 1,
                            status: 'pending',
                            processingAt: null,
                            scheduledFor: Timestamp.fromDate(new Date(now.getTime() + 15 * 60000)),
                            updatedAt: Timestamp.fromDate(new Date())
                        });
                    } else {
                        await updateDoc(jobRef, {
                            status: 'completed',
                            attempts: attempts + 1,
                            processingAt: null,
                            updatedAt: Timestamp.fromDate(new Date())
                        });
                    }

                } catch (err: any) {
                    // e) and f) Error Handling Resend
                    const errorMessage = err.message || 'Fatal email delivery error';

                    // 5) Error handling Resend: Clasificar transitorio vs fatal
                    // Transitorios: Rate limits (429), Server Errors (5xx), Timeout.
                    // Fatales: Invalid API Key (401), Validation (403), etc.
                    // Resend JS SDK throw might not have typical Axios err.response.status
                    // We check if it's a known transient message or type
                    const isTransient =
                        errorMessage.toLowerCase().includes('rate limit') ||
                        errorMessage.toLowerCase().includes('timeout') ||
                        errorMessage.toLowerCase().includes('internal server error') ||
                        errorMessage.toLowerCase().includes('500');

                    if (isTransient) {
                        await updateDoc(jobRef, {
                            status: 'pending',
                            processingAt: null,
                            errorMessage, // Guardar errorMessage siempre
                            scheduledFor: Timestamp.fromDate(new Date(now.getTime() + 5 * 60000)),
                            updatedAt: Timestamp.fromDate(new Date())
                        });
                    } else {
                        await updateDoc(jobRef, {
                            status: 'failed',
                            processingAt: null,
                            errorMessage, // Guardar errorMessage siempre
                            updatedAt: Timestamp.fromDate(new Date())
                        });
                    }
                }

                processed++;
            } catch (jobErr) {
                console.error('[cron/chat-retries] Error processing job:', jobId, jobErr);
            }
        }

        return NextResponse.json({ ok: true, processed });
    } catch (globalErr: any) {
        console.error('[cron/chat-retries] Target Query Failed:', globalErr);
        return NextResponse.json({ error: globalErr.message }, { status: 500 });
    }
}
