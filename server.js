const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Database (Neon PostgreSQL) setup
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
}

const pool = new Pool({ 
    connectionString: DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

async function initDb() {
    try {
        console.log('🔗 Connecting to database...');
        await pool.query('SELECT NOW()'); // Test connection
        console.log('✅ Database connected successfully');
        
        // Modified table to store SVG content directly
        await pool.query(`CREATE TABLE IF NOT EXISTS images (
            id SERIAL PRIMARY KEY,
            filename TEXT UNIQUE NOT NULL,
            original_name TEXT,
            size BIGINT,
            content TEXT,
            mime_type TEXT DEFAULT 'image/svg+xml',
            uploaded_at TIMESTAMPTZ DEFAULT NOW()
        );`);
        
        // Check if content column exists, if not add it
        try {
            await pool.query('SELECT content FROM images LIMIT 1');
        } catch (columnError) {
            if (columnError.message.includes('does not exist')) {
                console.log('🔄 Adding content column to existing table...');
                await pool.query('ALTER TABLE images ADD COLUMN content TEXT');
                await pool.query('ALTER TABLE images ADD COLUMN mime_type TEXT DEFAULT \'image/svg+xml\'');
                console.log('✅ Database schema updated');
            }
        }
        
        console.log('✅ Database tables initialized');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('Connection string check:', DATABASE_URL ? 'Present' : 'Missing');
    }
}

// Initialize DB only in serverless environment or local development
if (process.env.NETLIFY_DEV || !process.env.NETLIFY) {
    initDb();
}

// Enable CORS for all origins with better configuration
app.use(cors({
    origin: true, // Allow all origins for development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Configure multer for memory storage (since we can't use disk storage in Netlify Functions)
const storage = multer.memoryStorage();

// File filter to accept only SVG files
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/svg+xml' || file.originalname.toLowerCase().endsWith('.svg')) {
        cb(null, true);
    } else {
        cb(new Error('Only SVG files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Routes

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Root route - API info
app.get('/', (req, res) => {
    res.json({
        message: 'SVG Images API Service',
        version: '1.0.0',
        endpoints: {
            upload: 'POST /upload - Upload SVG file',
            list: 'GET /images/list - List all images',
            fetch: 'GET /images/:filename - Fetch specific image',
            direct: 'GET /images/:filename - Direct image URL'
        }
    });
});

// Debug route to check database content
app.get('/debug/images', async (req, res) => {
    try {
        const result = await pool.query('SELECT filename, original_name, size, LENGTH(content) as content_length, uploaded_at FROM images ORDER BY uploaded_at DESC');
        res.json({
            success: true,
            count: result.rows.length,
            images: result.rows
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload SVG image
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded or invalid file type'
            });
        }

        // Convert buffer to string for SVG content
        const svgContent = req.file.buffer.toString('utf8');
        const filename = req.file.originalname;
        
        // Validate it's actually SVG content
        if (!svgContent.includes('<svg') || !svgContent.includes('</svg>')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid SVG file format'
            });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/images/${filename}`;

        // Store in database
        try {
            await pool.query(
                `INSERT INTO images (filename, original_name, size, content, mime_type) 
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (filename) 
                 DO UPDATE SET 
                    original_name = EXCLUDED.original_name, 
                    size = EXCLUDED.size, 
                    content = EXCLUDED.content,
                    uploaded_at = NOW()`,
                [filename, req.file.originalname, req.file.size, svgContent, 'image/svg+xml']
            );
        } catch (dbErr) {
            console.error('DB insert error:', dbErr.message);
            return res.status(500).json({
                success: false,
                message: 'Database error while saving image'
            });
        }
        
        res.json({
            success: true,
            message: 'SVG image uploaded successfully',
            data: {
                filename: filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: imageUrl,
                directUrl: imageUrl
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading file',
            error: error.message
        });
    }
});

// List all uploaded images
app.get('/images/list', async (req, res) => {
    try {
        // Fetch all images from database
        const result = await pool.query(
            'SELECT filename, original_name, size, uploaded_at FROM images ORDER BY uploaded_at DESC'
        );

        const imageList = result.rows.map(row => {
            const imageUrl = `${req.protocol}://${req.get('host')}/images/${row.filename}`;
            return {
                filename: row.filename,
                originalName: row.original_name || row.filename,
                url: imageUrl,
                directUrl: imageUrl,
                size: parseInt(row.size),
                uploadedAt: row.uploaded_at
            };
        });

        res.json({ 
            success: true, 
            count: imageList.length, 
            images: imageList 
        });
    } catch (error) {
        console.error('Error fetching image list:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching image list', 
            error: error.message 
        });
    }
});

// Fetch specific image info
app.get('/api/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        const result = await pool.query(
            'SELECT filename, original_name, size, uploaded_at FROM images WHERE filename = $1',
            [filename]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        const row = result.rows[0];
        const imageUrl = `${req.protocol}://${req.get('host')}/images/${filename}`;

        res.json({
            success: true,
            data: {
                filename: filename,
                originalName: row.original_name || filename,
                url: imageUrl,
                directUrl: imageUrl,
                size: parseInt(row.size),
                uploadedAt: row.uploaded_at
            }
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching image', 
            error: error.message 
        });
    }
});

// Delete image
app.delete('/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        
        const result = await pool.query('DELETE FROM images WHERE filename = $1 RETURNING filename', [filename]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting image', 
            error: error.message 
        });
    }
});

// Serve SVG images directly from database (must be last in /images routes)
app.get('/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const result = await pool.query(
            'SELECT content, mime_type FROM images WHERE filename = $1',
            [filename]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        const image = result.rows[0];
        
        // Check if content exists
        if (!image.content) {
            return res.status(404).json({ 
                success: false, 
                message: 'Image content not available. Please re-upload the image.' 
            });
        }
        
        // Set appropriate headers for SVG
        res.setHeader('Content-Type', image.mime_type || 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
        res.send(image.content);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ success: false, message: 'Error serving image', error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
    }
    
    res.status(500).json({
        success: false,
        message: error.message || 'Something went wrong!'
    });
});

// Start server (only in local development)
if (!process.env.NETLIFY) {
    app.listen(PORT, HOST, () => {
        console.log(`🚀 SVG Images API Server running on http://${HOST}:${PORT}`);
        console.log(`�️  Using Neon PostgreSQL database for storage`);
        console.log(`📋 Available endpoints:`);
        console.log(`   POST   /upload - Upload SVG image`);
        console.log(`   GET    /images/list - List all images`);
        console.log(`   GET    /api/images/:filename - Get image info`);
        console.log(`   GET    /images/:filename - Direct image access`);
        console.log(`   DELETE /images/:filename - Delete image`);
    });
}

module.exports = app;
