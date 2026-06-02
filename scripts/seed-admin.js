#!/usr/bin/env node
'use strict';

// Generates an INSERT statement for an admin user with a PBKDF2-hashed password.
// The hash format (pbkdf2:{saltHex}:{hashHex}, SHA-256, 100k iterations, 32 bytes)
// matches the worker's auth handler exactly.
//
// Usage: node scripts/seed-admin.js --username admin --password "your-password"
// Then run the printed wrangler command to insert the user into D1.

const { pbkdf2Sync, randomBytes } = require('crypto');

const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const username = getArg('--username');
const password = getArg('--password');

if (!username || !password) {
  console.error('Usage: node scripts/seed-admin.js --username <name> --password <pass>');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const storedHash = `pbkdf2:${salt.toString('hex')}:${hash.toString('hex')}`;

const sql = `INSERT INTO admin_users (username, password_hash) VALUES ('${username}', '${storedHash}');`;

console.log('\nRun one of the following to create the admin user:\n');
console.log('Local (dev):');
console.log(`  wrangler d1 execute events-signup --local --command "${sql}"\n`);
console.log('Remote (production):');
console.log(`  wrangler d1 execute events-signup --remote --command "${sql}"\n`);
