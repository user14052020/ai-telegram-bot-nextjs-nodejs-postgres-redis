import { NextResponse } from 'next/server';
import { analyzeByUsername } from '@/lib/services/analysis';
import { ServiceError, ValidationError } from '@/lib/services/errors';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === 'string' ? body.username.trim() : '';

  if (!username) {
    const error = new ValidationError('username is required');
    return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
  }

  try {
    const result = await analyzeByUsername(username);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ServiceError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error('Analyze error', error);
    return NextResponse.json({ ok: false, error: 'Unknown error' }, { status: 500 });
  }
}
