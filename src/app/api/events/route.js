import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.event.findMany({
      where: { userId: payload.id },
      include: {
        category: true,
        reminders: true
      },
      orderBy: [
        { keepOnTop: 'desc' },
        { eventDate: 'asc' }
      ]
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Fetch Events Error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { 
      name, 
      description, 
      categoryId, 
      eventDate, 
      eventTime, 
      timezone, 
      mode, 
      repeatType, 
      keepOnTop, 
      iconType, 
      iconValue,
      backgroundImage,
      reminders // Expecting array like [{offsetDays: 1, reminderTime: "09:00", enabled: true}]
    } = data;

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Name and event date are required' }, { status: 400 });
    }

    // Process reminders data
    const remindersCreate = (reminders || []).map(r => ({
      offsetDays: parseInt(r.offsetDays, 10),
      reminderTime: r.reminderTime || '09:00',
      channel: 'TELEGRAM',
      enabled: r.enabled !== false
    }));

    const event = await prisma.event.create({
      data: {
        userId: payload.id,
        name,
        description,
        categoryId: categoryId || null,
        eventDate: new Date(eventDate),
        eventTime: eventTime || null,
        timezone: timezone || 'UTC',
        mode: mode || 'AUTO',
        repeatType: repeatType || 'NONE',
        keepOnTop: keepOnTop || false,
        iconType: iconType || 'EMOJI',
        iconValue: iconValue || '📅',
        backgroundImage: backgroundImage || null,
        reminders: {
          create: remindersCreate
        }
      },
      include: {
        category: true,
        reminders: true
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Create Event Error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
