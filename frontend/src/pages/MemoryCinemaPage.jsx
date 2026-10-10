import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ChevronLeft, ChevronRight, Maximize2,
  Minimize2, Clock, Sparkles, X, Volume2, VolumeX, Image as ImageIcon
} from 'lucide-react';
import { photoService, albumService, getImageUrl } from '../services/api';

export default function MemoryCinemaPage({ initialPhotos = [], initialTitle = '', onClose }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [durationSec, setDurationSec] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (initialPhotos.length === 0) {
      loadLibraryPhotos();
    }
  }, []);

  async function loadLibraryPhotos() {
    try {
      const [photosRes, albumsRes] = await Promise.all([
        photoService.getAll({ limit: 100 }),
        albumService.getAll(),
      ]);
      setPhotos(photosRes.data.photos || []);
      setAlbums(albumsRes.data.albums || []);
    } catch (e) {}
  }

  // Handle album filtering if launched standalone
  useEffect(() => {
    if (selectedAlbumId === 'all') {
      loadLibraryPhotos();
    } else {
      albumService.getOne(selectedAlbumId).then((res) => {
        setPhotos(res.data.photos || []);
        setCurrentIndex(0);
      });
    }
  }, [selectedAlbumId]);

  // Slideshow interval timer
  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, durationSec * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, durationSec, photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
      } else if (e.code === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      } else if (e.code === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const currentPhoto = photos[currentIndex];

  if (photos.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <Sparkles size={36} className="text-accent mb-3 animate-pulse" />
        <h2 className="font-serif text-2xl font-bold text-text">No Photographs Selected for Cinema</h2>
        <p className="text-muted text-sm max-w-sm mt-1 mb-6">
          Add photographs to your library to enjoy an editorial cinematic experience.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[88vh] bg-black rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between select-none"
    >
      {/* Background Ambient Backdrop (Matches current photo colors, prevents letterbox distortion) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`backdrop-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="absolute inset-0 bg-cover bg-center filter blur-3xl scale-125 pointer-events-none"
          style={{
            backgroundImage: `url(${getImageUrl(currentPhoto?.storageName)})`,
          }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/80 pointer-events-none" />

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-white/90">
            <Sparkles size={16} className="text-accent" />
            <span className="font-serif text-lg font-bold tracking-tight">
              {initialTitle || 'Memory Cinema'}
            </span>
          </div>

          {/* Album Selector if standalone */}
          {albums.length > 0 && !initialTitle && (
            <select
              value={selectedAlbumId}
              onChange={(e) => setSelectedAlbumId(e.target.value)}
              className="bg-white/10 text-white text-xs py-1 px-2.5 rounded-lg border border-white/20 backdrop-blur-md"
            >
              <option value="all" className="bg-neutral-900 text-white">All Library Memories</option>
              {albums.map((a) => (
                <option key={a._id} value={a._id} className="bg-neutral-900 text-white">
                  Album: {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Duration Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-white text-xs">
            <Clock size={12} className="text-accent" />
            <span>{durationSec}s</span>
            <input
              type="range"
              min="3"
              max="12"
              step="1"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              className="w-16 accent-accent h-1 cursor-pointer"
            />
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close Cinema"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Image Stage (Aspect ratio preserved with subtle Ken Burns effect) */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhoto?._id || currentIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="relative max-w-full max-h-full flex items-center justify-center"
          >
            <img
              src={getImageUrl(currentPhoto?.storageName)}
              alt={currentPhoto?.originalName}
              className="max-h-[64vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Floating Bar: Captions & Controls */}
      <div className="relative z-20 p-6 space-y-4">
        {/* Caption Overlay */}
        {showCaptions && currentPhoto && (
          <motion.div
            key={`caption-${currentIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-xl mx-auto text-center space-y-1"
          >
            <h3 className="font-serif text-xl font-bold text-white drop-shadow-md">
              {currentPhoto.originalName?.replace(/\.[^/.]+$/, '')}
            </h3>
            {currentPhoto.description && (
              <p className="text-xs text-white/80 font-light line-clamp-2">
                {currentPhoto.description}
              </p>
            )}
            <span className="text-[11px] text-white/50 block font-mono">
              {new Date(currentPhoto.captureDate || currentPhoto.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </motion.div>
        )}

        {/* Playback Controls & Scrubber */}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl text-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
              title="Previous photo (Arrow Left)"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2.5 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors shadow-lg"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % photos.length)}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
              title="Next photo (Arrow Right)"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Progress Timeline */}
          <div className="flex-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                animate={{ width: `${((currentIndex + 1) / photos.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs font-mono text-white/70">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
