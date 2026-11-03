#!/usr/bin/env node
/**
 * One-off migration: copies all Daymark data from the old PostgreSQL
 * database into the SQLite database used by the single-container setup.
 *
 * Usage (inside the new image, see README "Migrating from PostgreSQL"):
 *   SOURCE_DATABASE_URL=postgresql://user:pass@host:5432/daymark \
 *     node scripts/migrate-from-postgres.js [--force]
 *
 * The target is DATABASE_URL (the SQLite file). The script refuses to run
 * if the target already contains users, unless --force is given, in which
 * case the target tables are emptied first.
 */
const { Client, types } = require('pg');
const { PrismaClient } = require('@prisma/client');

// Prisma stores DateTime in PostgreSQL as "timestamp without time zone" in UTC.
// node-postgres would otherwise parse those as local time and shift every date
// when the container runs with a TZ other than UTC.
types.setTypeParser(1114, (value) => new Date(value.replace(' ', 'T') + 'Z'));

// Copy order respects foreign keys.
const TABLES = [
  { table: 'User', model: 'user' },
  { table: 'Settings', model: 'settings' },
  { table: 'Category', model: 'category' },
  { table: 'Event', model: 'event' },
  { table: 'Reminder', model: 'reminder' },
];

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const force = process.argv.includes('--force');

  if (!sourceUrl) {
    console.error('SOURCE_DATABASE_URL is required (the old PostgreSQL connection URL).');
    process.exit(1);
  }

  const pg = new Client({ connectionString: sourceUrl });
  const prisma = new PrismaClient();

  try {
    await pg.connect();
    console.log('Connected to source PostgreSQL.');

    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      if (!force) {
        console.error(`Target SQLite already has ${existingUsers} user(s). Re-run with --force to wipe and re-import.`);
        process.exitCode = 1;
        return;
      }
      console.log('--force given: emptying target tables.');
      for (const { model } of [...TABLES].reverse()) {
        await prisma[model].deleteMany();
      }
    }

    const counts = {};
    await prisma.$transaction(async (tx) => {
      for (const { table, model } of TABLES) {
        const { rows } = await pg.query(`SELECT * FROM "${table}"`);
        if (rows.length > 0) {
          await tx[model].createMany({ data: rows });
        }
        counts[table] = rows.length;
        console.log(`  ${table}: ${rows.length} row(s) copied`);
      }
    }, { timeout: 120000 });

    for (const { table, model } of TABLES) {
      const n = await prisma[model].count();
      if (n !== counts[table]) {
        throw new Error(`Verification failed for ${table}: expected ${counts[table]}, found ${n}`);
      }
    }
    console.log('Migration complete and verified.');
  } finally {
    await pg.end().catch(() => {});
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
