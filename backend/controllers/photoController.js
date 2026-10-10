const Photo = require('../models/Photo');
const Album = require('../models/Album');
const { calculateChecksum, safeDeleteFile } = require('../utils/fileUtils');
const path = require('path');
const fs = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
  console.warn('[Photo Controller] sharp not available — image dimensions will not be extracted.');
}

// ─── Upload Photos ────────────────────────────────────────────────────────────

exports.uploadPhotos = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded.' });
  }

  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      // Calculate SHA-256 checksum
      const checksum = await calculateChecksum(file.path);

      // Duplicate detection
      const duplicate = await Photo.findOne({ checksum });
      if (duplicate) {
        await safeDeleteFile(file.path);
        errors.push({
          file: file.originalname,
          error: 'Duplicate image already exists in your library.',
          duplicateId: duplicate._id,
        });
        continue;
      }

      // Get image dimensions
      let width = null;
      let height = null;
      if (sharp) {
        try {
          const meta = await sharp(file.path).metadata();
          width = meta.width || null;
          height = meta.height || null;
        } catch (e) {
          // non-fatal
        }
      }

      // Parse capture date from request body if provided
      let captureDate = null;
      if (req.body.captureDate) {
        captureDate = new Date(req.body.captureDate);
        if (isNaN(captureDate.getTime())) captureDate = null;
      }

      const photo = new Photo({
        originalName: file.originalname,
        storageName: file.filename,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        width,
        height,
        checksum,
        description: req.body.description || '',
        tags: req.body.tags
          ? req.body.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        captureDate,
      });

      await photo.save();
      results.push(photo);
    } catch (err) {
      await safeDeleteFile(file.path);
      errors.push({ file: file.originalname, error: err.message });
    }
  }

  res.status(201).json({
    success: true,
    uploaded: results.length,
    failed: errors.length,
    photos: results,
    errors,
  });
};

// ─── Get All Photos ───────────────────────────────────────────────────────────

