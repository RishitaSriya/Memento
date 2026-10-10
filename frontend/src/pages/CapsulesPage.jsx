import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Unlock, Plus, Clock, Calendar, AlertCircle,
  Trash2, Edit2, CheckCircle2, ChevronRight, X, Heart, Eye
} from 'lucide-react';
import { capsuleService, photoService, getImageUrl } from '../services/api';
import PhotoViewer from '../components/PhotoViewer';

function CountdownTimer({ unlockDate, onUnlockReached }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const diff = new Date(unlockDate).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return { days, hours, minutes, seconds, isReady: false };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated.isReady && onUnlockReached) {
        onUnlockReached();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockDate]);

  if (timeLeft.isReady) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <Unlock size={12} />
        Unlocked & Ready to Open!
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <div className="bg-bg border border-border px-2 py-1 rounded text-center min-w-[36px]">
        <span className="font-bold text-text text-sm">{timeLeft.days}</span>
        <span className="block text-[9px] text-muted -mt-0.5 font-sans">DAYS</span>
      </div>
      <span className="text-muted font-bold">:</span>
      <div className="bg-bg border border-border px-2 py-1 rounded text-center min-w-[32px]">
        <span className="font-bold text-text text-sm">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="block text-[9px] text-muted -mt-0.5 font-sans">HRS</span>
      </div>
      <span className="text-muted font-bold">:</span>
      <div className="bg-bg border border-border px-2 py-1 rounded text-center min-w-[32px]">
        <span className="font-bold text-text text-sm">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="block text-[9px] text-muted -mt-0.5 font-sans">MIN</span>
      </div>
      <span className="text-muted font-bold">:</span>
      <div className="bg-bg border border-border px-2 py-1 rounded text-center min-w-[32px]">
        <span className="font-bold text-accent text-sm">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="block text-[9px] text-muted -mt-0.5 font-sans">SEC</span>
      </div>
    </div>
  );
}

