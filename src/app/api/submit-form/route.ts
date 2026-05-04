import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/server/rate-limit';
import { escapeTelegramHtml } from '@/lib/server/telegram';

const UZS_TO_USD_RATE = 1 / 12700;
const DEFAULT_N8N_WEBHOOK_URL = 'https://n8n-automation-agent-982617914297.us-central1.run.app/webhook/lead-capture';

async function sendMetaConversionEvent(data: any) {
    const accessToken = process.env.META_API_ACCESS_TOKEN;
    const pixelId = '1134785364752294';
    if (!accessToken || !pixelId) return;

    const url = `https://graph.facebook.com/v20.0/${pixelId}/events`;
    const valueInUzs = data.totalPrice || 0;
    const valueInUsd = (valueInUzs * UZS_TO_USD_RATE).toFixed(2);

    const payload = {
        data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            user_data: {
                ph: data.phone ? [data.phone] : [],
                fn: data.fullName ? [data.fullName] : [],
            },
            custom_data: {
                value: valueInUsd,
                currency: 'USD',
            }
        }],
        access_token: accessToken,
    };
    
    try {
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.error('Meta CAPI error:', e);
    }
}

async function sendGAConversionEvent(data: any) {
    const gaApiSecret = process.env.GA_API_SECRET;
    const gaMeasurementId = 'G-B3ZSKB40XY';
    if (!gaApiSecret) return;

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${gaMeasurementId}&api_secret=${gaApiSecret}`;
    const payload = {
        client_id: data.phone || data.fullName || 'unknown',
        events: [{
            name: 'generate_lead',
            params: {
                value: data.totalPrice || 0,
                currency: 'UZS',
            }
        }],
    };

    try {
        await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload),
        });
    } catch (e) {
        console.error('GA4 error:', e);
    }
}

async function sendToN8n(data: any) {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || DEFAULT_N8N_WEBHOOK_URL;
    try {
        await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                source: data.source || 'website_contact_form',
                timestamp: new Date().toISOString()
            }),
        });
    } catch (e) {
        console.error('n8n error:', e);
    }
}

function getAmoCrmBaseUrl() {
    const rawDomain = process.env.AMOCRM_DOMAIN || process.env.AMOCRM_SUBDOMAIN;
    if (!rawDomain) return null;

    const cleanDomain = rawDomain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .trim();

    if (!cleanDomain) return null;
    return `https://${cleanDomain.includes('.') ? cleanDomain : `${cleanDomain}.amocrm.ru`}`;
}

function normalizePhone(phone: unknown) {
    return String(phone || '').replace(/[^\d+]/g, '');
}

async function sendToAmoCrm(data: any) {
    const accessToken = process.env.AMOCRM_ACCESS_TOKEN;
    const baseUrl = getAmoCrmBaseUrl();

    if (!accessToken || !baseUrl) {
        return { ok: false, skipped: true, error: 'AmoCRM configuration is missing' };
    }

    const fullName = String(data.fullName || 'Website lead').trim();
    const phone = normalizePhone(data.phone);
    const telegram = String(data.telegram || '').replace(/^@/, '').trim();
    const source = data.source || 'website_contact_form';
    const price = Number(data.totalPrice) || 0;

    const details = [
        `Manba: ${source}`,
        data.lang ? `Til: ${String(data.lang).toUpperCase()}` : '',
        data.phone ? `Telefon: ${data.phone}` : '',
        telegram ? `Telegram: @${telegram}` : '',
        data.role ? `Rol: ${data.role}` : '',
        data.revenue ? `Oborot: ${data.revenue}` : '',
        data.ambition ? `Maqsad: ${data.ambition}` : '',
        data.pain ? `To'siq: ${data.pain}` : '',
        data.budget ? `Byudjet: ${data.budget}` : '',
        data.packageSummary ? `Paket: ${data.packageSummary}` : '',
        price ? `Narx: ${price.toLocaleString('fr-FR')} so'm` : '',
    ].filter(Boolean).join('\n');

    const contactFields: any[] = [];
    if (phone) {
        contactFields.push({
            field_code: 'PHONE',
            values: [{ value: phone, enum_code: 'WORK' }],
        });
    }
    const leadPayload: any[] = [{
        name: `Jon.Branding site: ${fullName}`,
        price,
        tags_to_add: [
            { name: 'jonbranding.uz' },
            { name: 'website' },
            { name: String(source) },
        ],
        _embedded: {
            contacts: [{
                first_name: fullName,
                ...(contactFields.length ? { custom_fields_values: contactFields } : {}),
            }],
        },
    }];

    const createResponse = await fetch(`${baseUrl}/api/v4/leads/complex`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadPayload),
    });
    const createResult: any = await createResponse.json().catch(() => null);

    if (!createResponse.ok) {
        const message = createResult?.title || createResult?.detail || createResult?.message || `AmoCRM HTTP ${createResponse.status}`;
        throw new Error(message);
    }

    const leadId = Array.isArray(createResult)
        ? createResult[0]?.id
        : createResult?._embedded?.items?.[0]?.id || createResult?._embedded?.leads?.[0]?.id || createResult?.id;

    if (leadId && details) {
        await fetch(`${baseUrl}/api/v4/leads/${leadId}/notes`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
                note_type: 'common',
                params: { text: details },
            }]),
        }).catch((error) => console.error('AmoCRM note error:', error));
    }

    return { ok: true, leadId };
}

