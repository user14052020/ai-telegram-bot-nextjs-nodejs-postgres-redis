import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await pool.query('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Healthcheck error', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
