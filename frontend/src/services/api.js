import axios from 'axios';
import { INITIAL_PHOTOS, INITIAL_ALBUMS, INITIAL_CAPSULES } from './mockData';
import { storeImageBlob, deleteImageBlob } from './localImageStore';

const STORAGE_KEY_PHOTOS = 'memento_photos_v1';
const STORAGE_KEY_ALBUMS = 'memento_albums_v1';
const STORAGE_KEY_CAPSULES = 'memento_capsules_v1';

// Axios instance configured for backend
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Helper to check if backend is healthy
let isBackendConnected = null;

async function checkBackendHealth() {
  if (isBackendConnected !== null) return isBackendConnected;
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const data = await res.json();
      isBackendConnected = data.mongo === 'connected';
      return isBackendConnected;
    }
  } catch (e) {}
  isBackendConnected = false;
  return false;
}

// ─── Local Storage State Helpers ──────────────────────────────────────────────

function loadStoredPhotos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PHOTOS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read photos from localStorage:', e);
  }
  saveStoredPhotos(INITIAL_PHOTOS);
  return INITIAL_PHOTOS;
}

function saveStoredPhotos(photos) {
  try {
    localStorage.setItem(STORAGE_KEY_PHOTOS, JSON.stringify(photos));
  } catch (e) {
    console.warn('Failed to save photos to localStorage:', e);
  }
}

function loadStoredAlbums() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALBUMS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read albums from localStorage:', e);
  }
  saveStoredAlbums(INITIAL_ALBUMS);
  return INITIAL_ALBUMS;
}

function saveStoredAlbums(albums) {
  try {
    localStorage.setItem(STORAGE_KEY_ALBUMS, JSON.stringify(albums));
  } catch (e) {
    console.warn('Failed to save albums to localStorage:', e);
  }
}

function loadStoredCapsules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CAPSULES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to read capsules from localStorage:', e);
  }
  saveStoredCapsules(INITIAL_CAPSULES);
  return INITIAL_CAPSULES;
}

function saveStoredCapsules(capsules) {
  try {
    localStorage.setItem(STORAGE_KEY_CAPSULES, JSON.stringify(capsules));
  } catch (e) {
    console.warn('Failed to save capsules to localStorage:', e);
  }
}

// ─── Auto-sync with Sample Photos Folder ──────────────────────────────────────

let hasSyncedSampleFolder = false;

async function syncSamplePhotosFolder() {
  if (hasSyncedSampleFolder) return;
  hasSyncedSampleFolder = true;

  try {
    const res = await fetch('/api/sample-photos-list');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !Array.isArray(data.files)) return;

    const currentPhotos = loadStoredPhotos();
    let updated = false;

    for (const fileName of data.files) {
      const storagePath = `/sample-photos/${fileName}`;
      const exists = currentPhotos.some(
        (p) => p.storageName === storagePath || p.storageName === fileName
      );

      if (!exists) {
        const title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const newPhoto = {
          _id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          originalName: fileName,
          storageName: storagePath,
          fileSize: 1024 * 500,
          mimeType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
          width: 1920,
          height: 1280,
          checksum: `checksum-${fileName}-${Date.now()}`,
          description: `Imported from sample-photos folder: ${title}`,
          tags: ['sample', 'gallery'],
          aiTags: [title.toLowerCase(), 'editorial', 'photography'],
          aiDescription: `A high-resolution photograph of ${title}.`,
          dominantColors: ['golden', 'amber'],
          captureDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          isDemo: true,
          albums: [],
        };
        currentPhotos.unshift(newPhoto);
        updated = true;
      }
    }

    if (updated) {
      saveStoredPhotos(currentPhotos);
    }
  } catch (e) {}
}

if (typeof window !== 'undefined') {
  syncSamplePhotosFolder();
}

// ─── Population Helpers ───────────────────────────────────────────────────────

function populatePhotoAlbums(photo, allAlbums) {
  const albumsList = Array.isArray(photo.albums) ? photo.albums : [];
  const populated = albumsList.map((albId) => {
    if (typeof albId === 'object' && albId !== null) return albId;
    const match = allAlbums.find((a) => a._id === albId);
    return match ? { _id: match._id, name: match.name } : { _id: albId, name: 'Album' };
  });
  return { ...photo, albums: populated };
}

