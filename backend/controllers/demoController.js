const { importDemoPhotos, resetDemoPhotos, getDemoDirectory } = require('../services/demoImportService');
const Photo = require('../models/Photo');
const Album = require('../models/Album');

exports.importDemo = async (req, res) => {
  try {
    const summary = await importDemoPhotos({ demoDir: req.body.demoDir });
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.resetDemo = async (req, res) => {
  try {
    const summary = await resetDemoPhotos();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDemoStatus = async (req, res) => {
  try {
    const demoDir = getDemoDirectory();
    const [demoPhotosCount, userPhotosCount, demoAlbumsCount] = await Promise.all([
      Photo.countDocuments({ isDemo: true }),
      Photo.countDocuments({ isDemo: false }),
      Album.countDocuments({ isDemo: true }),
    ]);

    res.json({
      success: true,
      demoDirectory: demoDir,
      demoPhotosCount,
      userPhotosCount,
      demoAlbumsCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
