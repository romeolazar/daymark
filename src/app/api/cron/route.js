import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getNextOccurrence } from '@/lib/time';
import { sendTelegramNotification } from '@/lib/telegram';

export async function GET(req) {
  // Simple token authentication for cron endpoint
  const authHeader = req.headers.get('Authorization');
  const queryToken = req.nextUrl.searchParams.get('token');
  const expectedToken = process.env.CRON_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: 'Cron token is not configured' }, { status: 500 });
  }

  const token = authHeader?.replace('Bearer ', '') || queryToken;
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Find all active, enabled reminders
    const reminders = await prisma.reminder.findMany({
      where: { 
        enabled: true,
        event: {
          user: {
            settings: {
              telegramEnabled: true
            }
          }
        }
      },
      include: {
        event: {
          include: {
            user: {
              include: {
                settings: true
              }
            }
          }
        }
      }
    });

    const results = [];

    for (const reminder of reminders) {
      const { event } = reminder;
      const { user } = event;
      const { settings } = user;

      if (!settings.telegramBotToken || !settings.telegramChatId) {
        continue; // Settings not fully configured
      }

      // Calculate next event occurrence date (at midnight or event time)
      const baseDate = new Date(event.eventDate);
      if (event.eventTime) {
        const [hours, minutes] = event.eventTime.split(':').map(Number);
        baseDate.setHours(hours, minutes, 0, 0);
      } else {
        baseDate.setHours(0, 0, 0, 0);
      }

      const nextOccurrence = getNextOccurrence(baseDate, event.repeatType, now);
      
      // Calculate trigger date: nextOccurrence - offsetDays
      const triggerDate = new Date(nextOccurrence);
      triggerDate.setDate(triggerDate.getDate() - reminder.offsetDays);
      
      // Set the reminder trigger time on that date
      const [rHours, rMinutes] = (reminder.reminderTime || '09:00').split(':').map(Number);
      triggerDate.setHours(rHours, rMinutes, 0, 0);

      // Verify if trigger time is in the past (i.e. we are at or past the trigger time)
      const isTriggerTimeReached = now.getTime() >= triggerDate.getTime();
      
      // Make sure the trigger date is close (we don't trigger for a date far in the past that we missed)
      // We want the trigger to happen within the last 24 hours
      const isRecent = (now.getTime() - triggerDate.getTime()) < 24 * 60 * 60 * 1000;

      // Check if reminder was already sent for this specific occurrence
      // A reminder is already sent if lastSentAt is on or after the trigger date (start of day)
      const triggerDayStart = new Date(triggerDate);
      triggerDayStart.setHours(0, 0, 0, 0);

      const alreadySent = reminder.lastSentAt && new Date(reminder.lastSentAt).getTime() >= triggerDayStart.getTime();

      if (isTriggerTimeReached && isRecent && !alreadySent) {
        // Prepare notification text
        let timeLabel = '';
        if (reminder.offsetDays === 0) {
          timeLabel = 'is today';
        } else if (reminder.offsetDays === 1) {
          timeLabel = 'is tomorrow';
        } else {
          timeLabel = `is in ${reminder.offsetDays} days`;
        }

        const dateStr = nextOccurrence.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

        const timeStr = event.eventTime ? ` at ${event.eventTime}` : '';

        const emoji = event.iconType === 'EMOJI' ? event.iconValue : '🔔';
        const messageText = `<b>${emoji} Reminder</b>\n\n<b>${event.name}</b> ${timeLabel}.\nDate: ${dateStr}${timeStr}\n${event.description ? `Notes: ${event.description}` : ''}`;

        // Send telegram message
        const telegramResult = await sendTelegramNotification(
          settings.telegramBotToken,
          settings.telegramChatId,
          messageText
        );

        if (telegramResult.success) {
          // Update lastSentAt timestamp
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { lastSentAt: now }
          });
          
          results.push({ reminderId: reminder.id, status: 'sent', eventName: event.name });
        } else {
          results.push({ reminderId: reminder.id, status: 'failed', error: telegramResult.error, eventName: event.name });
        }
      }
    }

    return NextResponse.json({ 
      processed: reminders.length, 
      dispatched: results 
    });
  } catch (error) {
    console.error('Cron reminder engine error:', error);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
