import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(req, { params }) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        category: true,
        reminders: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.userId !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Fetch Event Details Error:', error);
    return NextResponse.json({ error: 'Failed to fetch event details' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    const existingEvent = await prisma.event.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existingEvent.userId !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      reminders // Expected to be full new list of reminders
    } = data;

    if (!name || !eventDate) {
      return NextResponse.json({ error: 'Name and event date are required' }, { status: 400 });
    }

    // Delete existing reminders and insert new ones inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete old reminders
      await tx.reminder.deleteMany({
        where: { eventId: id }
      });

      // Map and create new reminders
      const remindersCreate = (reminders || []).map(r => ({
        offsetDays: parseInt(r.offsetDays, 10),
        reminderTime: r.reminderTime || '09:00',
        channel: 'TELEGRAM',
        enabled: r.enabled !== false
      }));

      return tx.event.update({
        where: { id },
        data: {
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
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Update Event Error:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.userId !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete Event Error:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
