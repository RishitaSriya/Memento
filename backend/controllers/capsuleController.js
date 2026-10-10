const Capsule = require('../models/Capsule');
const Photo = require('../models/Photo');

// ─── Format Capsule (Enforce Lock Restrictions) ─────────────────────────────────
function sanitizeCapsule(capsule) {
  const isUnlocked = new Date() >= new Date(capsule.unlockDate);
  const doc = capsule.toObject ? capsule.toObject() : { ...capsule };

  if (!isUnlocked) {
    // Redact private message and photos content for locked capsules
    return {
      _id: doc._id,
      title: doc.title,
      unlockDate: doc.unlockDate,
      isLocked: true,
      photoCount: Array.isArray(doc.photos) ? doc.photos.length : 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isDemo: Boolean(doc.isDemo),
      sealedNote: '🔒 This capsule is currently sealed. Message and photographs are locked until the unlock date.',
    };
  }

  return {
    ...doc,
    isLocked: false,
    photoCount: Array.isArray(doc.photos) ? doc.photos.length : 0,
  };
}

// ─── Get All Capsules ─────────────────────────────────────────────────────────
exports.getCapsules = async (req, res) => {
  try {
    const capsules = await Capsule.find().sort({ unlockDate: 1 }).populate(
      'photos',
      'originalName storageName width height'
    );

    const sanitized = capsules.map(sanitizeCapsule);

    res.json({
      success: true,
      capsules: sanitized,
      total: sanitized.length,
      lockedCount: sanitized.filter((c) => c.isLocked).length,
      unlockedCount: sanitized.filter((c) => !c.isLocked).length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Get Single Capsule ───────────────────────────────────────────────────────
exports.getCapsule = async (req, res) => {
  try {
    const capsule = await Capsule.findById(req.params.id).populate(
      'photos',
      'originalName storageName width height description tags captureDate'
    );

    if (!capsule) {
      return res.status(404).json({ success: false, message: 'Memory capsule not found.' });
    }

    const isUnlocked = new Date() >= new Date(capsule.unlockDate);

    if (!isUnlocked) {
      // Backend security rule: Locked contents cannot be revealed early
      return res.status(200).json({
        success: true,
        isLocked: true,
        capsule: sanitizeCapsule(capsule),
        message: 'This capsule remains securely sealed.',
      });
    }

    // Auto-update lock flag in database if reached
    if (capsule.isLocked) {
      capsule.isLocked = false;
      await capsule.save();
    }

    res.json({
      success: true,
      isLocked: false,
      capsule: sanitizeCapsule(capsule),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Create Capsule ───────────────────────────────────────────────────────────
exports.createCapsule = async (req, res) => {
  try {
    const { title, message, photos, unlockDate } = req.body;

    // Validate inputs
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Capsule title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A personal message for your future self is required.' });
    }
    if (!unlockDate) {
      return res.status(400).json({ success: false, message: 'Unlock date is required.' });
    }

    const parsedDate = new Date(unlockDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid unlock date format.' });
    }

    if (parsedDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Unlock date must be in the future to seal a memory capsule.',
      });
    }

    if (!Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one photograph to seal in this capsule.',
      });
    }

    // Verify photo references exist
    const validPhotos = await Photo.find({ _id: { $in: photos } });
    if (validPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'None of the selected photo references were found in the library.',
      });
    }

    const capsule = new Capsule({
      title: title.trim(),
      message: message.trim(),
      photos: validPhotos.map((p) => p._id),
      unlockDate: parsedDate,
      isLocked: true,
      isDemo: false,
    });

    await capsule.save();

    res.status(201).json({
      success: true,
      capsule: sanitizeCapsule(capsule),
      message: 'Memory capsule sealed successfully.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Update Capsule ───────────────────────────────────────────────────────────
exports.updateCapsule = async (req, res) => {
  try {
    const { title, message } = req.body;
    const capsule = await Capsule.findById(req.params.id);

    if (!capsule) {
      return res.status(404).json({ success: false, message: 'Memory capsule not found.' });
    }

    if (title !== undefined) capsule.title = title.trim();
    if (message !== undefined) capsule.message = message.trim();

    await capsule.save();

    res.json({
      success: true,
      capsule: sanitizeCapsule(capsule),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Delete Capsule ───────────────────────────────────────────────────────────
exports.deleteCapsule = async (req, res) => {
  try {
    const capsule = await Capsule.findByIdAndDelete(req.params.id);
    if (!capsule) {
      return res.status(404).json({ success: false, message: 'Memory capsule not found.' });
    }

    res.json({
      success: true,
      message: 'Memory capsule deleted successfully. Photographs remain in your library.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
