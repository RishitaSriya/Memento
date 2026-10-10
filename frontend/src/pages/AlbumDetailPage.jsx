import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit2, Image, Trash2 } from 'lucide-react';
import { albumService, photoService, getImageUrl } from '../services/api';
import PhotoTile, { PhotoSkeleton } from '../components/PhotoTile';
import PhotoViewer from '../components/PhotoViewer';

export default function AlbumDetailPage({ albumId, onBack, addToast }) {
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    load();
  }, [albumId]);

  async function load() {
    setLoading(true);
    try {
      const res = await albumService.getOne(albumId);
      setAlbum(res.data.album);
      setPhotos(res.data.photos);
    } catch (e) {
      addToast?.('Failed to load album', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleToggleFavorite = async (id) => {
    try {
      const res = await photoService.toggleFavorite(id);
      setPhotos(prev => prev.map(p => p._id === id ? res.data.photo : p));
    } catch (e) {}
  };

  const handleRemoveFromAlbum = async (photoId) => {
    try {
      await albumService.removePhotos(albumId, [photoId]);
      setPhotos(prev => prev.filter(p => p._id !== photoId));
      addToast?.('Photo removed from album', 'success');
    } catch (e) {
      addToast?.('Failed to remove photo', 'error');
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-border rounded w-48" />
        <div className="h-48 skeleton rounded-xl" />
        <div className="masonry-grid">
          {Array.from({ length: 9 }).map((_, i) => <PhotoSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Back */}
      <button onClick={onBack} className="btn-ghost flex items-center gap-2 -ml-2 text-sm">
        <ArrowLeft size={16} />
        Albums
      </button>

      {/* Album header */}
      {album && (
        <div className="flex items-start gap-6">
          {/* Cover */}
          <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-border bg-bg">
            {album.coverPhoto ? (
              <img src={getImageUrl(album.coverPhoto.storageName)} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Image size={24} className="text-border" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold text-text">{album.name}</h1>
            {album.description && <p className="text-muted text-sm mt-1">{album.description}</p>}
            <p className="text-xs text-muted mt-2">{album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image size={36} className="text-border mb-3" />
          <p className="font-serif text-lg text-text mb-1">Empty album</p>
          <p className="text-sm text-muted">Add photos from your library to this album.</p>
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

      {/* Viewer */}
      {viewer && (
        <PhotoViewer
          photo={viewer.photo}
          photos={photos}
          currentIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={(id) => {
            setPhotos(prev => prev.filter(p => p._id !== id));
            setViewer(null);
          }}
          onUpdate={(updated) => {
            setPhotos(prev => prev.map(p => p._id === updated._id ? updated : p));
          }}
        />
      )}
    </motion.div>
  );
}
