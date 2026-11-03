#!/usr/bin/env node
/**
 * Writes a consistent snapshot of the SQLite database while the app runs.
 * Usage: docker exec daymark node scripts/backup-db.js [target-path]
 * Default target: /app/data/backup-YYYY-MM-DD-HHmmss.db
 */
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
const target = path.resolve(process.argv[2] || `/app/data/backup-${stamp}.db`);

if (target.includes("'")) {
  console.error('Target path must not contain quotes.');
  process.exit(1);
}

const prisma = new PrismaClient();
prisma
  .$executeRawUnsafe(`VACUUM INTO '${target}'`)
  .then(() => console.log(`Backup written to ${target}`))
  .catch((err) => {
    console.error('Backup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
