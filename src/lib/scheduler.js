import { processReminders } from './reminders';

const INTERVAL_MS = 60 * 1000;
const STARTUP_DELAY_MS = 10 * 1000;

/**
 * Runs the reminder engine every minute inside the Next.js server process.
 * Replaces the separate daymark-cron container.
 */
export function startScheduler() {
  // Guard against double start (dev hot reload, multiple register() calls)
  if (globalThis.__daymarkScheduler) return;
  globalThis.__daymarkScheduler = true;

  let running = false;

  const tick = async () => {
    if (running) return; // previous run still in progress
    running = true;
    try {
      const { dispatched } = await processReminders();
      if (dispatched.length > 0) {
        console.log(`[Reminder Scheduler] ${new Date().toISOString()} dispatched:`, dispatched);
      }
    } catch (error) {
      console.error('[Reminder Scheduler] Run failed:', error);
    } finally {
      running = false;
    }
  };

  setTimeout(() => {
    tick();
    setInterval(tick, INTERVAL_MS).unref?.();
  }, STARTUP_DELAY_MS).unref?.();

  console.log('[Reminder Scheduler] Started (every 60s).');
}
