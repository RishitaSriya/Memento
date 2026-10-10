require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const photoRoutes = require('./routes/photoRoutes');
const albumRoutes = require('./routes/albumRoutes');
const capsuleRoutes = require('./routes/capsuleRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const detectiveRoutes = require('./routes/detectiveRoutes');
const demoRoutes = require('./routes/demoRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/memento';

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static file serving for uploaded images ──────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Guard: Fast 503 response if MongoDB is not connected (prevents 10s buffering timeouts)
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'MongoDB is currently disconnected. Please start mongod or configure MONGO_URI in backend/.env.',
      mongoStatus: 'disconnected',
    });
  }
  next();
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/photos', photoRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/capsules', capsuleRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/detective', detectiveRoutes);
app.use('/api/demo', demoRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 50 MB.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ success: false, message: 'Too many files. Maximum is 20 files per upload.' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Unexpected file field.' });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('');
    console.error('─────────────────────────────────────────────────────────');
    console.error('  SETUP GUIDE: MongoDB is not running or not installed.');
    console.error('');
    console.error('  Option 1 – Install MongoDB locally:');
    console.error('    https://www.mongodb.com/try/download/community');
    console.error('    After install, run: mongod');
    console.error('');
    console.error('  Option 2 – Use MongoDB Atlas (free cloud):');
    console.error('    https://www.mongodb.com/cloud/atlas/register');
    console.error('    Get your connection string and update .env');
    console.error('    MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/memento');
    console.error('─────────────────────────────────────────────────────────');
    console.error('');
    console.error('  The server will still start but all API calls will fail');
    console.error('  until MongoDB is available.');
    console.error('─────────────────────────────────────────────────────────');
  }
}

// ─── Start Server ─────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 MEMENTO backend running at http://localhost:${PORT}`);
    console.log(`📁 Uploads served at http://localhost:${PORT}/uploads/`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  });
});

module.exports = app;
