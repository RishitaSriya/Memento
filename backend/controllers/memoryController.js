const Photo = require('../models/Photo');

// ─── Memory Rewind ─────────────────────────────────────────────────────────────
// Shows memories from the exact calendar date (month & day) in previous years.
exports.getRewind = async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date parameter provided.' });
    }

    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();
    const currentYear = targetDate.getFullYear();

    // Find photos from past years matching this calendar month and day
    const photos = await Photo.aggregate([
      {
        $project: {
          originalName: 1,
          storageName: 1,
          description: 1,
          tags: 1,
          aiTags: 1,
          aiDescription: 1,
          width: 1,
          height: 1,
          isFavorite: 1,
          isDemo: 1,
          captureDate: 1,
          createdAt: 1,
          effectiveDate: { $ifNull: ['$captureDate', '$createdAt'] },
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: '$effectiveDate' }, month] },
              { $eq: [{ $dayOfMonth: '$effectiveDate' }, day] },
              { $lt: [{ $year: '$effectiveDate' }, currentYear] },
            ],
          },
        },
      },
      { $sort: { effectiveDate: -1 } },
    ]);

    // Group photos by year
    const yearlyMap = {};
    for (const photo of photos) {
      const year = new Date(photo.effectiveDate).getFullYear();
      if (!yearlyMap[year]) {
        yearlyMap[year] = {
          year,
          yearsAgo: currentYear - year,
          count: 0,
          photos: [],
        };
      }
      yearlyMap[year].count++;
      yearlyMap[year].photos.push(photo);
    }

    const years = Object.values(yearlyMap).sort((a, b) => b.year - a.year);

    res.json({
      success: true,
      queryDate: {
        month,
        day,
        year: currentYear,
        formatted: targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
      },
      totalMemories: photos.length,
      yearsRepresented: years.length,
      rewindYears: years,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 30-Day Recap ─────────────────────────────────────────────────────────────
// Synthesizes a curated review of moments from the last 30 calendar days.
exports.getRecap30Days = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let photos = await Photo.find({
      $or: [
        { captureDate: { $gte: thirtyDaysAgo, $lte: now } },
        { createdAt: { $gte: thirtyDaysAgo, $lte: now } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate('albums', 'name');

    let isFallback = false;
    // If fewer than 4 photos in the last 30 days, fallback to the most recent memories
    if (photos.length < 4) {
      isFallback = true;
      photos = await Photo.find()
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('albums', 'name');
    }

    const totalStorageBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const favoritesCount = photos.filter((p) => p.isFavorite).length;

    // Group into timeline days
    const daysMap = {};
    for (const p of photos) {
      const d = p.captureDate ? new Date(p.captureDate) : new Date(p.createdAt);
      const dateKey = d.toISOString().split('T')[0];
      if (!daysMap[dateKey]) {
        daysMap[dateKey] = {
          date: dateKey,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          photos: [],
        };
      }
      daysMap[dateKey].photos.push(p);
    }

    const days = Object.values(daysMap).sort((a, b) => b.date.localeCompare(a.date));

    res.json({
      success: true,
      timeframe: {
        from: thirtyDaysAgo.toISOString(),
        to: now.toISOString(),
        isFallback,
      },
      stats: {
        photoCount: photos.length,
        daysCount: days.length,
        favoritesCount,
        totalStorageBytes,
      },
      days,
      featuredMoments: photos.filter((p) => p.isFavorite).slice(0, 6),
      allPhotos: photos,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
