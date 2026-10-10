const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Photo = require('../models/Photo');
const Album = require('../models/Album');
const { calculateChecksum } = require('../utils/fileUtils');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];

// Default paths to look for demo photos
function getDemoDirectory() {
  if (process.env.DEMO_PHOTOS_DIR && fs.existsSync(process.env.DEMO_PHOTOS_DIR)) {
    return path.resolve(process.env.DEMO_PHOTOS_DIR);
  }

  const possiblePaths = [
    path.resolve(__dirname, '../../sample-photos'),
    path.resolve(__dirname, '../sample-photos'),
    path.resolve(__dirname, '../../frontend/public/sample-photos'),
    path.resolve(__dirname, '../uploads/demo'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  // Create default sample-photos directory if not found
  const fallback = path.resolve(__dirname, '../../sample-photos');
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
}

// Preset demo albums
const DEMO_ALBUMS_CONFIG = [
  {
    name: 'Wanderlust & Escapes',
    description: 'Scenic horizons, coastal breezes, and alpine peaks from around the world.',
    matchKeywords: ['mountain', 'coast', 'sunset', 'lake', 'sea', 'sky', 'beach'],
  },
  {
    name: 'City Tales & Twilight',
    description: 'Warm cafe lights, historic architecture, and twilight streetscapes.',
    matchKeywords: ['cafe', 'street', 'city', 'urban', 'night', 'bistro', 'building'],
  },
  {
    name: 'Wild Earth',
    description: 'Misty pine groves, ancient forest canopies, and serene nature.',
    matchKeywords: ['forest', 'pine', 'tree', 'sunbeam', 'nature', 'mist', 'woods'],
  },
];

async function importDemoPhotos(options = {}) {
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const demoDir = options.demoDir || getDemoDirectory();
  const summary = {
    demoDirectory: demoDir,
    totalScanned: 0,
    imported: [],
    skippedDuplicates: [],
    failed: [],
    albumsCreated: [],
  };

  if (!fs.existsSync(demoDir)) {
    summary.error = `Demo directory does not exist: ${demoDir}`;
    return summary;
  }

  const files = fs.readdirSync(demoDir);
  const imageFiles = files.filter((f) =>
    SUPPORTED_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );
  summary.totalScanned = imageFiles.length;

  if (imageFiles.length === 0) {
    summary.message = 'No image files found in demo directory.';
    return summary;
  }

  // Ensure demo albums exist
  const demoAlbums = [];
  for (const albConfig of DEMO_ALBUMS_CONFIG) {
    let album = await Album.findOne({ name: albConfig.name });
    if (!album) {
      album = new Album({
        name: albConfig.name,
        description: albConfig.description,
        isDemo: true,
        photos: [],
      });
      await album.save();
      summary.albumsCreated.push(album.name);
    }
    demoAlbums.push({ album, keywords: albConfig.matchKeywords });
  }

  for (const filename of imageFiles) {
    const sourcePath = path.join(demoDir, filename);

    try {
      const stats = fs.statSync(sourcePath);
      if (!stats.isFile() || stats.size === 0) {
        summary.failed.push({ file: filename, reason: 'Empty or invalid file.' });
        continue;
      }

      // Calculate SHA-256 checksum to ensure idempotency
      const checksum = await calculateChecksum(sourcePath);

      // Check if duplicate already exists in DB
      const existingPhoto = await Photo.findOne({ checksum });
      if (existingPhoto) {
        summary.skippedDuplicates.push({
          file: filename,
          checksum,
          existingId: existingPhoto._id,
          reason: 'Photo with identical checksum already exists in database.',
        });
        continue;
      }

      // Generate safe unique storage name in uploads
      const ext = path.extname(filename).toLowerCase();
      const uniqueName = `demo-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      const targetPath = path.join(uploadsDir, uniqueName);

      // Copy file into uploads
      fs.copyFileSync(sourcePath, targetPath);

      // Extract image dimensions and metadata
      let width = null;
      let height = null;
      let blurScore = 0;
      if (sharp) {
        try {
          const meta = await sharp(targetPath).metadata();
          width = meta.width || null;
          height = meta.height || null;
          
          // Compute basic stats if available
          const stats = await sharp(targetPath).stats();
          if (stats && stats.channels) {
            // Calculate variance across channels as simple sharpness metric
            const meanStdev = stats.channels.reduce((acc, c) => acc + (c.stdev || 0), 0) / stats.channels.length;
            blurScore = Math.max(0, Math.round(100 - meanStdev));
          }
        } catch (e) {
          // Sharp metadata extraction failed; continue gracefully
        }
      }

      // Derive human-readable title and description
      const baseName = path.basename(filename, ext).replace(/[-_]/g, ' ');
      const cleanTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1);

      // Auto-assign to matching demo album
      const assignedAlbumIds = [];
      const lowerName = filename.toLowerCase();
      for (const item of demoAlbums) {
        const matches = item.keywords.some((kw) => lowerName.includes(kw));
        if (matches) {
          assignedAlbumIds.push(item.album._id);
        }
      }

      // Determine MIME type
      const mimeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.avif': 'image/avif',
      };
      const mimeType = mimeMap[ext] || 'image/jpeg';

      const photo = new Photo({
        originalName: `${cleanTitle}${ext}`,
        storageName: uniqueName,
        filePath: targetPath,
        fileSize: stats.size,
        mimeType,
        width,
        height,
        checksum,
        description: `Curated demo photograph: ${cleanTitle}`,
        tags: ['demo', ...cleanTitle.toLowerCase().split(' ').filter((w) => w.length > 2)],
        aiTags: [cleanTitle.toLowerCase(), ...assignedAlbumIds.length ? ['editorial'] : ['moment']],
        aiDescription: `High-resolution photograph depicting ${cleanTitle}.`,
        blurScore,
        captureDate: new Date(stats.mtime || stats.birthtime || Date.now()),
        isFavorite: filename.includes('mountain') || filename.includes('sunset') || filename.includes('forest'),
        isDemo: true,
        albums: assignedAlbumIds,
      });

      await photo.save();

      // Update album photo lists and cover photo
      for (const item of demoAlbums) {
        if (assignedAlbumIds.includes(item.album._id)) {
          if (!item.album.photos.includes(photo._id)) {
            item.album.photos.push(photo._id);
          }
          if (!item.album.coverPhoto) {
            item.album.coverPhoto = photo._id;
          }
          await item.album.save();
        }
      }

      summary.imported.push({
        id: photo._id,
        filename,
        title: cleanTitle,
        storageName: uniqueName,
        size: stats.size,
        dimensions: width && height ? `${width}x${height}` : 'unknown',
        albums: assignedAlbumIds.length,
      });
    } catch (err) {
      summary.failed.push({ file: filename, reason: err.message });
    }
  }

  return summary;
}

async function resetDemoPhotos() {
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const summary = {
    deletedPhotos: 0,
    deletedFiles: 0,
    deletedAlbums: 0,
  };

  // Find only demo photos to ensure user photos are NEVER touched
  const demoPhotos = await Photo.find({ isDemo: true });

  for (const photo of demoPhotos) {
    try {
      if (photo.filePath && fs.existsSync(photo.filePath)) {
        fs.unlinkSync(photo.filePath);
        summary.deletedFiles++;
      }
    } catch (e) {}
  }

  const deletePhotoResult = await Photo.deleteMany({ isDemo: true });
  summary.deletedPhotos = deletePhotoResult.deletedCount || 0;

  // Remove demo albums
  const deleteAlbumResult = await Album.deleteMany({ isDemo: true });
  summary.deletedAlbums = deleteAlbumResult.deletedCount || 0;

  return summary;
}

module.exports = {
  importDemoPhotos,
  resetDemoPhotos,
  getDemoDirectory,
};
