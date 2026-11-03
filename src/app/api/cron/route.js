import { NextResponse } from 'next/server';
import { processReminders } from '@/lib/reminders';

// Reminders are dispatched automatically by the in-process scheduler
// (see src/instrumentation.js). This endpoint remains as an optional manual
// trigger and is only enabled when CRON_TOKEN is set.
export async function GET(req) {
  const expectedToken = process.env.CRON_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: 'Manual cron trigger is disabled' }, { status: 404 });
  }

  const authHeader = req.headers.get('Authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const token = authHeader?.replace('Bearer ', '') || queryToken;

  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cron reminder engine error:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
