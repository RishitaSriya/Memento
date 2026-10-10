import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, SlidersHorizontal, Grid2X2, LayoutGrid, Columns,
  X, Trash2, Heart, Images, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { usePhotos } from '../hooks/usePhotos';
import { useApp } from '../hooks/useApp';
import { photoService } from '../services/api';
import PhotoTile, { PhotoSkeleton } from '../components/PhotoTile';
import PhotoViewer from '../components/PhotoViewer';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'nameAZ', label: 'Name A–Z' },
  { value: 'nameZA', label: 'Name Z–A' },
];

export default function PhotosPage({ addToast }) {
  const [density, setDensity] = useState('normal'); // tight | normal | loose
  const [showFilters, setShowFilters] = useState(false);
  const [viewer, setViewer] = useState(null);
  const { selectedPhotos, toggleSelectPhoto, clearSelection } = useApp();

  const [searchMode, setSearchMode] = useState('standard'); // standard | ai
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const { photos, setPhotos, pagination, loading, error, params, setParams, refetch } = usePhotos({
    page: 1,
    limit: 24,
    sort: 'newest',
  });

  const handleSearch = useCallback((e) => {
    setParams(p => ({ ...p, search: e.target.value || undefined, page: 1 }));
  }, [setParams]);

  const handleAiSearch = async (queryText) => {
    const q = queryText !== undefined ? queryText : aiQuery;
    if (!q || !q.trim()) return;
    setAiLoading(true);
    setSearchMode('ai');
    try {
      const res = await photoService.aiSearch(q.trim());
      setAiResults(res.data);
    } catch (err) {
      addToast?.('AI search failed', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSort = useCallback((sort) => {
    setParams(p => ({ ...p, sort, page: 1 }));
  }, [setParams]);

  const handlePage = useCallback((page) => {
    setParams(p => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setParams]);

  const clearFilters = useCallback(() => {
    setParams({ page: 1, limit: 24, sort: 'newest' });
    setSearchMode('standard');
    setAiQuery('');
    setAiResults(null);
  }, [setParams]);

  const handleToggleFavorite = useCallback(async (id) => {
    try {
      const res = await photoService.toggleFavorite(id);
      setPhotos(prev => prev.map(p => p._id === id ? res.data.photo : p));
    } catch (e) {
      addToast?.('Failed to update favorite', 'error');
    }
  }, [setPhotos, addToast]);

  const handleDeleteSelected = async () => {
    if (!selectedPhotos.size) return;
    try {
      await photoService.deleteMany([...selectedPhotos]);
      setPhotos(prev => prev.filter(p => !selectedPhotos.has(p._id)));
      clearSelection();
      addToast?.(`${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''} deleted`, 'success');
    } catch (e) {
      addToast?.('Failed to delete photos', 'error');
    }
  };

  const openViewer = (photo) => {
    const index = photos.findIndex(p => p._id === photo._id);
    setViewer({ photo, index });
  };

  const hasFilters = params.search || params.favorites || params.albumId || params.captureDateFrom;
  const densityClass = density === 'tight' ? 'density-tight' : density === 'loose' ? 'density-loose' : '';

  return (
    <motion.div
      className="p-6 md:p-8 space-y-5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-bold text-text">All Photos</h1>
          {pagination && <p className="text-sm text-muted mt-0.5">{pagination.total} photograph{pagination.total !== 1 ? 's' : ''}</p>}
        </div>

        {/* Density controls */}
        <div className="flex items-center gap-1 border border-border rounded p-1">
          <button onClick={() => setDensity('loose')} className={`p-1.5 rounded transition-colors ${density === 'loose' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}>
            <Grid2X2 size={16} />
          </button>
          <button onClick={() => setDensity('normal')} className={`p-1.5 rounded transition-colors ${density === 'normal' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setDensity('tight')} className={`p-1.5 rounded transition-colors ${density === 'tight' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}>
            <Columns size={16} />
          </button>
        </div>
      </div>

      {/* Search & Filters bar */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9 pr-24"
              placeholder={searchMode === 'ai' ? "Ask Memento: 'Show me sunset photos', 'Photos from last summer'..." : "Search by filename, description, tags…"}
              value={searchMode === 'ai' ? aiQuery : (params.search || '')}
              onChange={(e) => {
                if (searchMode === 'ai') setAiQuery(e.target.value);
                else handleSearch(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchMode === 'ai') {
                  handleAiSearch();
                }
              }}
            />
            {searchMode === 'ai' && (
              <button
                onClick={() => handleAiSearch()}
                disabled={aiLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-primary text-[11px] py-1 px-2.5 rounded-md flex items-center gap-1"
              >
                <Sparkles size={11} />
                <span>Ask AI</span>
              </button>
            )}
          </div>

          {/* Mode Switcher */}
          <button
            onClick={() => {
              if (searchMode === 'standard') {
                setSearchMode('ai');
                if (params.search) setAiQuery(params.search);
              } else {
                setSearchMode('standard');
                setAiResults(null);
              }
            }}
            className={`btn-outline text-xs flex items-center gap-1.5 px-3 py-2 ${
              searchMode === 'ai'
                ? 'bg-accent/15 border-accent text-accent font-semibold'
                : 'text-muted hover:text-text'
            }`}
          >
            <Sparkles size={13} className={searchMode === 'ai' ? 'text-accent' : ''} />
            <span>Ask Memento</span>
          </button>

          <select
            className="input w-auto"
            value={params.sort || 'newest'}
            onChange={(e) => handleSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-outline flex items-center gap-2 ${
              showFilters || hasFilters ? 'border-accent text-accent' : ''
            }`}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent" />}
          </button>

          {(hasFilters || aiResults) && (
            <button onClick={clearFilters} className="btn-ghost flex items-center gap-1 text-xs">
              <X size={13} />
              Reset
            </button>
          )}
        </div>

        {/* Ask Memento Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-muted">
          <span className="flex items-center gap-1 text-accent font-medium text-[11px] whitespace-nowrap">
            <Sparkles size={11} /> Suggestions:
          </span>
          {[
            { label: '🌅 Sunset photos', q: 'sunset photos' },
            { label: '🌲 Pine forest & mist', q: 'forest trees nature' },
            { label: '☕ Old town cafe street', q: 'cafe street lights' },
            { label: '🏔️ Mountain peaks', q: 'mountain peaks' },
            { label: '☀️ Last summer memories', q: 'summer trip' },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => {
                setAiQuery(chip.q);
                handleAiSearch(chip.q);
              }}
              className="px-2.5 py-1 rounded-full bg-card hover:bg-accent/10 border border-border text-[11px] whitespace-nowrap text-muted hover:text-accent transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <motion.div
          className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-4"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div>
            <label className="text-xs text-muted mb-1 block">Favorites only</label>
            <select
              className="input"
              value={params.favorites || ''}
              onChange={(e) => setParams(p => ({ ...p, favorites: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All photos</option>
              <option value="true">Favorites only</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Capture date from</label>
            <input
              type="date"
              className="input"
              value={params.captureDateFrom || ''}
              onChange={(e) => setParams(p => ({ ...p, captureDateFrom: e.target.value || undefined, page: 1 }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Capture date to</label>
            <input
              type="date"
              className="input"
              value={params.captureDateTo || ''}
              onChange={(e) => setParams(p => ({ ...p, captureDateTo: e.target.value || undefined, page: 1 }))}
            />
          </div>
          <div>
            <label className="text-xs text-muted mb-1 block">Per page</label>
            <select
              className="input"
              value={params.limit || 24}
              onChange={(e) => setParams(p => ({ ...p, limit: parseInt(e.target.value), page: 1 }))}
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>
        </motion.div>
      )}

      {/* Multi-select actions */}
      {selectedPhotos.size > 0 && (
        <motion.div
          className="flex items-center gap-3 p-3 rounded-lg bg-accent/10 border border-accent/20"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-sm text-accent font-medium">
            {selectedPhotos.size} selected
          </span>
          <div className="flex-1" />
          <button onClick={handleDeleteSelected} className="text-red-500 flex items-center gap-1.5 text-sm hover:text-red-600 transition-colors">
            <Trash2 size={14} />
            Delete
          </button>
          <button onClick={clearSelection} className="btn-ghost text-xs">
            Cancel
          </button>
        </motion.div>
      )}

      {/* Ask Memento Banner */}
      {searchMode === 'ai' && aiResults && (
        <div className="p-3.5 bg-accent/10 border border-accent/25 rounded-xl flex items-center justify-between text-xs">
          <span className="flex items-center gap-2 text-accent font-medium">
            <Sparkles size={14} />
            Ask Memento found {aiResults.totalMatches} matching photograph{aiResults.totalMatches !== 1 ? 's' : ''} for "{aiResults.query}"
          </span>
          <button
            onClick={() => {
              setSearchMode('standard');
              setAiResults(null);
            }}
            className="text-xs text-muted hover:text-accent underline font-medium"
          >
            Show All Photos
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Photo grid */}
      {(loading || aiLoading) ? (
        <div className={`masonry-grid ${densityClass}`}>
          {Array.from({ length: 12 }).map((_, i) => <PhotoSkeleton key={i} />)}
        </div>
      ) : (searchMode === 'ai' && aiResults ? aiResults.results : photos).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Images size={40} className="text-border mb-4" />
          <p className="font-serif text-lg text-text mb-1">No photos found</p>
          <p className="text-sm text-muted">
            {searchMode === 'ai' ? 'Try rewording your natural query or searching for other subjects.' : hasFilters ? 'Try adjusting your search or filters.' : 'Upload your first photographs to get started.'}
          </p>
          {(hasFilters || aiResults) && (
            <button onClick={clearFilters} className="btn-outline mt-4 text-sm">Clear Filters</button>
          )}
        </div>
      ) : (
        <div className={`masonry-grid ${densityClass}`}>
          {(searchMode === 'ai' && aiResults ? aiResults.results : photos).map((photo, i) => (
            <PhotoTile
              key={photo._id}
              photo={photo}
              index={i}
              onOpen={openViewer}
              onToggleFavorite={handleToggleFavorite}
              selected={selectedPhotos.has(photo._id)}
              onSelect={toggleSelectPhoto}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => handlePage(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-muted px-4">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages}
            className="btn-ghost flex items-center gap-1 text-sm disabled:opacity-40"
          >
            Next
            <ChevronRight size={16} />
          </button>
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
            setViewer(v => v ? { ...v, photo: updated } : null);
          }}
        />
      )}
    </motion.div>
  );
}
