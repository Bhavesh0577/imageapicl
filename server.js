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
// Prefer DATABASE_URL env var; fallback to provided connection string (NOT recommended to hardcode in production)
const DATABASE_URL = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    filename TEXT UNIQUE NOT NULL,
    original_name TEXT,
    size BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
  );`);
}
initDb().catch(err => console.error('DB init error:', err));

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Use original filename as is
        cb(null, file.originalname);
    }
});

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

// Serve static files from uploads directory
app.use('/images', express.static(path.join(__dirname, 'uploads')));

// Routes

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

// Upload SVG image
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded or invalid file type'
            });
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;

        // Store metadata in DB (upsert on filename)
        try {
            await pool.query(
              `INSERT INTO images (filename, original_name, size) VALUES ($1,$2,$3)
               ON CONFLICT (filename) DO UPDATE SET original_name = EXCLUDED.original_name, size = EXCLUDED.size`,
              [req.file.filename, req.file.originalname, req.file.size]
            );
        } catch (dbErr) {
            console.error('DB insert error:', dbErr.message);
        }
        
        res.json({
            success: true,
            message: 'SVG image uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                url: imageUrl,
                directUrl: imageUrl
            }
        });
    } catch (error) {
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
        const files = fs.readdirSync(uploadsDir).filter(f => f.toLowerCase().endsWith('.svg'));

        // Fetch db metadata for all
        let dbRows = [];
        try {
            const result = await pool.query('SELECT filename, original_name, size, uploaded_at FROM images WHERE filename = ANY($1)', [files]);
            dbRows = result.rows;
        } catch (dbErr) {
            console.error('DB fetch error:', dbErr.message);
        }
        const dbMap = Object.fromEntries(dbRows.map(r => [r.filename, r]));

        const imageList = files.map(file => {
            const filePath = path.join(uploadsDir, file);
            const stats = fs.statSync(filePath);
            const imageUrl = `${req.protocol}://${req.get('host')}/images/${file}`;
            const meta = dbMap[file];
            return {
                filename: file,
                originalName: meta?.original_name || file,
                url: imageUrl,
                directUrl: imageUrl,
                size: meta?.size || stats.size,
                uploadedAt: meta?.uploaded_at || stats.birthtime
            };
        });

        res.json({ success: true, count: imageList.length, images: imageList });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching image list', error: error.message });
    }
});

// Fetch specific image info
app.get('/api/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        const stats = fs.statSync(filePath);
        const imageUrl = `${req.protocol}://${req.get('host')}/images/${filename}`;

        let meta;
        try {
            const result = await pool.query('SELECT filename, original_name, size, uploaded_at FROM images WHERE filename=$1', [filename]);
            meta = result.rows[0];
        } catch (dbErr) {
            console.error('DB fetch single error:', dbErr.message);
        }

        res.json({
            success: true,
            data: {
                filename: filename,
                originalName: meta?.original_name || filename,
                url: imageUrl,
                directUrl: imageUrl,
                size: meta?.size || stats.size,
                uploadedAt: meta?.uploaded_at || stats.birthtime
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching image', error: error.message });
    }
});

// Delete image
app.delete('/images/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Image not found' });
        }

        fs.unlinkSync(filePath);
        // Remove from DB
        try { await pool.query('DELETE FROM images WHERE filename=$1', [filename]); } catch (dbErr) { console.error('DB delete error:', dbErr.message); }

        res.json({ success: true, message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting image', error: error.message });
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

// Start server
app.listen(PORT, HOST, () => {
    console.log(`🚀 SVG Images API Server running on http://${HOST}:${PORT}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   POST   /upload - Upload SVG image`);
    console.log(`   GET    /images/list - List all images`);
    console.log(`   GET    /api/images/:filename - Get image info`);
    console.log(`   GET    /images/:filename - Direct image access`);
    console.log(`   DELETE /images/:filename - Delete image`);
});

module.exports = app;
