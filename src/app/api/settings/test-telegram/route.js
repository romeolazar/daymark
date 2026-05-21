import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { botToken, chatId } = await req.json();

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Token and Chat ID are required' }, { status: 400 });
    }

    const result = await sendTelegramNotification(
      botToken,
      chatId,
      `📅📌 <b>Daymark Notification Test</b>\n\nYour Telegram bot configuration is working successfully! Keep tracking your milestones!`
    );

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: result.error || 'Failed to send message' }, { status: 400 });
    }
  } catch (error) {
    console.error('Test Telegram Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
