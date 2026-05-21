import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest, hashPassword } from '@/lib/auth';

export async function GET(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.settings.findUnique({
      where: { userId: payload.id }
    });

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        email: true,
        displayName: true,
        timezone: true
      }
    });

    return NextResponse.json({
      profile: user,
      settings: settings
    });
  } catch (error) {
    console.error('Fetch Settings Error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { 
      displayName, 
      timezone,
      telegramEnabled,
      telegramBotToken,
      telegramChatId,
      defaultReminderTime,
      defaultViewFormat,
      timeFormat,
      dateFormat,
      password // Optional password update
    } = data;

    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (timezone) updateData.timezone = timezone;
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    // Update user profile and settings in transaction
    const result = await prisma.$transaction(async (tx) => {
      let updatedUser = null;
      if (Object.keys(updateData).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: payload.id },
          data: updateData,
          select: { email: true, displayName: true, timezone: true }
        });
      }

      const updatedSettings = await tx.settings.update({
        where: { userId: payload.id },
        data: {
          telegramEnabled: !!telegramEnabled,
          telegramBotToken: telegramBotToken !== undefined ? telegramBotToken : undefined,
          telegramChatId: telegramChatId !== undefined ? telegramChatId : undefined,
          defaultReminderTime: defaultReminderTime || undefined,
          defaultViewFormat: defaultViewFormat || undefined,
          timeFormat: timeFormat || undefined,
          dateFormat: dateFormat || undefined
        }
      });

      return { user: updatedUser, settings: updatedSettings };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update Settings Error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
