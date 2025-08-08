const serverless = require('serverless-http');
const app = require('../server');

// For Netlify Functions, we need to initialize the database here
const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

// Initialize database tables for Netlify Functions
async function ensureDbInit() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS images (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            original_name TEXT,
            size BIGINT,
            content TEXT NOT NULL,
            mime_type TEXT DEFAULT 'image/svg+xml',
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        );`);
    } catch (error) {
        console.error('DB init error in function:', error.message);
    }
}

// Initialize on cold start
ensureDbInit();

// Export the serverless handler
exports.handler = serverless(app);