exports.getPhotos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 24,
      sort = 'newest',
      search,
      albumId,
      favorites,
      captureDateFrom,
      captureDateTo,
      uploadDateFrom,
      uploadDateTo,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Text search
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    // Album filter
    if (albumId) {
      filter.albums = albumId;
    }

    // Favorites filter
    if (favorites === 'true') {
      filter.isFavorite = true;
    }

    // Capture date range
    if (captureDateFrom || captureDateTo) {
      filter.captureDate = {};
      if (captureDateFrom) filter.captureDate.$gte = new Date(captureDateFrom);
      if (captureDateTo) filter.captureDate.$lte = new Date(captureDateTo);
    }

    // Upload date range
    if (uploadDateFrom || uploadDateTo) {
      filter.createdAt = {};
      if (uploadDateFrom) filter.createdAt.$gte = new Date(uploadDateFrom);
      if (uploadDateTo) filter.createdAt.$lte = new Date(uploadDateTo);
    }

    // Sort
    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      nameAZ: { originalName: 1 },
      nameZA: { originalName: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.newest;

    const [photos, total] = await Promise.all([
      Photo.find(filter).sort(sortObj).skip(skip).limit(limitNum).populate('albums', 'name'),
      Photo.countDocuments(filter),
    ]);

    res.json({
      success: true,
      photos,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[getPhotos]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Photo ─────────────────────────────────────────────────────────

exports.getPhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id).populate('albums', 'name');
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Photo ─────────────────────────────────────────────────────────────

exports.updatePhoto = async (req, res) => {
  try {
    const { description, tags, captureDate, isFavorite } = req.body;
    const update = {};

    if (description !== undefined) update.description = description;
    if (tags !== undefined) {
      update.tags = Array.isArray(tags)
        ? tags.map((t) => t.trim()).filter(Boolean)
        : tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }
    if (captureDate !== undefined) {
      update.captureDate = captureDate ? new Date(captureDate) : null;
    }
    if (isFavorite !== undefined) update.isFavorite = isFavorite;

    const photo = await Photo.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('albums', 'name');

    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Toggle Favorite ──────────────────────────────────────────────────────────

exports.toggleFavorite = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });

    photo.isFavorite = !photo.isFavorite;
    await photo.save();
    res.json({ success: true, photo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Photo ─────────────────────────────────────────────────────────────

exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ success: false, message: 'Photo not found.' });

    // Remove from all albums
    await Album.updateMany({ photos: photo._id }, { $pull: { photos: photo._id } });
    // Unset cover photo references
    await Album.updateMany({ coverPhoto: photo._id }, { $set: { coverPhoto: null } });

    // Delete file from disk
    await safeDeleteFile(photo.filePath);

    // Delete document
    await Photo.findByIdAndDelete(photo._id);

    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Multiple Photos ───────────────────────────────────────────────────

exports.deletePhotos = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No photo IDs provided.' });
    }

    const photos = await Photo.find({ _id: { $in: ids } });

    // Remove from albums
    await Album.updateMany({ photos: { $in: ids } }, { $pull: { photos: { $in: ids } } });
    await Album.updateMany({ coverPhoto: { $in: ids } }, { $set: { coverPhoto: null } });

    // Delete files
    for (const photo of photos) {
      await safeDeleteFile(photo.filePath);
    }

    await Photo.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, deleted: photos.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Stats ────────────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  try {
    const [totalPhotos, totalAlbums, storageResult, recentPhotos, featured] = await Promise.all([
      Photo.countDocuments(),
      Album.countDocuments(),
      Photo.aggregate([{ $group: { _id: null, totalSize: { $sum: '$fileSize' } } }]),
      Photo.find().sort({ createdAt: -1 }).limit(8).lean(),
      Photo.findOne().sort({ createdAt: -1 }).lean(),
    ]);

    const totalStorage = storageResult[0]?.totalSize || 0;

    res.json({
      success: true,
      stats: {
        totalPhotos,
        totalAlbums,
        totalStorage,
        recentPhotos,
        featured,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── On This Day ──────────────────────────────────────────────────────────────

exports.getOnThisDay = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    const currentYear = now.getFullYear();

    // Find photos from same month/day in previous years
    const photos = await Photo.aggregate([
      {
        $project: {
          originalName: 1,
          storageName: 1,
          captureDate: 1,
          createdAt: 1,
          description: 1,
          width: 1,
          height: 1,
          isFavorite: 1,
          dateToUse: { $ifNull: ['$captureDate', '$createdAt'] },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: '$dateToUse' }, month] },
              { $eq: [{ $dayOfMonth: '$dateToUse' }, day] },
              { $lt: [{ $year: '$dateToUse' }, currentYear] },
            ],
          },
        },
      },
      { $sort: { dateToUse: -1 } },
      { $limit: 12 },
    ]);

    res.json({ success: true, photos, date: { month, day } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Timeline ─────────────────────────────────────────────────────────────────

exports.getTimeline = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const photos = await Photo.aggregate([
      {
        $project: {
          originalName: 1,
          storageName: 1,
          captureDate: 1,
          createdAt: 1,
          description: 1,
          width: 1,
          height: 1,
          isFavorite: 1,
          albums: 1,
          dateToUse: { $ifNull: ['$captureDate', '$createdAt'] },
        },
      },
      { $sort: { dateToUse: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    const total = await Photo.countDocuments();

    // Group by year-month
    const grouped = {};
    for (const photo of photos) {
      const date = new Date(photo.dateToUse);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { year: date.getFullYear(), month: date.getMonth() + 1, days: {} };

      const dayKey = date.getDate();
      if (!grouped[key].days[dayKey]) grouped[key].days[dayKey] = [];
      grouped[key].days[dayKey].push(photo);
    }

    // Convert to array
    const timeline = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({
        key,
        year: val.year,
        month: val.month,
        days: Object.entries(val.days)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([day, photos]) => ({ day: parseInt(day), photos })),
      }));

    res.json({
      success: true,
      timeline,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
