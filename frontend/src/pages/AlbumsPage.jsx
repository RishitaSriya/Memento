import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Edit2, Trash2, X, Check, Image } from 'lucide-react';
import { albumService, getImageUrl } from '../services/api';
import AlbumDetail from './AlbumDetailPage';

function AlbumCard({ album, onClick, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      className="card group cursor-pointer hover:border-accent/30 transition-all duration-200 overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={() => !confirmDelete && onClick(album)}
    >
      {/* Cover */}
      <div className="aspect-video bg-bg relative overflow-hidden border-b border-border">
        {album.coverPhoto ? (
          <img
            src={getImageUrl(album.coverPhoto.storageName)}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <BookOpen size={28} className="text-border" />
            <p className="text-xs text-muted">No cover photo</p>
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(album); }}
            className="p-1.5 rounded bg-white/90 hover:bg-white text-muted hover:text-text transition-colors"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="p-1.5 rounded bg-white/90 hover:bg-red-50 text-muted hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-text text-sm truncate">{album.name}</h3>
        {album.description && (
          <p className="text-xs text-muted mt-0.5 line-clamp-2">{album.description}</p>
        )}
        <p className="text-xs text-muted mt-2">
          <span className="flex items-center gap-1">
            <Image size={11} />
            {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
          </span>
        </p>
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="absolute inset-0 bg-card/95 flex flex-col items-center justify-center gap-3 p-4 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-text text-center font-medium">Delete "{album.name}"?</p>
            <p className="text-xs text-muted text-center">Photos will be preserved in your library.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="btn-outline text-xs py-1.5 px-3">
                Cancel
              </button>
              <button onClick={() => onDelete(album._id)} className="bg-red-500 text-white text-xs py-1.5 px-3 rounded hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AlbumModal({ album, onClose, onSave }) {
  const [name, setName] = useState(album?.name || '');
  const [description, setDescription] = useState(album?.description || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let res;
      if (album) {
        res = await albumService.update(album._id, { name, description });
      } else {
        res = await albumService.create({ name, description });
      }
      onSave(res.data.album);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-text">
            {album ? 'Edit Album' : 'New Album'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-muted block mb-1">Album Name *</label>
            <input
              className="input"
              placeholder="My Album"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Description</label>
            <textarea
              className="input h-20 resize-none"
              placeholder="A brief description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="btn-primary flex items-center gap-2"
          >
            <Check size={14} />
            {saving ? 'Saving…' : album ? 'Save Changes' : 'Create Album'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AlbumsPage({ addToast }) {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { album: null|Album }
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  useEffect(() => {
    loadAlbums();
  }, []);

  async function loadAlbums() {
    setLoading(true);
    try {
      const res = await albumService.getAll();
      setAlbums(res.data.albums);
    } catch (e) {
      addToast?.('Failed to load albums', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = (album) => {
    setAlbums(prev => {
      const existing = prev.find(a => a._id === album._id);
      if (existing) return prev.map(a => a._id === album._id ? album : a);
      return [album, ...prev];
    });
    addToast?.(modal?.album ? 'Album updated' : 'Album created', 'success');
  };

  const handleDelete = async (id) => {
    try {
      await albumService.delete(id);
      setAlbums(prev => prev.filter(a => a._id !== id));
      addToast?.('Album deleted. Photos preserved.', 'success');
    } catch (e) {
      addToast?.('Failed to delete album', 'error');
    }
  };

  if (selectedAlbum) {
    return (
      <AlbumDetail
        albumId={selectedAlbum}
        onBack={() => setSelectedAlbum(null)}
        addToast={addToast}
      />
    );
  }

  return (
    <motion.div
      className="p-6 md:p-8 space-y-6"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">Albums</h1>
          <p className="text-sm text-muted mt-0.5">{albums.length} collection{albums.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ album: null })} className="btn-primary flex items-center gap-2">
          <Plus size={15} />
          New Album
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton rounded-lg aspect-square" />
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-accent" />
          </div>
          <p className="font-serif text-lg text-text mb-1">No albums yet</p>
          <p className="text-sm text-muted mb-6">Create your first album to organize your photographs.</p>
          <button onClick={() => setModal({ album: null })} className="btn-primary flex items-center gap-2">
            <Plus size={14} />
            Create Album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((album) => (
            <AlbumCard
              key={album._id}
              album={album}
              onClick={(a) => setSelectedAlbum(a._id)}
              onEdit={(a) => setModal({ album: a })}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <AlbumModal
          album={modal.album}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </motion.div>
  );
}
