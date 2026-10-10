import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Camera, BookOpen, Clock, Star } from 'lucide-react';
import { photoService, albumService, getImageUrl } from '../services/api';
import { formatBytes, formatDate, formatRelative, getMonthName } from '../utils/helpers';
import { useApp } from '../hooks/useApp';
import PhotoViewer from '../components/PhotoViewer';

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-serif font-bold text-text">{value}</p>
          <p className="text-xs text-muted mt-0.5">{label}</p>
        </div>
        <Icon size={18} className="text-accent mt-0.5" />
      </div>
    </div>
  );
}

function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-6">
        <Camera size={32} className="text-accent" />
      </div>
      <h2 className="font-serif text-2xl font-semibold text-text mb-2">Your story starts here.</h2>
      <p className="text-muted text-sm max-w-sm mb-8">
        Upload your first photographs to begin building your personal memory archive.
      </p>
      <button onClick={onUpload} className="btn-primary flex items-center gap-2">
        <Upload size={15} />
        Upload Photos
      </button>
    </div>
  );
}

export default function OverviewPage({ addToast }) {
  const [stats, setStats] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [onThisDay, setOnThisDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const { setUploadModalOpen } = useApp();

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, albumsRes, otdRes] = await Promise.all([
          photoService.getStats(),
          albumService.getAll(),
          photoService.getOnThisDay(),
        ]);
        setStats(statsRes.data.stats);
        setAlbums(albumsRes.data.albums.slice(0, 4));
        setOnThisDay(otdRes.data.photos);
      } catch (e) {
        addToast?.('Failed to load overview data', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="h-10 bg-border rounded w-80" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 skeleton rounded-lg" />)}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  const isEmpty = !stats || stats.totalPhotos === 0;

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Hero heading */}
      <div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-text leading-tight">
          Your life, in little moments.
        </h1>
        <p className="text-muted mt-2 text-sm md:text-base">
          Every photograph holds a little piece of your story.
        </p>
      </div>

      {isEmpty ? (
        <EmptyState onUpload={() => setUploadModalOpen(true)} />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Camera} value={stats.totalPhotos} label="Photographs" />
            <StatCard icon={BookOpen} value={stats.totalAlbums} label="Albums" />
            <StatCard icon={Star} value={formatBytes(stats.totalStorage)} label="Stored" />
          </div>

          {/* Featured + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Featured photo */}
            {stats.featured && (
              <div>
                <h2 className="font-serif text-lg font-semibold text-text mb-3">Featured</h2>
                <div
                  className="relative rounded-xl overflow-hidden cursor-pointer group border border-border"
                  style={{ aspectRatio: '4/3' }}
                  onClick={() => setViewer({ photo: stats.featured, photos: stats.recentPhotos, index: 0 })}
                >
                  <img
                    src={getImageUrl(stats.featured.storageName)}
                    alt={stats.featured.originalName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-medium text-sm truncate">{stats.featured.originalName}</p>
                    <p className="text-white/70 text-xs">{formatRelative(stats.featured.createdAt)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent photos */}
            <div>
              <h2 className="font-serif text-lg font-semibold text-text mb-3">Recently Added</h2>
              <div className="grid grid-cols-4 gap-2">
                {stats.recentPhotos?.slice(0, 8).map((photo, i) => (
                  <div
                    key={photo._id}
                    className="relative rounded overflow-hidden cursor-pointer group border border-border"
                    style={{ aspectRatio: '1' }}
                    onClick={() => setViewer({ photo, photos: stats.recentPhotos, index: i })}
                  >
                    <img
                      src={getImageUrl(photo.storageName)}
                      alt={photo.originalName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Albums */}
          {albums.length > 0 && (
            <div>
              <h2 className="font-serif text-lg font-semibold text-text mb-3">Album Collections</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {albums.map((album) => (
                  <div key={album._id} className="card overflow-hidden border border-border rounded-lg group cursor-pointer hover:border-accent/30 transition-colors">
                    <div className="aspect-square bg-bg relative overflow-hidden">
                      {album.coverPhoto ? (
                        <img
                          src={getImageUrl(album.coverPhoto.storageName)}
                          alt={album.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={28} className="text-border" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm text-text truncate">{album.name}</p>
                      <p className="text-xs text-muted">{album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On This Day */}
          {onThisDay.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-accent" />
                <h2 className="font-serif text-lg font-semibold text-text">On This Day</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {onThisDay.slice(0, 6).map((photo, i) => (
                  <div
                    key={photo._id}
                    className="relative rounded-lg overflow-hidden cursor-pointer group border border-border"
                    style={{ aspectRatio: '1' }}
                    onClick={() => setViewer({ photo, photos: onThisDay, index: i })}
                  >
                    <img
                      src={getImageUrl(photo.storageName)}
                      alt={photo.originalName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs">
                        {new Date(photo.dateToUse || photo.createdAt).getFullYear()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Photo Viewer */}
      {viewer && (
        <PhotoViewer
          photo={viewer.photo}
          photos={viewer.photos}
          currentIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={() => setViewer(null)}
          onUpdate={() => {}}
        />
      )}
    </motion.div>
  );
}
