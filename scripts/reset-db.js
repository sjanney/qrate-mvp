#!/usr/bin/env node
// Node.js script to reset SQLite database
// This can be run independently for local development

const { initDatabase } = require('./init-db.js');

function resetDatabase() {
  console.log('Resetting database...');
  initDatabase();
  console.log('Database reset complete!');
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };

