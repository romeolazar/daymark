const http = require('http');

const token = process.env.CRON_TOKEN || 'token_for_cron_reminder_dispatch';
const port = process.env.PORT || 1403;
const url = `http://localhost:${port}/api/cron?token=${token}`;

console.log(`[Reminder Cron] Background scheduler started. Targets: ${url}`);

function runCron() {
  http.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.dispatched && json.dispatched.length > 0) {
          console.log(`[Reminder Cron] Checked at ${new Date().toISOString()}. Dispatched:`, json.dispatched);
        }
      } catch (e) {
        // Response wasn't JSON or other parse error, ignore
      }
    });
  }).on('error', (err) => {
    // Silent error in case server isn't fully initialized yet
  });
}

// Run every 60 seconds
setInterval(runCron, 60000);

// Run initially after 15 seconds to let the server start up
setTimeout(runCron, 15000);
