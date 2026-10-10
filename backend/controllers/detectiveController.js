const fs = require('fs');
const Photo = require('../models/Photo');
const Album = require('../models/Album');

exports.getDetectiveAnalysis = async (req, res) => {
  try {
    const photos = await Photo.find().populate('albums', 'name');

    // 1. Exact Duplicate Detection via SHA-256 Checksum
    const checksumMap = {};
    for (const photo of photos) {
      if (!checksumMap[photo.checksum]) {
        checksumMap[photo.checksum] = [];
      }
      checksumMap[photo.checksum].push(photo);
    }

    const duplicateGroups = Object.entries(checksumMap)
      .filter(([_, group]) => group.length > 1)
      .map(([checksum, group]) => ({
        checksum,
        count: group.length,
        potentialSavingsBytes: (group.length - 1) * group[0].fileSize,
        photos: group,
      }));

    // 2. Large File Identification (> 5 MB)
    const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5 MB
    const largeFiles = photos
      .filter((p) => p.fileSize >= LARGE_FILE_THRESHOLD)
      .sort((a, b) => b.fileSize - a.fileSize);

    // 3. Library Health & Quality Checks
    const missingFiles = [];
    const lowResolutionOrBlurry = [];

    for (const photo of photos) {
      // Check physical file presence
      if (!photo.filePath || !fs.existsSync(photo.filePath)) {
        missingFiles.push({
          photo,
          reason: 'File missing from storage disk',
        });
        continue;
      }

      // Check quality/blur
      if (photo.blurScore && photo.blurScore > 75) {
        lowResolutionOrBlurry.push({
          photo,
          reason: `High blur/softness index (${photo.blurScore}/100)`,
        });
      } else if (photo.width && photo.height && (photo.width < 400 || photo.height < 400)) {
        lowResolutionOrBlurry.push({
          photo,
          reason: `Low resolution (${photo.width}x${photo.height})`,
        });
      }
    }

    // 4. Storage Breakdown Metrics
    const formatBreakdown = {};
    for (const p of photos) {
      const fmt = p.mimeType ? p.mimeType.split('/')[1] : 'other';
      if (!formatBreakdown[fmt]) formatBreakdown[fmt] = { count: 0, bytes: 0 };
      formatBreakdown[fmt].count++;
      formatBreakdown[fmt].bytes += p.fileSize || 0;
    }

    const totalStorageBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const potentialSavingsFromDuplicates = duplicateGroups.reduce(
      (acc, g) => acc + g.potentialSavingsBytes,
      0
    );

    res.json({
      success: true,
      summary: {
        totalPhotos: photos.length,
        totalStorageBytes,
        duplicateCount: duplicateGroups.reduce((acc, g) => acc + g.count, 0),
        duplicateGroupCount: duplicateGroups.length,
        potentialSavingsBytes: potentialSavingsFromDuplicates,
        largeFilesCount: largeFiles.length,
        missingFilesCount: missingFiles.length,
        lowResolutionCount: lowResolutionOrBlurry.length,
      },
      duplicateGroups,
      largeFiles,
      missingFiles,
      lowResolutionOrBlurry,
      formatBreakdown,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
