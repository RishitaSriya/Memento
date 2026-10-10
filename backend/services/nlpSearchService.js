/**
 * Natural language search parser and relevance scorer for "Ask Memento".
 */

// Month mappings
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function parseNaturalQuery(queryStr) {
  const query = (queryStr || '').toLowerCase().trim();
  const tokens = query.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);

  const parsed = {
    originalQuery: queryStr,
    tokens,
    temporal: {
      season: null,
      year: null,
      month: null,
      relative: null, // 'recent', 'last-year', 'yesterday'
    },
    semanticTags: [],
    colorKeywords: [],
    cleanSearchText: '',
  };

  // 1. Detect years (e.g., 2024, 2025, 2026)
  for (const token of tokens) {
    if (/^(19\d\d|20\d\d)$/.test(token)) {
      parsed.temporal.year = parseInt(token);
    }
  }

  // 2. Detect seasons
  if (query.includes('summer')) parsed.temporal.season = 'summer';
  if (query.includes('winter')) parsed.temporal.season = 'winter';
  if (query.includes('spring')) parsed.temporal.season = 'spring';
  if (query.includes('autumn') || query.includes('fall')) parsed.temporal.season = 'autumn';

  // 3. Detect relative temporal phrases
  if (query.includes('last summer')) {
    parsed.temporal.season = 'summer';
    parsed.temporal.relative = 'last-year';
  } else if (query.includes('last year')) {
    parsed.temporal.year = new Date().getFullYear() - 1;
  } else if (query.includes('recent') || query.includes('latest')) {
    parsed.temporal.relative = 'recent';
  }

  // 4. Detect months
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (tokens.includes(MONTH_NAMES[i])) {
      parsed.temporal.month = i + 1;
    }
  }

  // 5. Detect color keywords
  const colorList = ['black', 'white', 'golden', 'red', 'blue', 'green', 'amber', 'purple', 'violet', 'orange'];
  for (const color of colorList) {
    if (tokens.includes(color)) {
      parsed.colorKeywords.push(color);
    }
  }

  // 6. Stopwords removal for core keywords
  const stopwords = new Set([
    'show', 'me', 'find', 'the', 'a', 'an', 'photos', 'pictures', 'images', 'image',
    'where', 'i', 'am', 'was', 'with', 'from', 'my', 'of', 'in', 'on', 'at', 'wearing'
  ]);

  const semanticKeywords = tokens.filter((t) => !stopwords.has(t));
  parsed.semanticTags = semanticKeywords;
  parsed.cleanSearchText = semanticKeywords.join(' ');

  return parsed;
}

function scorePhoto(photo, parsedQuery) {
  let score = 0;
  const matchReasons = [];

  const originalName = (photo.originalName || '').toLowerCase();
  const description = (photo.description || '').toLowerCase();
  const aiDesc = (photo.aiDescription || '').toLowerCase();
  const tags = (photo.tags || []).map((t) => t.toLowerCase());
  const aiTags = (photo.aiTags || []).map((t) => t.toLowerCase());
  const allTags = [...tags, ...aiTags];

  // 1. Semantic Tag & Keyword Matches
  for (const word of parsedQuery.semanticTags) {
    if (originalName.includes(word)) {
      score += 6;
      matchReasons.push(`Title matches "${word}"`);
    }
    if (allTags.includes(word)) {
      score += 8;
      matchReasons.push(`Tag matches "${word}"`);
    } else if (allTags.some((t) => t.includes(word))) {
      score += 4;
      matchReasons.push(`Partial tag "${word}"`);
    }
    if (description.includes(word) || aiDesc.includes(word)) {
      score += 5;
      matchReasons.push(`Description matches "${word}"`);
    }
  }

  // 2. Color keyword matches
  for (const color of parsedQuery.colorKeywords) {
    const dominant = (photo.dominantColors || []).map((c) => c.toLowerCase());
    if (dominant.includes(color) || allTags.includes(color)) {
      score += 5;
      matchReasons.push(`Color profile matches "${color}"`);
    } else if (description.includes(color) || originalName.includes(color)) {
      score += 3;
      matchReasons.push(`Color keyword in metadata`);
    }
  }

  // 3. Temporal Matches
  const photoDate = photo.captureDate ? new Date(photo.captureDate) : new Date(photo.createdAt);
  if (!isNaN(photoDate.getTime())) {
    if (parsedQuery.temporal.year) {
      if (photoDate.getFullYear() === parsedQuery.temporal.year) {
        score += 7;
        matchReasons.push(`Year matches ${parsedQuery.temporal.year}`);
      }
    }
    if (parsedQuery.temporal.month) {
      if (photoDate.getMonth() + 1 === parsedQuery.temporal.month) {
        score += 5;
        matchReasons.push(`Month matches ${MONTH_NAMES[parsedQuery.temporal.month - 1]}`);
      }
    }
    if (parsedQuery.temporal.season) {
      const month = photoDate.getMonth() + 1;
      const isSummer = month >= 6 && month <= 8;
      const isWinter = month === 12 || month <= 2;
      const isSpring = month >= 3 && month <= 5;
      const isAutumn = month >= 9 && month <= 11;

      if (parsedQuery.temporal.season === 'summer' && isSummer) {
        score += 5;
        matchReasons.push('Captured in Summer');
      } else if (parsedQuery.temporal.season === 'winter' && isWinter) {
        score += 5;
        matchReasons.push('Captured in Winter');
      } else if (parsedQuery.temporal.season === 'spring' && isSpring) {
        score += 5;
        matchReasons.push('Captured in Spring');
      } else if (parsedQuery.temporal.season === 'autumn' && isAutumn) {
        score += 5;
        matchReasons.push('Captured in Autumn');
      }
    }
  }

  return {
    score,
    matchReasons: Array.from(new Set(matchReasons)),
  };
}

module.exports = {
  parseNaturalQuery,
  scorePhoto,
};
