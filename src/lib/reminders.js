import prisma from './db';
import { getReminderSchedule } from './time';
import { sendTelegramNotification, escapeTelegramHtml } from './telegram';

/**
 * Checks every enabled reminder and sends the ones that are due.
 * Called by the in-process scheduler (src/lib/scheduler.js) and by the
 * token-protected /api/cron endpoint (manual trigger).
 */
export async function processReminders() {
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

    // Next occurrence and trigger time, in the event's timezone (not the server's)
    const { occurrence: nextOccurrence, triggerAt: triggerDate, triggerDayStart } =
      getReminderSchedule(event, reminder, event.timezone || user.timezone, now);

    // Verify if trigger time is in the past (i.e. we are at or past the trigger time)
    const isTriggerTimeReached = now.getTime() >= triggerDate.getTime();

    // Make sure the trigger date is close (we don't trigger for a date far in the past that we missed)
    // We want the trigger to happen within the last 24 hours
    const isRecent = (now.getTime() - triggerDate.getTime()) < 24 * 60 * 60 * 1000;

    // Check if reminder was already sent for this specific occurrence
    // A reminder is already sent if lastSentAt is on or after the trigger date (start of day)
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

      // User text must be escaped, Telegram rejects messages with stray HTML characters
      const emoji = event.iconType === 'EMOJI' ? escapeTelegramHtml(event.iconValue) : '🔔';
      const messageText = `<b>${emoji} Reminder</b>\n\n<b>${escapeTelegramHtml(event.name)}</b> ${timeLabel}.\nDate: ${dateStr}${timeStr}\n${event.description ? `Notes: ${escapeTelegramHtml(event.description)}` : ''}`;

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

  return {
    processed: reminders.length,
    dispatched: results
  };
}