export default function CapsulesPage({ addToast }) {
  const [capsules, setCapsules] = useState([]);
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // all | locked | unlocked
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [activeViewer, setActiveViewer] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCapsules();
  }, []);

  async function loadCapsules() {
    setLoading(true);
    try {
      const [capsRes, photosRes] = await Promise.all([
        capsuleService.getAll(),
        photoService.getAll({ limit: 100 }),
      ]);
      setCapsules(capsRes.data.capsules || []);
      setAvailablePhotos(photosRes.data.photos || []);
    } catch (e) {
      addToast?.('Failed to load memory capsules', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleCreateCapsule = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !unlockDate || selectedPhotoIds.length === 0) {
      addToast?.('Please complete all fields and choose at least one photograph', 'error');
      return;
    }

    if (new Date(unlockDate) <= new Date()) {
      addToast?.('Unlock date must be in the future', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await capsuleService.create({
        title,
        message,
        unlockDate,
        photos: selectedPhotoIds,
      });
      addToast?.('Memory capsule successfully sealed for the future!', 'success');
      setCreateModalOpen(false);
      setTitle('');
      setMessage('');
      setUnlockDate('');
      setSelectedPhotoIds([]);
      loadCapsules();
    } catch (err) {
      addToast?.(err.message || 'Failed to create capsule', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this memory capsule? Your photographs will remain in your library.')) {
      return;
    }
    try {
      await capsuleService.delete(id);
      setCapsules((prev) => prev.filter((c) => c._id !== id));
      addToast?.('Memory capsule deleted', 'success');
    } catch (e) {
      addToast?.('Failed to delete capsule', 'error');
    }
  };

  const toggleSelectPhoto = (id) => {
    setSelectedPhotoIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredCapsules = capsules.filter((c) => {
    if (filterTab === 'locked') return c.isLocked;
    if (filterTab === 'unlocked') return !c.isLocked;
    return true;
  });

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider mb-1">
            <Lock size={14} />
            <span>Cryptographic Future Archive</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-text">Memory Capsules</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            Seal private photographs with a personal message into a time capsule locked until a chosen date in the future.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary text-xs flex items-center gap-2 py-2.5 px-5 shadow-sm"
        >
          <Plus size={15} />
          <span>Seal New Capsule</span>
        </button>
      </div>

      {/* Filter Tabs & Counter */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          {['all', 'locked', 'unlocked'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterTab === tab
                  ? 'bg-accent/15 text-accent'
                  : 'text-muted hover:text-text hover:bg-card'
              }`}
            >
              {tab} ({tab === 'all' ? capsules.length : capsules.filter((c) => (tab === 'locked' ? c.isLocked : !c.isLocked)).length})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 bg-card rounded-2xl border border-border" />
          <div className="h-64 bg-card rounded-2xl border border-border" />
        </div>
      ) : filteredCapsules.length === 0 ? (
        <div className="card p-16 text-center rounded-2xl border-dashed border-2 border-border/80">
          <div className="w-16 h-16 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
            <Lock size={28} />
          </div>
          <h3 className="font-serif text-xl font-bold text-text">No memory capsules sealed yet</h3>
          <p className="text-muted text-xs max-w-sm mx-auto mt-1 mb-6">
            Create your first memory capsule. Write a heartfelt letter to your future self and seal your favorite photos until an anniversary or special date.
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary text-xs inline-flex items-center gap-2 py-2 px-4"
          >
            <Plus size={14} /> Seal a Memory Capsule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredCapsules.map((capsule) => (
            <motion.div
              key={capsule._id}
              layout
              className={`card p-6 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                capsule.isLocked ? 'border-border/90 bg-card' : 'border-emerald-500/30 bg-card/90 shadow-sm'
              }`}
            >
              <div className="space-y-4">
                {/* Top Badge & Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-2 rounded-xl flex items-center justify-center ${
                        capsule.isLocked
                          ? 'bg-accent/10 text-accent'
                          : 'bg-emerald-500/10 text-emerald-600'
                      }`}
                    >
                      {capsule.isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </span>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                        {capsule.isLocked ? 'Sealed Time Capsule' : 'Unlocked Memory'}
                      </span>
                      <h3 className="font-serif text-xl font-bold text-text line-clamp-1">
                        {capsule.title}
                      </h3>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(capsule._id)}
                    className="p-1.5 text-muted hover:text-red-500 rounded-lg hover:bg-bg transition-colors"
                    title="Delete capsule"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Countdown / Unlock Status */}
                <div className="p-3.5 bg-bg/80 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs text-muted flex items-center gap-1.5">
                    <Clock size={13} className="text-accent" />
                    Unlocks: {new Date(capsule.unlockDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <CountdownTimer
                    unlockDate={capsule.unlockDate}
                    onUnlockReached={() => loadCapsules()}
                  />
                </div>

                {/* Content: Locked Security Guard vs Unlocked Message */}
                {capsule.isLocked ? (
                  <div className="p-4 rounded-xl bg-bg/50 border border-dashed border-border/80 text-center space-y-2">
                    <p className="text-xs text-muted italic">
                      "{capsule.sealedNote || 'Contents and photographs remain encrypted until unlock date.'}"
                    </p>
                    <div className="text-[11px] font-mono text-muted/80">
                      🔒 Contains {capsule.photoCount} confidential photograph{capsule.photoCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                      <p className="text-xs text-text/90 italic leading-relaxed whitespace-pre-line">
                        "{capsule.message}"
                      </p>
                    </div>

                    {/* Unlocked Photos Preview */}
                    {Array.isArray(capsule.photos) && capsule.photos.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-muted block">
                          Revealed Photographs ({capsule.photos.length})
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {capsule.photos.map((photo, pIdx) => (
                            <div
                              key={photo._id || pIdx}
                              onClick={() =>
                                setActiveViewer({
                                  photo,
                                  photos: capsule.photos,
                                  index: pIdx,
                                })
                              }
                              className="aspect-square rounded-lg overflow-hidden border border-border cursor-pointer group relative"
                            >
                              <img
                                src={getImageUrl(photo.storageName)}
                                alt=""
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
                <span>Created {new Date(capsule.createdAt).toLocaleDateString()}</span>
                <span>{capsule.photoCount} photograph{capsule.photoCount !== 1 ? 's' : ''}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Memory Capsule Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-accent" />
                  <h2 className="font-serif text-xl font-bold text-text">Seal a Memory Capsule</h2>
                </div>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1 rounded text-muted hover:text-text hover:bg-bg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCapsule} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Capsule Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Letter to My Future Self, First Anniversary Memories"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input w-full text-sm rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Personal Letter / Message for the Future
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write a heartfelt message to your future self. What are you hoping for? What feelings or details do you want to remember?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input w-full text-sm rounded-lg resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Unlock Date & Time (Must be in the future)
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                    className="input w-full text-sm rounded-lg"
                  />

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: 'In 7 Days', days: 7 },
                      { label: 'In 30 Days', days: 30 },
                      { label: 'In 6 Months', days: 180 },
                      { label: 'In 1 Year', days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const d = new Date(Date.now() + preset.days * 24 * 60 * 60 * 1000);
                          setUnlockDate(d.toISOString().slice(0, 16));
                        }}
                        className="text-[11px] px-2.5 py-1 rounded bg-bg border border-border text-muted hover:text-accent hover:border-accent"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Photo Selection Grid */}
                <div>
                  <label className="block text-xs font-semibold text-text mb-1.5">
                    Select Photographs to Seal ({selectedPhotoIds.length} selected)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2 bg-bg rounded-xl border border-border">
                    {availablePhotos.map((photo) => {
                      const isSelected = selectedPhotoIds.includes(photo._id);
                      return (
                        <div
                          key={photo._id}
                          onClick={() => toggleSelectPhoto(photo._id)}
                          className={`aspect-square rounded-lg overflow-hidden cursor-pointer relative border transition-all ${
                            isSelected ? 'ring-2 ring-accent border-accent' : 'border-border/60 opacity-80'
                          }`}
                        >
                          <img
                            src={getImageUrl(photo.storageName)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-accent text-white rounded-full p-0.5">
                              <CheckCircle2 size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="btn-ghost text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs flex items-center gap-2 px-5 py-2.5"
                  >
                    <Lock size={14} />
                    <span>{submitting ? 'Sealing Capsule...' : 'Seal Memory Capsule'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Viewer for Unlocked Photos */}
      {activeViewer && (
        <PhotoViewer
          photo={activeViewer.photo}
          photos={activeViewer.photos}
          currentIndex={activeViewer.index}
          onClose={() => setActiveViewer(null)}
          onDelete={() => setActiveViewer(null)}
          onUpdate={(updated) => {
            setActiveViewer((prev) => (prev ? { ...prev, photo: updated } : null));
          }}
        />
      )}
    </motion.div>
  );
}
