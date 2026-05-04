
import { NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/server/rate-limit';
import { escapeTelegramMarkdownCode } from '@/lib/server/telegram';

export async function POST(request: Request) {
    const ip = getClientIp(request);
    if (isRateLimited(`report-error:${ip}`, 10, 60 * 1000)) {
        return NextResponse.json({ ok: true, reported: false }, { status: 429 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error("Server Configuration Error: Telegram token or chat ID is missing in environment variables for error reporting.");
        return NextResponse.json({ ok: false, error: "Serverda Telegram sozlamalari mavjud emas." }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { message, stack, pathname, userInfo } = body;
        const safeMessage = escapeTelegramMarkdownCode(message);
        const safeStack = escapeTelegramMarkdownCode(stack || 'Mavjud emas');
        const safeUserInfo = escapeTelegramMarkdownCode(userInfo || 'Noma\'lum');

        if (!message) {
            return NextResponse.json({ ok: false, error: "Xatolik matni mavjud emas" }, { status: 400 });
        }

        const telegramMessage = `
🆘 Jon.Branding Saytida Xatolik!

Sahifa: ${pathname || 'Noma\'lum'}

Xato:
\`\`\`
${safeMessage}
\`\`\`

Stack Trace:
\`\`\`
${safeStack}
\`\`\`

Foydalanuvchi ma'lumoti:
\`\`\`
${safeUserInfo}
\`\`\`
        `.trim();
        
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const payload = {
            chat_id: chatId,
            text: telegramMessage,
            parse_mode: 'Markdown'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorResult = await response.json();
            console.error("Telegram API Error while reporting error:", errorResult);
            // Still return ok to prevent error loops on the client
            return NextResponse.json({ ok: true, reported: false });
        }

        return NextResponse.json({ ok: true, reported: true });

    } catch (error: any) {
        console.error("Internal Server Error in error reporting endpoint:", error);
        // Don't return an error to the client to avoid an error loop
        return NextResponse.json({ ok: true, reported: false });
    }
}
