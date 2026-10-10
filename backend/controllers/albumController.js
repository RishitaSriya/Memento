const Album = require('../models/Album');
const Photo = require('../models/Photo');

// ─── Create Album ─────────────────────────────────────────────────────────────

exports.createAlbum = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Album name is required.' });
    }

    const album = new Album({ name: name.trim(), description: description?.trim() || '' });
    await album.save();
    res.status(201).json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get All Albums ───────────────────────────────────────────────────────────

exports.getAlbums = async (req, res) => {
  try {
    const albums = await Album.find()
      .sort({ createdAt: -1 })
      .populate('coverPhoto', 'storageName originalName width height');

    // Attach photo count
    const albumsWithCount = albums.map((album) => ({
      ...album.toObject(),
      photoCount: album.photos.length,
    }));

    res.json({ success: true, albums: albumsWithCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Album ─────────────────────────────────────────────────────────

exports.getAlbum = async (req, res) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const album = await Album.findById(req.params.id).populate(
      'coverPhoto',
      'storageName originalName width height'
    );
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    const total = album.photos.length;
    const skip = (pageNum - 1) * limitNum;
    const photoIds = album.photos.slice(skip, skip + limitNum);

    const photos = await Photo.find({ _id: { $in: photoIds } }).sort({ createdAt: -1 });

    res.json({
      success: true,
      album: { ...album.toObject(), photoCount: total },
      photos,
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

// ─── Update Album ─────────────────────────────────────────────────────────────

exports.updateAlbum = async (req, res) => {
  try {
    const { name, description, coverPhoto } = req.body;
    const update = {};

    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (coverPhoto !== undefined) update.coverPhoto = coverPhoto || null;

    const album = await Album.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('coverPhoto', 'storageName originalName width height');

    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });
    res.json({ success: true, album });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Album ─────────────────────────────────────────────────────────────

exports.deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    // Remove album reference from all photos
    await Photo.updateMany({ albums: album._id }, { $pull: { albums: album._id } });

    await Album.findByIdAndDelete(album._id);

    res.json({ success: true, message: 'Album deleted. Photos are preserved in your library.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Add Photos to Album ──────────────────────────────────────────────────────

exports.addPhotosToAlbum = async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, message: 'photoIds array is required.' });
    }

    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    // Add to album (avoid duplicates)
    const newIds = photoIds.filter(
      (id) => !album.photos.map((p) => p.toString()).includes(id.toString())
    );
    album.photos.push(...newIds);
    await album.save();

    // Add album reference to photos
    await Photo.updateMany({ _id: { $in: photoIds } }, { $addToSet: { albums: album._id } });

    res.json({ success: true, album, added: newIds.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Remove Photos from Album ─────────────────────────────────────────────────

exports.removePhotosFromAlbum = async (req, res) => {
  try {
    const { photoIds } = req.body;
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({ success: false, message: 'photoIds array is required.' });
    }

    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found.' });

    album.photos = album.photos.filter(
      (id) => !photoIds.map((p) => p.toString()).includes(id.toString())
    );
    await album.save();

    // Remove album reference from photos
    await Photo.updateMany({ _id: { $in: photoIds } }, { $pull: { albums: album._id } });

    res.json({ success: true, album, removed: photoIds.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Move Photos Between Albums ───────────────────────────────────────────────

exports.movePhotos = async (req, res) => {
  try {
    const { photoIds, fromAlbumId, toAlbumId } = req.body;
    if (!Array.isArray(photoIds) || !fromAlbumId || !toAlbumId) {
      return res.status(400).json({ success: false, message: 'photoIds, fromAlbumId, and toAlbumId are required.' });
    }

    const [fromAlbum, toAlbum] = await Promise.all([
      Album.findById(fromAlbumId),
      Album.findById(toAlbumId),
    ]);

    if (!fromAlbum || !toAlbum) {
      return res.status(404).json({ success: false, message: 'One or both albums not found.' });
    }

    // Remove from source
    fromAlbum.photos = fromAlbum.photos.filter(
      (id) => !photoIds.map((p) => p.toString()).includes(id.toString())
    );
    await fromAlbum.save();

    // Add to target (no duplicates)
    const existingIds = toAlbum.photos.map((p) => p.toString());
    const toAdd = photoIds.filter((id) => !existingIds.includes(id.toString()));
    toAlbum.photos.push(...toAdd);
    await toAlbum.save();

    // Update photo album references
    await Photo.updateMany(
      { _id: { $in: photoIds } },
      { $pull: { albums: fromAlbum._id }, $addToSet: { albums: toAlbum._id } }
    );

    res.json({ success: true, moved: photoIds.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
