import { runMigrations } from 'stripe-replit-sync';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL required');

console.log('Running stripe-replit-sync migrations...');
await runMigrations({ databaseUrl });
console.log('Done');