async function sendTelegramMessage(botToken: string, payload: any) {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const result: any = await response.json().catch(() => null);

    if (!response.ok || result?.ok === false) {
        throw new Error(result?.description || `Telegram HTTP ${response.status}`);
    }

    return result;
}

export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (isRateLimited(`submit-form:${ip}`, 5, 60 * 60 * 1000)) {
        return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const messageThreadId = process.env.TELEGRAM_MESSAGE_THREAD_ID;

    if (!botToken || !chatId) {
        return NextResponse.json({ ok: false, error: "Server configuration error" }, { status: 500 });
    }

    try {
        const body = await request.json();
        const sanitizedBody: any = Object.fromEntries(
            Object.entries(body).map(([key, value]) => [
                key,
                typeof value === 'string' ? escapeTelegramHtml(value) : value,
            ])
        );
        const { 
            fullName, phone, telegram, 
            role, revenue, ambition, pain, budget, 
            source, lang, packageSummary, totalPrice 
        } = sanitizedBody;

        if (!fullName || !phone) {
            return NextResponse.json({ ok: false, error: "Required fields missing" }, { status: 400 });
        }
        
        let telegramMessage = '';

        if (packageSummary && packageSummary.includes("Yangi patent arizasi")) {
            telegramMessage = `
<b>🔔 Yangi patent arizasi (Jon.Branding)</b>

${packageSummary.replace('Brend:', `🏢 Brend:`).replace('Faoliyat turlari:', `📄 Faoliyat turlari:`)}

👤 <b>Ism:</b> ${fullName}
📞 <b>Telefon:</b> ${phone}
            `.trim();

        } else if (packageSummary && packageSummary.includes("Brending-test natijasi")) {
            telegramMessage = `
<b>📝 Yangi Quiz Natijasi (Jon.Branding)</b>

<b>Mijoz:</b> ${fullName}
<b>Telefon:</b> ${phone}
<b>Natija:</b> ${packageSummary}
`.trim();
        } else {
            telegramMessage = `
🔥 <b>Yangi Kvalifikatsiyalangan Lead!</b>
🌍 Til: #${lang?.toUpperCase() || 'UZ'} | 🚀 Manba: #${source || 'website'} ${source?.includes('lead_magnet') ? '#LeadMagnet' : ''}

👤 <b>MIJOZ MA'LUMOTLARI:</b>
├ 📛 Ism: ${fullName}
├ 📞 Tel: ${phone}
└ ✈️ TG: ${telegram ? '@' + telegram.replace('@', '') : 'Noma\'lum'}

🏢 <b>BIZNES SNAPSHOT:</b>
├ 🎭 Rol: ${role || 'Kiritilmagan'}
├ 💰 Oborot: ${revenue || 'Kiritilmagan'}
├ 🎯 Maqsad: ${ambition || 'Kiritilmagan'}
└ ⚠️ To'siq: ${pain || 'Kiritilmagan'}

💸 <b>INVESTITSIYA:</b>
└ 💴 Byudjet: ${budget || 'Kiritilmagan'}

${packageSummary ? `--- \n📦 Paket: ${packageSummary} \n💰 Narx: ${totalPrice?.toLocaleString('fr-FR')} so'm` : ''}

#LeadQuality #StrategicSession
            `.trim();
        }

        const telegramPayload: any = { 
            chat_id: chatId, 
            text: telegramMessage,
            parse_mode: 'HTML'
        };
        if (messageThreadId) telegramPayload.message_thread_id = messageThreadId;
        
        await sendTelegramMessage(botToken, telegramPayload);

        const amoCrmResult = await sendToAmoCrm(body).catch(async (error) => {
            console.error('AmoCRM lead error:', error);
            await sendTelegramMessage(botToken, {
                ...telegramPayload,
                text: `âš ï¸ <b>AmoCRMga lead tushmadi</b>\n\nSabab: ${escapeTelegramHtml(error?.message || error)}\n\nMijoz: ${escapeTelegramHtml(fullName)}\nTelefon: ${escapeTelegramHtml(phone)}`,
            }).catch((telegramError) => console.error('AmoCRM failure Telegram alert error:', telegramError));
            return { ok: false, error: error?.message || String(error) };
        });

        sendMetaConversionEvent(body).catch(() => {});
        sendGAConversionEvent(body).catch(() => {});
        sendToN8n(body).catch(() => {});

        return NextResponse.json({ ok: true, integrations: { telegram: true, amoCrm: amoCrmResult.ok } });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
