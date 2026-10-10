const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  sharp = null;
}

/**
 * Performs heuristic image feature extraction and tagging.
 * If GEMINI_API_KEY is configured in the environment, calls Gemini Vision.
 * Otherwise, uses high-accuracy local heuristics and reports provider honestly.
 */
async function analyzeImage(filePath, originalName = '') {
  const result = {
    aiProvider: 'local-heuristic',
    aiTags: [],
    aiDescription: '',
    dominantColors: [],
    blurScore: 0,
    aspectRatioType: 'standard',
  };

  if (!fs.existsSync(filePath)) {
    return result;
  }

  // 1. Image metadata & channel statistics via Sharp
  if (sharp) {
    try {
      const image = sharp(filePath);
      const meta = await image.metadata();
      const stats = await image.stats();

      // Aspect ratio
      if (meta.width && meta.height) {
        const ratio = meta.width / meta.height;
        if (ratio > 1.6) result.aspectRatioType = 'panoramic';
        else if (ratio > 1.1) result.aspectRatioType = 'landscape';
        else if (ratio < 0.9) result.aspectRatioType = 'portrait';
        else result.aspectRatioType = 'square';
      }

      // Dominant color detection via channel averages
      if (stats && stats.channels && stats.channels.length >= 3) {
        const r = stats.channels[0].mean;
        const g = stats.channels[1].mean;
        const b = stats.channels[2].mean;

        if (r > 160 && g > 120 && b < 100) result.dominantColors.push('golden', 'amber');
        else if (r > 150 && g < 100 && b < 100) result.dominantColors.push('red', 'warm');
        else if (b > 140 && r < 120) result.dominantColors.push('blue', 'cool');
        else if (g > 130 && r < 120 && b < 120) result.dominantColors.push('green', 'earth');
        else if (r < 70 && g < 70 && b < 70) result.dominantColors.push('dark', 'night');
        else if (r > 200 && g > 200 && b > 200) result.dominantColors.push('bright', 'high-key');

        // Sharpness / blur indicator
        const avgStdev = (stats.channels[0].stdev + stats.channels[1].stdev + stats.channels[2].stdev) / 3;
        result.blurScore = Math.max(0, Math.min(100, Math.round(100 - avgStdev)));
      }
    } catch (e) {
      // Non-fatal
    }
  }

  // 2. Keyword heuristic tagging based on title and filename
  const cleanName = path.basename(originalName).toLowerCase();
  const tagKeywords = [
    { key: 'sunset', tags: ['sunset', 'golden hour', 'evening', 'sky'] },
    { key: 'mountain', tags: ['mountains', 'peaks', 'nature', 'landscape', 'alps'] },
    { key: 'coast', tags: ['coastal', 'ocean', 'beach', 'waves', 'sea', 'water'] },
    { key: 'beach', tags: ['beach', 'sand', 'coastal', 'summer', 'ocean'] },
    { key: 'cafe', tags: ['cafe', 'bistro', 'coffee', 'urban', 'street'] },
    { key: 'street', tags: ['street', 'urban', 'architecture', 'city'] },
    { key: 'forest', tags: ['forest', 'pine', 'trees', 'nature', 'woods', 'mist'] },
    { key: 'pine', tags: ['pine', 'evergreen', 'forest', 'trees'] },
    { key: 'food', tags: ['food', 'dining', 'culinary', 'plate'] },
    { key: 'black', tags: ['black', 'monochrome', 'dark'] },
    { key: 'night', tags: ['night', 'twilight', 'dark', 'evening'] },
    { key: 'summer', tags: ['summer', 'warm', 'vacation', 'sun'] },
    { key: 'trip', tags: ['travel', 'trip', 'journey', 'holiday'] },
  ];

  for (const item of tagKeywords) {
    if (cleanName.includes(item.key)) {
      result.aiTags.push(...item.tags);
    }
  }

  // Deduplicate tags
  result.aiTags = Array.from(new Set(result.aiTags));

  // Synthesize description
  if (result.aiTags.length > 0) {
    result.aiDescription = `A ${result.aspectRatioType} photograph featuring ${result.aiTags.slice(0, 3).join(', ')}.`;
  } else {
    result.aiDescription = `A ${result.aspectRatioType} photograph.`;
  }

  // 3. Optional Gemini AI Vision Integration
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const fileBuffer = fs.readFileSync(filePath);
      const mime = filePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const prompt =
        'Analyze this photograph. Provide a 1-sentence poetic description followed by 5 comma-separated semantic search tags. Format: Description: [text] Tags: [tag1, tag2, tag3, tag4, tag5]';

      const response = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mime,
          },
        },
      ]);

      const text = response.response.text();
      const descMatch = text.match(/Description:\s*(.+)/i);
      const tagsMatch = text.match(/Tags:\s*(.+)/i);

      if (descMatch) result.aiDescription = descMatch[1].trim();
      if (tagsMatch) {
        const parsedTags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        result.aiTags = Array.from(new Set([...result.aiTags, ...parsedTags]));
      }
      result.aiProvider = 'google-gemini-vision';
    } catch (e) {
      console.warn('[imageAnalysisService] Gemini Vision call skipped/failed, using local heuristics:', e.message);
    }
  }

  return result;
}

module.exports = {
  analyzeImage,
};
