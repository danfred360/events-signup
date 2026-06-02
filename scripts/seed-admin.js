#!/usr/bin/env node
'use strict';

// Generates an INSERT statement for an admin user with a PBKDF2-hashed password.
// The hash format (pbkdf2:{saltHex}:{hashHex}, SHA-256, 100k iterations, 32 bytes)
// matches the worker's auth handler exactly.
//
// Usage: node scripts/seed-admin.js --username admin --password "your-password" [--role admin]
// --role defaults to 'admin'. Use 'event_manager' for non-admin users (though the
// admin UI is the preferred way to create event_manager accounts).
//
// Then run the printed wrangler command to insert the user into D1.

const { pbkdf2Sync, randomBytes } = require('crypto');

const args = process.argv.slice(2);
function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

const username = getArg('--username');
const password = getArg('--password');
const role = getArg('--role') ?? 'admin';

if (!username || !password) {
  console.error('Usage: node scripts/seed-admin.js --username <name> --password <pass> [--role admin|event_manager]');
  process.exit(1);
}

if (role !== 'admin' && role !== 'event_manager') {
  console.error('--role must be "admin" or "event_manager"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256');
const storedHash = `pbkdf2:${salt.toString('hex')}:${hash.toString('hex')}`;

const sql = `INSERT INTO admin_users (username, password_hash, role) VALUES ('${username}', '${storedHash}', '${role}');`;

console.log(`\nCreating ${role} user: ${username}\n`);
console.log('Local (dev):');
console.log(`  wrangler d1 execute events-signup --local --command "${sql}"\n`);
console.log('Remote (production):');
console.log(`  wrangler d1 execute events-signup --remote --command "${sql}"\n`);
