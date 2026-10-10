import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Images } from 'lucide-react';
import { usePhotos } from '../hooks/usePhotos';
import { photoService } from '../services/api';
import PhotoTile, { PhotoSkeleton } from '../components/PhotoTile';
import PhotoViewer from '../components/PhotoViewer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FavoritesPage({ addToast }) {
  const [viewer, setViewer] = useState(null);
  const { photos, setPhotos, pagination, loading, params, setParams } = usePhotos({
    page: 1,
    limit: 24,
    sort: 'newest',
    favorites: 'true',
  });

  const handleToggleFavorite = async (id) => {
    try {
      const res = await photoService.toggleFavorite(id);
      // If unfavorited, remove from list
      if (!res.data.photo.isFavorite) {
        setPhotos(prev => prev.filter(p => p._id !== id));
      } else {
        setPhotos(prev => prev.map(p => p._id === id ? res.data.photo : p));
      }
    } catch (e) {
      addToast?.('Failed to update favorite', 'error');
    }
  };

  const handlePage = (page) => {
    setParams(p => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <h1 className="font-serif text-2xl font-bold text-text flex items-center gap-3">
          <Heart size={22} className="text-red-500 fill-red-500" />
          Favorites
        </h1>
        {pagination && (
          <p className="text-sm text-muted mt-0.5">
            {pagination.total} favorited photo{pagination.total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {loading ? (
        <div className="masonry-grid">
          {Array.from({ length: 12 }).map((_, i) => <PhotoSkeleton key={i} />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Heart size={40} className="text-border mb-4" />
          <p className="font-serif text-lg text-text mb-1">No favorites yet</p>
          <p className="text-sm text-muted">Heart a photo to save it here.</p>
        </div>
      ) : (
        <div className="masonry-grid">
          {photos.map((photo, i) => (
            <PhotoTile
              key={photo._id}
              photo={photo}
              index={i}
              onOpen={(p) => setViewer({ photo: p, index: i })}
              onToggleFavorite={handleToggleFavorite}
              selected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button onClick={() => handlePage(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40">
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="text-sm text-muted px-4">Page {pagination.page} of {pagination.pages}</span>
          <button onClick={() => handlePage(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40">
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {viewer && (
        <PhotoViewer
          photo={viewer.photo}
          photos={photos}
          currentIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={(id) => { setPhotos(prev => prev.filter(p => p._id !== id)); setViewer(null); }}
          onUpdate={(updated) => {
            setPhotos(prev => updated.isFavorite ? prev.map(p => p._id === updated._id ? updated : p) : prev.filter(p => p._id !== updated._id));
          }}
        />
      )}
    </motion.div>
  );
}
