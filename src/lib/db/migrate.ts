import fs from 'fs';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;

const runMigrate = async () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  
  const migrationClient = postgres(connectionString, { max: 1 });

  console.log('Running fallback migration...');
  let sql = fs.readFileSync('src/lib/db/migrations/0000_amazing_triton.sql', 'utf8');
  
  // Replace CREATE TABLE with CREATE TABLE IF NOT EXISTS
  sql = sql.replace(/CREATE TABLE/g, 'CREATE TABLE IF NOT EXISTS');
  // Skip constraints if they exist (simplest way is to ignore errors, but since postgres driver runs everything in one go, we split by breakpoint)
  const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
  
  for (const statement of statements) {
    try {
      await migrationClient.unsafe(statement);
      console.log('Executed statement successfully');
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.warn('Error on statement:', statement);
        console.warn(e.message);
      }
    }
  }

  console.log('Migrations complete');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('Migration failed');
  console.error(err);
  process.exit(1);
});
