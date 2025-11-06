// Deno-compatible SQLite database connection
// For use in Deno runtime (Supabase Edge Functions)

import { DB } from 'https://deno.land/x/sqlite@v3.8.0/mod.ts';
import { join } from 'https://deno.land/std@0.168.0/path/mod.ts';

const DB_DIR = join(Deno.cwd(), 'database');
const DB_PATH = join(DB_DIR, 'synergy.db');

let db: DB | null = null;

/**
 * Get or create database connection
 */
export function getDatabase(): DB {
  if (!db) {
    // Ensure database directory exists
    try {
      Deno.mkdirSync(DB_DIR, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    db = new DB(DB_PATH);
    
    // Enable foreign keys
    db.execute('PRAGMA foreign_keys = ON');
    db.execute('PRAGMA journal_mode = WAL');
  }
  return db;
}

/**
 * Initialize database with schema
 */
export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  
  // Read and execute schema
  const schemaPath = join(Deno.cwd(), 'database', 'init.sql');
  const schema = await Deno.readTextFile(schemaPath);
  
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      database.execute(statement);
    } catch (error) {
      console.warn('Schema execution warning:', error);
      console.warn('Statement:', statement.substring(0, 100));
    }
  }
  
  console.log('Database initialized successfully');
}

/**
 * Reset database (delete and recreate)
 */
export async function resetDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
  
  // Delete database file
  try {
    await Deno.remove(DB_PATH);
  } catch {
    // File might not exist
  }
  
  // Reinitialize
  await initDatabase();
  console.log('Database reset successfully');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Helper to execute queries with error handling
 */
export function query<T = any>(sql: string, params: any[] = []): T[] {
  const database = getDatabase();
  try {
    return database.queryEntries<T>(sql, params);
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Helper to execute single row queries
 */
export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const database = getDatabase();
  try {
    const results = database.queryEntries<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Helper to execute insert/update/delete queries
 */
export function execute(sql: string, params: any[] = []): { lastInsertRowId: number; changes: number } {
  const database = getDatabase();
  try {
    database.query(sql, params);
    return {
      lastInsertRowId: database.lastInsertRowId,
      changes: database.changes
    };
  } catch (error) {
    console.error('Database execute error:', error);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Helper to execute transactions
 */
export function transaction<T>(callback: (db: DB) => T): T {
  const database = getDatabase();
  database.execute('BEGIN TRANSACTION');
  try {
    const result = callback(database);
    database.execute('COMMIT');
    return result;
  } catch (error) {
    database.execute('ROLLBACK');
    throw error;
  }
}

export default getDatabase;

