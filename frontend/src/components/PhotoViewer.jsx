import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, Heart, ZoomIn, ZoomOut,
  Maximize2, Info, Edit2, Trash2, Check, Tag, Calendar
} from 'lucide-react';
import { photoService, getImageUrl } from '../services/api';
import { formatBytes, formatDate } from '../utils/helpers';

export default function PhotoViewer({ photo: initialPhoto, photos, currentIndex, onClose, onDelete, onUpdate }) {
  const [photo, setPhoto] = useState(initialPhoto);
  const [index, setIndex] = useState(currentIndex);
  const [zoom, setZoom] = useState(1);
  const [showInfo, setShowInfo] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ description: '', tags: '' });
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhoto(initialPhoto);
    setIndex(currentIndex);
    setZoom(1);
  }, [initialPhoto, currentIndex]);

  useEffect(() => {
    if (photo) {
      setEditData({
        description: photo.description || '',
        tags: Array.isArray(photo.tags) ? photo.tags.join(', ') : '',
      });
    }
  }, [photo]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [index, photos]);

  const navigate = useCallback((dir) => {
    const next = index + dir;
    if (next < 0 || next >= photos.length) return;
    setIndex(next);
    setPhoto(photos[next]);
    setZoom(1);
    setEditing(false);
  }, [index, photos]);

  const handleToggleFavorite = async () => {
    try {
      const res = await photoService.toggleFavorite(photo._id);
      const updated = res.data.photo;
      setPhoto(updated);
      if (onUpdate) onUpdate(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await photoService.update(photo._id, {
        description: editData.description,
        tags: editData.tags,
      });
      const updated = res.data.photo;
      setPhoto(updated);
      if (onUpdate) onUpdate(updated);
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await photoService.deleteOne(photo._id);
      if (onDelete) onDelete(photo._id);
      onClose();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  };

  if (!photo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex bg-text/95"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Top actions */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full transition-colors ${photo.isFavorite ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            <Heart size={18} className={photo.isFavorite ? 'fill-white' : ''} />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-full transition-colors ${showInfo ? 'bg-white/20 text-white' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            <Info size={18} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Maximize2 size={18} />
          </button>
          <button
            onClick={() => setZoom(z => Math.min(4, z + 0.25))}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Previous */}
        {index > 0 && (
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Next */}
        {index < photos.length - 1 && (
          <button
            onClick={() => navigate(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            style={{ right: showInfo ? '340px' : '16px' }}
          >
            <ChevronRight size={24} />
          </button>
        )}

        {/* Main image */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-16 md:p-20">
          <motion.img
            key={photo._id}
            src={getImageUrl(photo.storageName)}
            alt={photo.originalName}
            className="max-w-full max-h-full object-contain select-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s ease' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: zoom }}
            transition={{ duration: 0.2 }}
          />
        </div>

        {/* Counter */}
        {photos.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {index + 1} / {photos.length}
          </div>
        )}

        {/* Info panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.aside
              className="w-80 bg-card border-l border-border overflow-y-auto flex-shrink-0"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25 }}
            >
              <div className="p-5 space-y-5">
                {/* Filename */}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">File</p>
                  <p className="text-sm font-medium text-text break-all">{photo.originalName}</p>
                  <p className="text-xs text-muted">{formatBytes(photo.fileSize)}</p>
                </div>

                {/* Dimensions */}
                {photo.width && photo.height && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Dimensions</p>
                    <p className="text-sm text-text">{photo.width} × {photo.height}px</p>
                  </div>
                )}

                {/* Date */}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm text-text flex items-center gap-1.5">
                    <Calendar size={13} className="text-muted" />
                    {formatDate(photo.captureDate || photo.createdAt)}
                  </p>
                </div>

                {/* Albums */}
                {photo.albums && photo.albums.length > 0 && (
                  <div>
                    <p className="text-xs text-muted uppercase tracking-wider mb-1">Albums</p>
                    <div className="flex flex-wrap gap-1">
                      {photo.albums.map((a) => (
                        <span key={a._id} className="tag">{a.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checksum */}
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-1">SHA-256</p>
                  <p className="text-xs text-muted font-mono break-all">{photo.checksum?.substring(0, 32)}…</p>
                </div>

                {/* Description & Tags editing */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted uppercase tracking-wider">Details</p>
                    <button onClick={() => setEditing(!editing)} className="btn-ghost py-1 px-2 text-xs">
                      <Edit2 size={12} className="inline mr-1" />
                      {editing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {editing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted block mb-1">Description</label>
                        <textarea
                          className="input h-20 resize-none text-xs"
                          placeholder="Add a description…"
                          value={editData.description}
                          onChange={(e) => setEditData(d => ({ ...d, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted block mb-1 flex items-center gap-1">
                          <Tag size={11} /> Tags (comma-separated)
                        </label>
                        <input
                          className="input text-xs"
                          placeholder="travel, summer, family…"
                          value={editData.tags}
                          onChange={(e) => setEditData(d => ({ ...d, tags: e.target.value }))}
                        />
                      </div>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary w-full flex items-center justify-center gap-1.5 text-xs"
                      >
                        <Check size={13} />
                        {saving ? 'Saving…' : 'Save Changes'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {photo.description && (
                        <p className="text-sm text-text">{photo.description}</p>
                      )}
                      {!photo.description && (
                        <p className="text-xs text-muted italic">No description</p>
                      )}
                      {photo.tags && photo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {photo.tags.map((tag, i) => (
                            <span key={i} className="tag">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div className="border-t border-border pt-4">
                  {!deleting ? (
                    <button
                      onClick={() => setDeleting(true)}
                      className="w-full text-red-500 text-sm py-2 px-3 rounded border border-red-200 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete Photo
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-text text-center">Delete this photo permanently?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setDeleting(false)} className="flex-1 btn-outline text-xs py-1.5">
                          Cancel
                        </button>
                        <button onClick={handleDelete} className="flex-1 bg-red-500 text-white text-xs py-1.5 rounded hover:bg-red-600 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
