import { NextResponse } from 'next/server';

const OISHA_API_URL = process.env.OISHA_API_URL || process.env.NEXT_PUBLIC_OISHA_API_URL;
const OISHA_SECRET = process.env.OISHA_SECRET_KEY;

export async function POST(request: Request) {
  if (!OISHA_API_URL || !OISHA_SECRET) {
    return NextResponse.json({ ok: false, error: 'Oisha is not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const action = body?.action;
    const userId = String(body?.user_id || '').trim();

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Missing user_id' }, { status: 400 });
    }

    if (action === 'history') {
      const response = await fetch(`${OISHA_API_URL}/api/chat/history/${encodeURIComponent(userId)}?secret_key=${encodeURIComponent(OISHA_SECRET)}`);
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    if (action === 'send') {
      const text = String(body?.text || '').trim();
      if (!text) {
        return NextResponse.json({ ok: false, error: 'Missing text' }, { status: 400 });
      }

      const response = await fetch(`${OISHA_API_URL}/api/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          text,
          secret_key: OISHA_SECRET,
        }),
      });
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Oisha request failed' }, { status: 500 });
  }
}
