import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw, Calendar, Play, Sparkles, ChevronRight,
  Clock, Image as ImageIcon, Flame, Maximize2
} from 'lucide-react';
import { memoryService, getImageUrl } from '../services/api';
import PhotoViewer from '../components/PhotoViewer';

export default function MemoryRewindPage({ addToast, onLaunchCinema }) {
  const [rewindData, setRewindData] = useState(null);
  const [recapData, setRecapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    loadRewind();
  }, [selectedDate]);

  async function loadRewind() {
    setLoading(true);
    try {
      const [rewindRes, recapRes] = await Promise.all([
        memoryService.getRewind(selectedDate || undefined),
        memoryService.getRecap30Days(),
      ]);
      setRewindData(rewindRes.data);
      setRecapData(recapRes.data);
    } catch (e) {
      addToast?.('Failed to load memory rewind', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleLaunchSlideshow = (photos, title) => {
    if (onLaunchCinema) {
      onLaunchCinema(photos, title);
    } else if (photos.length > 0) {
      setViewer({ photo: photos[0], photos, index: 0 });
    }
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider mb-1">
            <RotateCcw size={14} />
            <span>Time Capsule & Retrospective</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-text">Memory Rewind</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            Rediscover where you were on this calendar day in past years, and reflect on moments captured over the last month.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-muted flex items-center gap-1.5 font-medium">
            <Calendar size={14} className="text-accent" />
            Rewind to Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input text-xs py-1.5 px-3 rounded-lg border-border bg-card"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-muted hover:text-accent underline"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="h-44 bg-card rounded-2xl border border-border" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-card rounded-2xl border border-border" />
            <div className="h-64 bg-card rounded-2xl border border-border" />
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: On This Calendar Day In Previous Years */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-2xl font-bold text-text flex items-center gap-2.5">
                  <Sparkles size={20} className="text-accent" />
                  <span>On This Day — {rewindData?.queryDate?.formatted || 'Today'}</span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  {rewindData?.totalMemories || 0} memory{rewindData?.totalMemories !== 1 ? 's' : ''} recorded across {rewindData?.yearsRepresented || 0} past year{rewindData?.yearsRepresented !== 1 ? 's' : ''}
                </p>
              </div>

              {rewindData?.rewindYears?.length > 0 && (
                <button
                  onClick={() => {
                    const allPhotos = rewindData.rewindYears.flatMap((y) => y.photos);
                    handleLaunchSlideshow(allPhotos, `Rewind: On This Day (${rewindData?.queryDate?.formatted})`);
                  }}
                  className="btn-primary text-xs flex items-center gap-2 py-2 px-4 shadow-sm"
                >
                  <Play size={13} className="fill-white" />
                  <span>Play All in Cinema</span>
                </button>
              )}
            </div>

            {(!rewindData?.rewindYears || rewindData.rewindYears.length === 0) ? (
              <div className="card p-12 text-center rounded-2xl border-dashed border-2 border-border/80">
                <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
                  <Calendar size={28} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-text">No archived memories for this day</h3>
                <p className="text-muted text-xs max-w-sm mx-auto mt-1">
                  You have not recorded photographs on this specific date in earlier years yet. Pick another date or upload memories.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {rewindData.rewindYears.map((group) => (
                  <div key={group.year} className="card p-6 rounded-2xl space-y-4 border-border/90 shadow-sm">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-baseline gap-3">
                        <span className="font-serif text-2xl font-bold text-text">
                          {group.year}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          {group.yearsAgo} {group.yearsAgo === 1 ? 'year' : 'years'} ago
                        </span>
                      </div>

                      <button
                        onClick={() => handleLaunchSlideshow(group.photos, `${group.year} Memories`)}
                        className="btn-ghost text-xs flex items-center gap-1.5 text-muted hover:text-accent"
                      >
                        <Play size={12} />
                        <span>Slideshow ({group.count})</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    {/* Photos Horizontal Filmstrip */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {group.photos.map((photo, pIdx) => (
                        <motion.div
                          key={photo._id || pIdx}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setViewer({ photo, photos: group.photos, index: pIdx })}
                          className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border bg-bg"
                        >
                          <img
                            src={getImageUrl(photo.storageName)}
                            alt={photo.originalName}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                            <span className="text-[11px] text-white truncate font-medium">
                              {photo.originalName}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: 30-Day Retrospective Recap */}
          <section className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-text flex items-center gap-2.5">
                  <Flame size={20} className="text-amber-500" />
                  <span>30-Day Retrospective Recap</span>
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Moments and chapters captured during the past month.
                </p>
              </div>

              {recapData?.allPhotos?.length > 0 && (
                <button
                  onClick={() => handleLaunchSlideshow(recapData.allPhotos, '30-Day Retrospective Recap')}
                  className="btn-ghost border border-border text-xs flex items-center gap-2 py-2 px-4 self-start"
                >
                  <Play size={13} className="text-accent" />
                  <span>Play 30-Day Recap</span>
                </button>
              )}
            </div>

            {/* Recap Metrics Bar */}
            {recapData?.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-4 rounded-xl">
                  <span className="text-xs text-muted flex items-center gap-1.5 mb-1">
                    <ImageIcon size={13} /> Captured Photos
                  </span>
                  <p className="font-serif text-2xl font-bold text-text">{recapData.stats.photoCount}</p>
                </div>
                <div className="card p-4 rounded-xl">
                  <span className="text-xs text-muted flex items-center gap-1.5 mb-1">
                    <Calendar size={13} /> Active Days
                  </span>
                  <p className="font-serif text-2xl font-bold text-text">{recapData.stats.daysCount}</p>
                </div>
                <div className="card p-4 rounded-xl">
                  <span className="text-xs text-muted flex items-center gap-1.5 mb-1">
                    <Sparkles size={13} /> Favorited Highlights
                  </span>
                  <p className="font-serif text-2xl font-bold text-text">{recapData.stats.favoritesCount}</p>
                </div>
                <div className="card p-4 rounded-xl">
                  <span className="text-xs text-muted flex items-center gap-1.5 mb-1">
                    <Clock size={13} /> Timespan
                  </span>
                  <p className="font-serif text-2xl font-bold text-text">Past 30 Days</p>
                </div>
              </div>
            )}

            {/* 30-Day Grid */}
            {recapData?.allPhotos?.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {recapData.allPhotos.map((photo, idx) => (
                  <motion.div
                    key={photo._id || idx}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setViewer({ photo, photos: recapData.allPhotos, index: idx })}
                    className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-border bg-bg"
                  >
                    <img
                      src={getImageUrl(photo.storageName)}
                      alt={photo.originalName}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <span className="text-[11px] text-white truncate font-medium">
                        {photo.originalName}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="card p-8 text-center rounded-2xl">
                <p className="text-xs text-muted">No photographs recorded in the last 30 days.</p>
              </div>
            )}
          </section>
        </>
      )}

      {/* Standard Photo Viewer Modal */}
      {viewer && (
        <PhotoViewer
          photo={viewer.photo}
          photos={viewer.photos}
          currentIndex={viewer.index}
          onClose={() => setViewer(null)}
          onDelete={() => setViewer(null)}
          onUpdate={(updated) => {
            setViewer((prev) => (prev ? { ...prev, photo: updated } : null));
          }}
        />
      )}
    </motion.div>
  );
}
