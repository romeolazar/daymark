import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        settings: true,
        categories: true,
        events: {
          include: {
            reminders: true
          }
        }
      }
    });

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: user.settings ? {
        telegramEnabled: user.settings.telegramEnabled,
        telegramBotToken: user.settings.telegramBotToken,
        telegramChatId: user.settings.telegramChatId,
        defaultReminderTime: user.settings.defaultReminderTime,
        defaultViewFormat: user.settings.defaultViewFormat
      } : null,
      categories: user.categories.map(c => ({
        name: c.name,
        color: c.color,
        icon: c.icon
      })),
      events: user.events.map(e => ({
        name: e.name,
        description: e.description,
        categoryName: e.category?.name || null,
        eventDate: e.eventDate,
        eventTime: e.eventTime,
        timezone: e.timezone,
        mode: e.mode,
        repeatType: e.repeatType,
        keepOnTop: e.keepOnTop,
        iconType: e.iconType,
        iconValue: e.iconValue,
        backgroundImage: e.backgroundImage,
        reminders: e.reminders.map(r => ({
          offsetDays: r.offsetDays,
          reminderTime: r.reminderTime,
          channel: r.channel,
          enabled: r.enabled
        }))
      }))
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename=daymark_export.json'
      }
    });
  } catch (error) {
    console.error('Export API Error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    if (!data.events || !Array.isArray(data.events)) {
      return NextResponse.json({ error: 'Invalid file format. "events" array is required.' }, { status: 400 });
    }

    // 1. Process Settings (optional import)
    if (data.settings) {
      await prisma.settings.update({
        where: { userId: payload.id },
        data: {
          telegramEnabled: !!data.settings.telegramEnabled,
          telegramBotToken: data.settings.telegramBotToken || undefined,
          telegramChatId: data.settings.telegramChatId || undefined,
          defaultReminderTime: data.settings.defaultReminderTime || undefined,
          defaultViewFormat: data.settings.defaultViewFormat || undefined
        }
      });
    }

    // 2. Load current categories for lookup
    const currentCategories = await prisma.category.findMany({
      where: { userId: payload.id }
    });

    const categoryMap = new Map(); // name -> ID
    currentCategories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));

    // Import new categories
    if (data.categories && Array.isArray(data.categories)) {
      for (const cat of data.categories) {
        if (!cat.name) continue;
        const nameLower = cat.name.toLowerCase();
        
        if (!categoryMap.has(nameLower)) {
          const newCat = await prisma.category.create({
            data: {
              userId: payload.id,
              name: cat.name,
              color: cat.color || '#6b7280',
              icon: cat.icon || '🏷️'
            }
          });
          categoryMap.set(nameLower, newCat.id);
        }
      }
    }

    // 3. Import Events inside a Transaction
    let importedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const evt of data.events) {
        // Find matching category ID if name is specified
        let categoryId = null;
        if (evt.categoryName) {
          categoryId = categoryMap.get(evt.categoryName.toLowerCase()) || null;
        }

        // Create the event
        await tx.event.create({
          data: {
            userId: payload.id,
            name: evt.name,
            description: evt.description,
            categoryId,
            eventDate: new Date(evt.eventDate),
            eventTime: evt.eventTime,
            timezone: evt.timezone || 'UTC',
            mode: evt.mode || 'AUTO',
            repeatType: evt.repeatType || 'NONE',
            keepOnTop: !!evt.keepOnTop,
            iconType: evt.iconType || 'EMOJI',
            iconValue: evt.iconValue || '📅',
            backgroundImage: evt.backgroundImage,
            reminders: {
              create: (evt.reminders || []).map(r => ({
                offsetDays: r.offsetDays,
                reminderTime: r.reminderTime || '09:00',
                channel: r.channel || 'TELEGRAM',
                enabled: r.enabled !== false
              }))
            }
          }
        });
        importedCount++;
      }
    });

    return NextResponse.json({ success: true, imported: importedCount });
  } catch (error) {
    console.error('Import API Error:', error);
    return NextResponse.json({ error: 'Failed to import data: ' + error.message }, { status: 500 });
  }
}
