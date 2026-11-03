export async function register() {
  // The scheduler needs Prisma and Node APIs, so it only runs in the Node.js runtime.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.DISABLE_SCHEDULER === 'true') return;

  const { startScheduler } = await import('./lib/scheduler');
  startScheduler();
}