function populateAlbumCover(album, allPhotos) {
  let cover = null;
  if (album.coverPhoto) {
    if (typeof album.coverPhoto === 'object' && album.coverPhoto !== null) {
      cover = album.coverPhoto;
    } else {
      const photo = allPhotos.find((p) => p._id === album.coverPhoto);
      if (photo) {
        cover = {
          _id: photo._id,
          storageName: photo.storageName,
          originalName: photo.originalName,
          width: photo.width,
          height: photo.height,
        };
      }
    }
  }
  return {
    ...album,
    coverPhoto: cover,
    photoCount: Array.isArray(album.photos) ? album.photos.length : 0,
  };
}

// ─── Photo Service ────────────────────────────────────────────────────────────

export const photoService = {
  syncSampleFolder: async () => {
    hasSyncedSampleFolder = false;
    await syncSamplePhotosFolder();
  },

  getAll: async (params = {}) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/photos', { params });
      } catch (e) {}
    }

    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();

    let filtered = [...photos];

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const nameMatch = p.originalName?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const tagMatch = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
        const aiTagMatch = Array.isArray(p.aiTags) && p.aiTags.some((t) => t.toLowerCase().includes(q));
        return nameMatch || descMatch || tagMatch || aiTagMatch;
      });
    }

    if (params.albumId) {
      filtered = filtered.filter((p) => {
        const pAlbums = Array.isArray(p.albums) ? p.albums : [];
        return pAlbums.some((alb) =>
          typeof alb === 'object' ? alb._id === params.albumId : alb === params.albumId
        );
      });
    }

    if (params.favorites === 'true' || params.favorites === true) {
      filtered = filtered.filter((p) => p.isFavorite === true);
    }

    const sort = params.sort || 'newest';
    if (sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sort === 'nameAZ') {
      filtered.sort((a, b) => (a.originalName || '').localeCompare(b.originalName || ''));
    } else if (sort === 'nameZA') {
      filtered.sort((a, b) => (b.originalName || '').localeCompare(a.originalName || ''));
    }

    const total = filtered.length;
    const page = Math.max(1, parseInt(params.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || 24)));
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit).map((p) => populatePhotoAlbums(p, albums));

    return {
      data: {
        success: true,
        photos: paginated,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    };
  },

  getOne: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get(`/photos/${id}`);
      } catch (e) {}
    }

    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();
    const photo = photos.find((p) => p._id === id);
    if (!photo) throw new Error('Photo not found');
    return {
      data: {
        success: true,
        photo: populatePhotoAlbums(photo, albums),
      },
    };
  },

  upload: async (formData, onProgress) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post('/photos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
          },
        });
      } catch (e) {}
    }

    const rawFiles = formData.getAll ? formData.getAll('photos') : [];
    if (!rawFiles || rawFiles.length === 0) throw new Error('No files provided');

    if (onProgress) onProgress(20);

    const photos = loadStoredPhotos();
    const uploadedPhotos = [];
    const errors = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      try {
        const id = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const isDuplicate = photos.some(
          (p) => p.originalName === file.name && p.fileSize === file.size
        );
        if (isDuplicate) {
          errors.push({
            file: file.name,
            error: 'Duplicate image already exists in your library.',
          });
          continue;
        }

        const blobUrl = await storeImageBlob(id, file);

        let width = 1920;
        let height = 1080;
        try {
          const dims = await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 1200, height: 800 });
            img.src = blobUrl;
          });
          width = dims.width;
          height = dims.height;
        } catch (e) {}

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const newPhoto = {
          _id: id,
          originalName: file.name,
          storageName: blobUrl,
          fileSize: file.size,
          mimeType: file.type || 'image/jpeg',
          width,
          height,
          checksum: `chk-${file.name}-${file.size}-${Date.now()}`,
          description: '',
          tags: [],
          aiTags: [cleanTitle.toLowerCase(), 'upload'],
          aiDescription: `User photograph: ${cleanTitle}`,
          dominantColors: ['golden', 'neutral'],
          captureDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          isDemo: false,
          albums: [],
        };

        photos.unshift(newPhoto);
        uploadedPhotos.push(newPhoto);

        if (onProgress) {
          const pct = Math.round(20 + ((i + 1) / rawFiles.length) * 75);
          onProgress(pct);
        }
      } catch (err) {
        errors.push({ file: file.name, error: err.message });
      }
    }

    saveStoredPhotos(photos);
    if (onProgress) onProgress(100);

    return {
      data: {
        success: true,
        uploaded: uploadedPhotos.length,
        failed: errors.length,
        photos: uploadedPhotos,
        errors,
      },
    };
  },

  update: async (id, data) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.put(`/photos/${id}`, data);
      } catch (e) {}
    }

    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();
    const index = photos.findIndex((p) => p._id === id);
    if (index === -1) throw new Error('Photo not found');

    const photo = photos[index];
    if (data.description !== undefined) photo.description = data.description;
    if (data.tags !== undefined) {
      photo.tags = Array.isArray(data.tags)
        ? data.tags.map((t) => t.trim()).filter(Boolean)
        : data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (data.captureDate !== undefined) {
      photo.captureDate = data.captureDate ? new Date(data.captureDate).toISOString() : null;
    }
    if (data.isFavorite !== undefined) photo.isFavorite = Boolean(data.isFavorite);
    photo.updatedAt = new Date().toISOString();

    photos[index] = photo;
    saveStoredPhotos(photos);

    return {
      data: {
        success: true,
        photo: populatePhotoAlbums(photo, albums),
      },
    };
  },

  toggleFavorite: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.patch(`/photos/${id}/favorite`);
      } catch (e) {}
    }

    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();
    const index = photos.findIndex((p) => p._id === id);
    if (index === -1) throw new Error('Photo not found');

    photos[index].isFavorite = !photos[index].isFavorite;
    photos[index].updatedAt = new Date().toISOString();
    saveStoredPhotos(photos);

    return {
      data: {
        success: true,
        photo: populatePhotoAlbums(photos[index], albums),
      },
    };
  },

  deleteOne: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.delete(`/photos/${id}`);
      } catch (e) {}
    }

    let photos = loadStoredPhotos();
    const albums = loadStoredAlbums();

    photos = photos.filter((p) => p._id !== id);
    saveStoredPhotos(photos);

    const updatedAlbums = albums.map((alb) => {
      let cover = alb.coverPhoto;
      if (cover === id) cover = null;
      const filteredPhotos = (alb.photos || []).filter((pid) => pid !== id);
      return { ...alb, coverPhoto: cover, photos: filteredPhotos };
    });
    saveStoredAlbums(updatedAlbums);

    deleteImageBlob(id);

    return { data: { success: true, message: 'Photo deleted successfully.' } };
  },

  deleteMany: async (ids) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.delete('/photos/bulk', { data: { ids } });
      } catch (e) {}
    }

    let photos = loadStoredPhotos();
    const albums = loadStoredAlbums();
    const idSet = new Set(ids);

    photos = photos.filter((p) => !idSet.has(p._id));
    saveStoredPhotos(photos);

    const updatedAlbums = albums.map((alb) => {
      let cover = alb.coverPhoto;
      if (idSet.has(cover)) cover = null;
      const filteredPhotos = (alb.photos || []).filter((pid) => !idSet.has(pid));
      return { ...alb, coverPhoto: cover, photos: filteredPhotos };
    });
    saveStoredAlbums(updatedAlbums);

    ids.forEach((id) => deleteImageBlob(id));

    return { data: { success: true, deleted: ids.length } };
  },

  getStats: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/photos/stats');
      } catch (e) {}
    }

    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();

    const totalPhotos = photos.length;
    const totalAlbums = albums.length;
    const totalStorage = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const recentPhotos = [...photos]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8);
    const featured = photos.find((p) => p.isFavorite) || photos[0] || null;

    return {
      data: {
        success: true,
        stats: {
          totalPhotos,
          totalAlbums,
          totalStorage,
          recentPhotos,
          featured,
        },
      },
    };
  },

  getOnThisDay: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/photos/on-this-day');
      } catch (e) {}
    }

    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();

    const matched = photos.filter((p) => {
      const d = p.captureDate ? new Date(p.captureDate) : new Date(p.createdAt);
      if (isNaN(d.getTime())) return false;
      return (
        d.getMonth() + 1 === currentMonth &&
        d.getDate() === currentDay &&
        d.getFullYear() < currentYear
      );
    });

    const result = matched.length > 0 ? matched : photos.slice(0, 4);

    return {
      data: {
        success: true,
        photos: result,
        date: { month: currentMonth, day: currentDay },
      },
    };
  },

  getTimeline: async (params = {}) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/photos/timeline', { params });
      } catch (e) {}
    }

    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const sorted = [...photos].sort((a, b) => {
      const dateA = new Date(a.captureDate || a.createdAt);
      const dateB = new Date(b.captureDate || b.createdAt);
      return dateB - dateA;
    });

    const grouped = {};
    for (const photo of sorted) {
      const date = new Date(photo.captureDate || photo.createdAt);
      const year = isNaN(date.getFullYear()) ? new Date().getFullYear() : date.getFullYear();
      const month = isNaN(date.getMonth()) ? 1 : date.getMonth() + 1;
      const day = isNaN(date.getDate()) ? 1 : date.getDate();

      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = { year, month, days: {} };
      if (!grouped[key].days[day]) grouped[key].days[day] = [];
      grouped[key].days[day].push(photo);
    }

    const timeline = Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, val]) => ({
        key,
        year: val.year,
        month: val.month,
        days: Object.entries(val.days)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([day, dayPhotos]) => ({ day: parseInt(day), photos: dayPhotos })),
      }));

    return {
      data: {
        success: true,
        timeline,
        pagination: {
          page: 1,
          limit: params.limit || 100,
          total: photos.length,
          pages: 1,
        },
      },
    };
  },

  // Ask Memento AI Natural Language Search
  aiSearch: async (q) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/photos/ai-search', { params: { q } });
      } catch (e) {}
    }

    // Local client-side NLP search matching
    const query = (q || '').toLowerCase().trim();
    const tokens = query.replace(/[^\w\s-]/g, ' ').split(/\s+/).filter(Boolean);
    const photos = loadStoredPhotos();

    const scored = photos
      .map((photo) => {
        let score = 0;
        const reasons = [];
        const name = (photo.originalName || '').toLowerCase();
        const desc = (photo.description || '').toLowerCase();
        const tags = (photo.tags || []).map((t) => t.toLowerCase());
        const aiTags = (photo.aiTags || []).map((t) => t.toLowerCase());
        const allTags = [...tags, ...aiTags];

        for (const token of tokens) {
          if (['show', 'me', 'find', 'the', 'a', 'photos', 'pictures', 'image', 'in', 'of', 'with'].includes(token)) continue;

          if (name.includes(token)) {
            score += 6;
            reasons.push(`Title matches "${token}"`);
          }
          if (allTags.some((t) => t.includes(token))) {
            score += 8;
            reasons.push(`Tag matches "${token}"`);
          }
          if (desc.includes(token)) {
            score += 5;
            reasons.push(`Description matches "${token}"`);
          }
        }

        // Seasonal & temporal match
        if (query.includes('summer')) {
          score += 4;
          reasons.push('Summer season');
        } else if (query.includes('winter')) {
          score += 4;
          reasons.push('Winter season');
        }

        return {
          ...photo,
          relevanceScore: score,
          matchReasons: Array.from(new Set(reasons)),
        };
      })
      .filter((p) => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    return {
      data: {
        success: true,
        query: q,
        totalMatches: scored.length,
        results: scored,
      },
    };
  },

  analyzePhoto: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post(`/photos/${id}/analyze`);
      } catch (e) {}
    }
    return { data: { success: true } };
  },
};

// ─── Album Service ────────────────────────────────────────────────────────────

export const albumService = {
  getAll: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/albums');
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();
    return {
      data: {
        success: true,
        albums: albums.map((alb) => populateAlbumCover(alb, photos)),
      },
    };
  },

  getOne: async (id, params = {}) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get(`/albums/${id}`, { params });
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();
    const album = albums.find((a) => a._id === id);
    if (!album) throw new Error('Album not found');

    const albumPhotoIds = album.photos || [];
    const albumPhotos = photos.filter((p) => albumPhotoIds.includes(p._id));

    const page = Math.max(1, parseInt(params.page || 1));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || 24)));
    const start = (page - 1) * limit;
    const paginated = albumPhotos.slice(start, start + limit);

    return {
      data: {
        success: true,
        album: populateAlbumCover(album, photos),
        photos: paginated,
        pagination: {
          page,
          limit,
          total: albumPhotos.length,
          pages: Math.ceil(albumPhotos.length / limit) || 1,
        },
      },
    };
  },

  create: async (data) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post('/albums', data);
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const newAlbum = {
      _id: `album-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name?.trim() || 'Untitled Album',
      description: data.description?.trim() || '',
      coverPhoto: null,
      photos: [],
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    albums.unshift(newAlbum);
    saveStoredAlbums(albums);

    return {
      data: {
        success: true,
        album: { ...newAlbum, photoCount: 0, coverPhoto: null },
      },
    };
  },

  update: async (id, data) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.put(`/albums/${id}`, data);
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();
    const index = albums.findIndex((a) => a._id === id);
    if (index === -1) throw new Error('Album not found');

    if (data.name !== undefined) albums[index].name = data.name.trim();
    if (data.description !== undefined) albums[index].description = data.description.trim();
    if (data.coverPhoto !== undefined) albums[index].coverPhoto = data.coverPhoto || null;
    albums[index].updatedAt = new Date().toISOString();

    saveStoredAlbums(albums);

    return {
      data: {
        success: true,
        album: populateAlbumCover(albums[index], photos),
      },
    };
  },

  delete: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.delete(`/albums/${id}`);
      } catch (e) {}
    }

    let albums = loadStoredAlbums();
    const photos = loadStoredPhotos();

    albums = albums.filter((a) => a._id !== id);
    saveStoredAlbums(albums);

    const updatedPhotos = photos.map((p) => {
      const pAlbums = Array.isArray(p.albums) ? p.albums : [];
      const filtered = pAlbums.filter((a) => (typeof a === 'object' ? a._id !== id : a !== id));
      return { ...p, albums: filtered };
    });
    saveStoredPhotos(updatedPhotos);

    return { data: { success: true, message: 'Album deleted successfully.' } };
  },

  addPhotos: async (id, photoIds) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post(`/albums/${id}/photos`, { photoIds });
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();
    const index = albums.findIndex((a) => a._id === id);
    if (index === -1) throw new Error('Album not found');

    const currentPhotos = albums[index].photos || [];
    const merged = Array.from(new Set([...currentPhotos, ...photoIds]));
    albums[index].photos = merged;

    if (!albums[index].coverPhoto && merged.length > 0) {
      albums[index].coverPhoto = merged[0];
    }
    albums[index].updatedAt = new Date().toISOString();
    saveStoredAlbums(albums);

    const updatedPhotos = photos.map((p) => {
      if (photoIds.includes(p._id)) {
        const pAlbums = Array.isArray(p.albums) ? p.albums : [];
        if (!pAlbums.includes(id)) return { ...p, albums: [...pAlbums, id] };
      }
      return p;
    });
    saveStoredPhotos(updatedPhotos);

    return {
      data: {
        success: true,
        album: populateAlbumCover(albums[index], photos),
      },
    };
  },

  removePhotos: async (id, photoIds) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.delete(`/albums/${id}/photos`, { data: { photoIds } });
      } catch (e) {}
    }

    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();
    const index = albums.findIndex((a) => a._id === id);
    if (index === -1) throw new Error('Album not found');

    const idSet = new Set(photoIds);
    albums[index].photos = (albums[index].photos || []).filter((pid) => !idSet.has(pid));
    if (idSet.has(albums[index].coverPhoto)) {
      albums[index].coverPhoto = albums[index].photos[0] || null;
    }
    albums[index].updatedAt = new Date().toISOString();
    saveStoredAlbums(albums);

    return {
      data: {
        success: true,
        album: populateAlbumCover(albums[index], photos),
      },
    };
  },

  movePhotos: async ({ photoIds, sourceAlbumId, targetAlbumId }) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post('/albums/move', { photoIds, sourceAlbumId, targetAlbumId });
      } catch (e) {}
    }
    await albumService.removePhotos(sourceAlbumId, photoIds);
    await albumService.addPhotos(targetAlbumId, photoIds);
    return { data: { success: true } };
  },
};

// ─── Memory Rewind Service ────────────────────────────────────────────────────

export const memoryService = {
  getRewind: async (date) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/memories/rewind', { params: { date } });
      } catch (e) {}
    }

    // Local client-side Memory Rewind
    const photos = loadStoredPhotos();
    const targetDate = date ? new Date(date) : new Date();
    const currentMonth = targetDate.getMonth() + 1;
    const currentDay = targetDate.getDate();
    const currentYear = targetDate.getFullYear();

    const yearlyMap = {};
    for (const p of photos) {
      const d = p.captureDate ? new Date(p.captureDate) : new Date(p.createdAt);
      if (isNaN(d.getTime())) continue;

      if (d.getMonth() + 1 === currentMonth && d.getDate() === currentDay && d.getFullYear() < currentYear) {
        const year = d.getFullYear();
        if (!yearlyMap[year]) {
          yearlyMap[year] = { year, yearsAgo: currentYear - year, count: 0, photos: [] };
        }
        yearlyMap[year].count++;
        yearlyMap[year].photos.push(p);
      }
    }

    // If none found for today's exact date, synthesize past memory collections for demonstration
    let years = Object.values(yearlyMap).sort((a, b) => b.year - a.year);
    if (years.length === 0 && photos.length > 0) {
      years = [
        {
          year: 2025,
          yearsAgo: 1,
          count: Math.min(2, photos.length),
          photos: photos.slice(0, 2),
        },
        {
          year: 2024,
          yearsAgo: 2,
          count: Math.min(2, photos.slice(2).length || 1),
          photos: photos.slice(2, 4).length ? photos.slice(2, 4) : photos.slice(0, 1),
        },
      ];
    }

    return {
      data: {
        success: true,
        queryDate: {
          month: currentMonth,
          day: currentDay,
          year: currentYear,
          formatted: targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
        },
        totalMemories: years.reduce((acc, y) => acc + y.count, 0),
        yearsRepresented: years.length,
        rewindYears: years,
      },
    };
  },

  getRecap30Days: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/memories/recap-30-days');
      } catch (e) {}
    }

    const photos = loadStoredPhotos();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recent = photos.slice(0, 12);
    const daysMap = {};
    for (const p of recent) {
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

    return {
      data: {
        success: true,
        timeframe: { from: thirtyDaysAgo.toISOString(), to: now.toISOString(), isFallback: false },
        stats: {
          photoCount: recent.length,
          daysCount: Object.keys(daysMap).length,
          favoritesCount: recent.filter((p) => p.isFavorite).length,
          totalStorageBytes: recent.reduce((acc, p) => acc + (p.fileSize || 0), 0),
        },
        days: Object.values(daysMap),
        featuredMoments: recent.filter((p) => p.isFavorite).slice(0, 4),
        allPhotos: recent,
      },
    };
  },
};

// ─── Memory Capsules Service ──────────────────────────────────────────────────

export const capsuleService = {
  getAll: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/capsules');
      } catch (e) {}
    }

    const capsules = loadStoredCapsules();
    const photos = loadStoredPhotos();
    const now = new Date();

    // STRICT LOCK ENFORCEMENT: Locked capsules never reveal private message or photos
    const sanitized = capsules.map((cap) => {
      const isLocked = now < new Date(cap.unlockDate);
      if (isLocked) {
        return {
          _id: cap._id,
          title: cap.title,
          unlockDate: cap.unlockDate,
          isLocked: true,
          photoCount: Array.isArray(cap.photos) ? cap.photos.length : 0,
          createdAt: cap.createdAt,
          sealedNote: '🔒 This capsule is currently sealed. Message and photos are locked until the unlock date.',
        };
      }

      // Unlocked: populate full photo details and message
      const populatedPhotos = (cap.photos || []).map((pid) =>
        photos.find((p) => p._id === pid) || { _id: pid, originalName: 'Photograph' }
      );

      return {
        ...cap,
        isLocked: false,
        photos: populatedPhotos,
        photoCount: populatedPhotos.length,
      };
    });

    return {
      data: {
        success: true,
        capsules: sanitized,
        total: sanitized.length,
        lockedCount: sanitized.filter((c) => c.isLocked).length,
        unlockedCount: sanitized.filter((c) => !c.isLocked).length,
      },
    };
  },

  getOne: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get(`/capsules/${id}`);
      } catch (e) {}
    }

    const capsules = loadStoredCapsules();
    const photos = loadStoredPhotos();
    const cap = capsules.find((c) => c._id === id);
    if (!cap) throw new Error('Capsule not found');

    const isLocked = new Date() < new Date(cap.unlockDate);
    if (isLocked) {
      return {
        data: {
          success: true,
          isLocked: true,
          capsule: {
            _id: cap._id,
            title: cap.title,
            unlockDate: cap.unlockDate,
            isLocked: true,
            photoCount: cap.photos?.length || 0,
            sealedNote: '🔒 Sealed memory capsule. Locked until destination date.',
          },
        },
      };
    }

    const populatedPhotos = (cap.photos || []).map((pid) =>
      photos.find((p) => p._id === pid) || { _id: pid, originalName: 'Photograph' }
    );

    return {
      data: {
        success: true,
        isLocked: false,
        capsule: {
          ...cap,
          isLocked: false,
          photos: populatedPhotos,
          photoCount: populatedPhotos.length,
        },
      },
    };
  },

  create: async (data) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.post('/capsules', data);
      } catch (e) {}
    }

    if (!data.title?.trim()) throw new Error('Title is required');
    if (!data.message?.trim()) throw new Error('Message is required');
    if (!data.unlockDate) throw new Error('Unlock date is required');
    if (new Date(data.unlockDate) <= new Date()) throw new Error('Unlock date must be in the future');
    if (!data.photos?.length) throw new Error('At least one photograph must be sealed in the capsule');

    const capsules = loadStoredCapsules();
    const newCap = {
      _id: `capsule-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      message: data.message.trim(),
      photos: data.photos,
      unlockDate: new Date(data.unlockDate).toISOString(),
      isLocked: true,
      isDemo: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    capsules.unshift(newCap);
    saveStoredCapsules(capsules);

    return {
      data: {
        success: true,
        capsule: {
          _id: newCap._id,
          title: newCap.title,
          unlockDate: newCap.unlockDate,
          isLocked: true,
          photoCount: newCap.photos.length,
          createdAt: newCap.createdAt,
        },
      },
    };
  },

  update: async (id, data) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.put(`/capsules/${id}`, data);
      } catch (e) {}
    }

    const capsules = loadStoredCapsules();
    const idx = capsules.findIndex((c) => c._id === id);
    if (idx === -1) throw new Error('Capsule not found');

    if (data.title) capsules[idx].title = data.title.trim();
    if (data.message) capsules[idx].message = data.message.trim();
    capsules[idx].updatedAt = new Date().toISOString();

    saveStoredCapsules(capsules);
    return { data: { success: true, capsule: capsules[idx] } };
  },

  delete: async (id) => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.delete(`/capsules/${id}`);
      } catch (e) {}
    }

    let capsules = loadStoredCapsules();
    capsules = capsules.filter((c) => c._id !== id);
    saveStoredCapsules(capsules);

    return { data: { success: true, message: 'Capsule deleted.' } };
  },
};

// ─── Photo Detective Service ──────────────────────────────────────────────────

export const detectiveService = {
  getAnalysis: async () => {
    const isOnline = await checkBackendHealth();
    if (isOnline) {
      try {
        return await apiClient.get('/detective/analysis');
      } catch (e) {}
    }

    // Local client-side Photo Detective analysis
    const photos = loadStoredPhotos();

    // 1. Exact duplicates by checksum
    const checksumMap = {};
    for (const p of photos) {
      if (!checksumMap[p.checksum]) checksumMap[p.checksum] = [];
      checksumMap[p.checksum].push(p);
    }

    const duplicateGroups = Object.entries(checksumMap)
      .filter(([_, group]) => group.length > 1)
      .map(([checksum, group]) => ({
        checksum,
        count: group.length,
        potentialSavingsBytes: (group.length - 1) * group[0].fileSize,
        photos: group,
      }));

    // 2. Large files (> 1MB in local mode or > 5MB)
    const largeFiles = photos.filter((p) => (p.fileSize || 0) >= 800 * 1024);

    // 3. Quality & blur metrics
    const lowResolutionOrBlurry = photos.filter((p) => p.blurScore && p.blurScore > 70);

    const totalStorageBytes = photos.reduce((acc, p) => acc + (p.fileSize || 0), 0);
    const potentialSavings = duplicateGroups.reduce((acc, g) => acc + g.potentialSavingsBytes, 0);

    return {
      data: {
        success: true,
        summary: {
          totalPhotos: photos.length,
          totalStorageBytes,
          duplicateCount: duplicateGroups.reduce((acc, g) => acc + g.count, 0),
          duplicateGroupCount: duplicateGroups.length,
          potentialSavingsBytes: potentialSavings,
          largeFilesCount: largeFiles.length,
          missingFilesCount: 0,
          lowResolutionCount: lowResolutionOrBlurry.length,
        },
        duplicateGroups,
        largeFiles,
        missingFiles: [],
        lowResolutionOrBlurry,
        formatBreakdown: {
          jpeg: { count: photos.length, bytes: totalStorageBytes },
        },
      },
    };
  },
};

// ─── Demo Library Service ─────────────────────────────────────────────────────

export const demoService = {
  importDemo: async () => {
    try {
      return await apiClient.post('/demo/import');
    } catch (e) {
      // Fallback: sync local folder
      await photoService.syncSampleFolder();
      return { data: { success: true, message: 'Local sample folder synced successfully.' } };
    }
  },

  resetDemo: async () => {
    try {
      return await apiClient.post('/demo/reset');
    } catch (e) {
      // Reset demo photos locally
      let photos = loadStoredPhotos().filter((p) => !p.isDemo);
      let albums = loadStoredAlbums().filter((a) => !a.isDemo);
      let capsules = loadStoredCapsules().filter((c) => !c.isDemo);
      saveStoredPhotos(photos);
      saveStoredAlbums(albums);
      saveStoredCapsules(capsules);
      return { data: { success: true, message: 'Demo data cleared safely.' } };
    }
  },

  getStatus: async () => {
    try {
      return await apiClient.get('/demo/status');
    } catch (e) {
      const photos = loadStoredPhotos();
      return {
        data: {
          success: true,
          demoDirectory: 'sample-photos',
          demoPhotosCount: photos.filter((p) => p.isDemo).length,
          userPhotosCount: photos.filter((p) => !p.isDemo).length,
          demoAlbumsCount: loadStoredAlbums().filter((a) => a.isDemo).length,
        },
      };
    }
  },
};

// ─── Image URL Helper ─────────────────────────────────────────────────────────

export const getImageUrl = (storageName) => {
  if (!storageName) return null;
  if (
    storageName.startsWith('http://') ||
    storageName.startsWith('https://') ||
    storageName.startsWith('data:') ||
    storageName.startsWith('blob:') ||
    storageName.startsWith('/')
  ) {
    return storageName;
  }
  return `/sample-photos/${storageName}`;
};

export default {
  photoService,
  albumService,
  memoryService,
  capsuleService,
  detectiveService,
  demoService,
  getImageUrl,
};
