import { INITIAL_PHOTOS, INITIAL_ALBUMS } from './mockData';
import { storeImageBlob, deleteImageBlob } from './localImageStore';

const STORAGE_KEY_PHOTOS = 'memento_photos_v1';
const STORAGE_KEY_ALBUMS = 'memento_albums_v1';

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
          fileSize: 1024 * 500, // estimated 500KB
          mimeType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
          width: 1920,
          height: 1280,
          checksum: `checksum-${fileName}-${Date.now()}`,
          description: `Imported from sample-photos folder: ${title}`,
          tags: ['sample', 'gallery'],
          captureDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
          albums: [],
        };
        currentPhotos.unshift(newPhoto);
        updated = true;
      }
    }

    if (updated) {
      saveStoredPhotos(currentPhotos);
    }
  } catch (e) {
    // Vite dev server might not be running or in static build mode
  }
}

// Trigger initial sync on startup
if (typeof window !== 'undefined') {
  syncSamplePhotosFolder();
}

// ─── Populate Helpers ────────────────────────────────────────────────────────

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
    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();

    let filtered = [...photos];

    // Search query
    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter((p) => {
        const nameMatch = p.originalName?.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const tagMatch = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
        return nameMatch || descMatch || tagMatch;
      });
    }

    // Filter by albumId
    if (params.albumId) {
      filtered = filtered.filter((p) => {
        const pAlbums = Array.isArray(p.albums) ? p.albums : [];
        return pAlbums.some((alb) => (typeof alb === 'object' ? alb._id === params.albumId : alb === params.albumId));
      });
    }

    // Filter by favorites
    if (params.favorites === 'true' || params.favorites === true) {
      filtered = filtered.filter((p) => p.isFavorite === true);
    }

    // Filter by date ranges
    if (params.captureDateFrom) {
      const from = new Date(params.captureDateFrom);
      filtered = filtered.filter((p) => p.captureDate && new Date(p.captureDate) >= from);
    }
    if (params.captureDateTo) {
      const to = new Date(params.captureDateTo);
      filtered = filtered.filter((p) => p.captureDate && new Date(p.captureDate) <= to);
    }

    // Sorting
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
    const photos = loadStoredPhotos();
    const albums = loadStoredAlbums();
    const photo = photos.find((p) => p._id === id);
    if (!photo) {
      throw new Error('Photo not found');
    }
    return {
      data: {
        success: true,
        photo: populatePhotoAlbums(photo, albums),
      },
    };
  },

  upload: async (formData, onProgress) => {
    const rawFiles = formData.getAll ? formData.getAll('photos') : [];
    if (!rawFiles || rawFiles.length === 0) {
      throw new Error('No files provided');
    }

    if (onProgress) onProgress(20);

    const photos = loadStoredPhotos();
    const uploadedPhotos = [];
    const errors = [];

    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      try {
        const id = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        // Check for duplicates
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

        // Store file in IndexedDB
        const blobUrl = await storeImageBlob(id, file);

        // Extract image dimensions
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
          captureDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isFavorite: false,
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
    if (data.isFavorite !== undefined) {
      photo.isFavorite = Boolean(data.isFavorite);
    }
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
    let photos = loadStoredPhotos();
    const albums = loadStoredAlbums();

    photos = photos.filter((p) => p._id !== id);
    saveStoredPhotos(photos);

    // Remove from albums
    const updatedAlbums = albums.map((alb) => {
      let cover = alb.coverPhoto;
      if (cover === id) cover = null;
      const filteredPhotos = (alb.photos || []).filter((pid) => pid !== id);
      return { ...alb, coverPhoto: cover, photos: filteredPhotos };
    });
    saveStoredAlbums(updatedAlbums);

    // Clean up indexedDB if it was an uploaded blob
    deleteImageBlob(id);

    return {
      data: {
        success: true,
        message: 'Photo deleted successfully.',
      },
    };
  },

  deleteMany: async (ids) => {
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

    return {
      data: {
        success: true,
        deleted: ids.length,
      },
    };
  },

  getStats: async () => {
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
    await syncSamplePhotosFolder();
    const photos = loadStoredPhotos();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();

    // Check photos matching today's month & day in past years
    const matched = photos.filter((p) => {
      const d = p.captureDate ? new Date(p.captureDate) : new Date(p.createdAt);
      if (isNaN(d.getTime())) return false;
      return (
        d.getMonth() + 1 === currentMonth &&
        d.getDate() === currentDay &&
        d.getFullYear() < currentYear
      );
    });

    // If none found for today's exact date in past years, provide memorable favorites or recent photos
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
      if (!grouped[key]) {
        grouped[key] = { year, month, days: {} };
      }
      if (!grouped[key].days[day]) {
        grouped[key].days[day] = [];
      }
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
};

// ─── Album Service ────────────────────────────────────────────────────────────

export const albumService = {
  getAll: async () => {
    const albums = loadStoredAlbums();
    const photos = loadStoredPhotos();

    const populated = albums.map((alb) => populateAlbumCover(alb, photos));

    return {
      data: {
        success: true,
        albums: populated,
      },
    };
  },

  getOne: async (id, params = {}) => {
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
    const albums = loadStoredAlbums();
    const newAlbum = {
      _id: `album-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: data.name?.trim() || 'Untitled Album',
      description: data.description?.trim() || '',
      coverPhoto: null,
      photos: [],
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
    let albums = loadStoredAlbums();
    const photos = loadStoredPhotos();

    albums = albums.filter((a) => a._id !== id);
    saveStoredAlbums(albums);

    // Unlink album from photos
    const updatedPhotos = photos.map((p) => {
      const pAlbums = Array.isArray(p.albums) ? p.albums : [];
      const filtered = pAlbums.filter((a) => (typeof a === 'object' ? a._id !== id : a !== id));
      return { ...p, albums: filtered };
    });
    saveStoredPhotos(updatedPhotos);

    return {
      data: {
        success: true,
        message: 'Album deleted successfully.',
      },
    };
  },

  addPhotos: async (id, photoIds) => {
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

    // Update photos album list
    const updatedPhotos = photos.map((p) => {
      if (photoIds.includes(p._id)) {
        const pAlbums = Array.isArray(p.albums) ? p.albums : [];
        if (!pAlbums.includes(id)) {
          return { ...p, albums: [...pAlbums, id] };
        }
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

    // Update photos
    const updatedPhotos = photos.map((p) => {
      if (idSet.has(p._id)) {
        const pAlbums = Array.isArray(p.albums) ? p.albums : [];
        return { ...p, albums: pAlbums.filter((a) => (typeof a === 'object' ? a._id !== id : a !== id)) };
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

  movePhotos: async ({ photoIds, sourceAlbumId, targetAlbumId }) => {
    await albumService.removePhotos(sourceAlbumId, photoIds);
    await albumService.addPhotos(targetAlbumId, photoIds);
    return { data: { success: true } };
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

export default { photoService, albumService, getImageUrl };
