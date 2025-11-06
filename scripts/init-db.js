#!/usr/bin/env node
// Node.js script to initialize SQLite database
// This can be run independently for local development

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'synergy.db');
const SCHEMA_PATH = path.join(DB_DIR, 'init.sql');

function initDatabase() {
  // Ensure database directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // Delete existing database if it exists
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Deleted existing database');
  }

  // Create new database
  const db = new Database(DB_PATH);
  
  // Enable foreign keys and WAL mode
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  // Read and execute schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  
  // Execute the entire schema at once (SQLite handles multiple statements)
  // Remove comments first
  const cleanedSchema = schema
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');
  
  try {
    db.exec(cleanedSchema);
    console.log('Schema executed successfully');
  } catch (error) {
    // If execution fails, try executing statements one by one
    console.warn('Full schema execution failed, trying individual statements:', error.message);
    
    // Split by semicolons and execute each statement
    const statements = cleanedSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        if (statement.trim().length > 0) {
          db.exec(statement + ';');
        }
      } catch (stmtError) {
        // Only warn for non-critical errors (like duplicate indexes)
        if (!stmtError.message.includes('already exists') && !stmtError.message.includes('duplicate')) {
          console.warn('Schema execution warning:', stmtError.message);
          console.warn('Statement:', statement.substring(0, 100));
        }
      }
    }
  }

  db.close();
  console.log('Database initialized successfully at:', DB_PATH);
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };

