import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Files, HardDrive, AlertTriangle, Trash2,
  CheckCircle2, Sparkles, RefreshCw, ChevronRight, Eye, FileText
} from 'lucide-react';
import { detectiveService, photoService, getImageUrl } from '../services/api';
import { formatBytes } from '../utils/helpers';
import PhotoViewer from '../components/PhotoViewer';

export default function PhotoDetectivePage({ addToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('duplicates'); // duplicates | large | quality | storage
  const [selectedDeleteIds, setSelectedDeleteIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  async function loadAnalysis() {
    setLoading(true);
    try {
      const res = await detectiveService.getAnalysis();
      setData(res.data);
    } catch (e) {
      addToast?.('Failed to run detective analysis', 'error');
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (id) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedDeleteIds.size === 0) return;
    const count = selectedDeleteIds.size;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete ${count} flagged photograph${count > 1 ? 's' : ''}? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await photoService.deleteMany([...selectedDeleteIds]);
      addToast?.(`Successfully cleaned up ${count} photograph${count > 1 ? 's' : ''}`, 'success');
      setSelectedDeleteIds(new Set());
      loadAnalysis();
    } catch (e) {
      addToast?.('Failed to delete selected photos', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldAlert size={14} />
            <span>Storage Hygiene & Integrity Audit</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-text">Photo Detective</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            Audit your memory library for exact binary duplicates (SHA-256), bloated storage files, and image quality issues.
          </p>
        </div>

        <button
          onClick={loadAnalysis}
          disabled={loading}
          className="btn-ghost text-xs flex items-center gap-2 border border-border py-2 px-4 self-start"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Re-scan Library</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-card rounded-2xl border border-border" />
            ))}
          </div>
          <div className="h-80 bg-card rounded-2xl border border-border" />
        </div>
      ) : data ? (
        <>
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 rounded-2xl space-y-1">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Files size={14} className="text-accent" /> Exact Duplicates (SHA-256)
              </span>
              <p className="font-serif text-2xl font-bold text-text">
                {data.summary.duplicateCount} <span className="text-xs font-sans text-muted font-normal">in {data.summary.duplicateGroupCount} sets</span>
              </p>
              <p className="text-[11px] text-accent font-medium">
                Save ~{formatBytes(data.summary.potentialSavingsBytes)}
              </p>
            </div>

            <div className="card p-5 rounded-2xl space-y-1">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <HardDrive size={14} className="text-amber-500" /> Total Library Footprint
              </span>
              <p className="font-serif text-2xl font-bold text-text">
                {formatBytes(data.summary.totalStorageBytes)}
              </p>
              <p className="text-[11px] text-muted">
                Across {data.summary.totalPhotos} total photos
              </p>
            </div>

            <div className="card p-5 rounded-2xl space-y-1">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-indigo-400" /> Large Files
              </span>
              <p className="font-serif text-2xl font-bold text-text">
                {data.summary.largeFilesCount}
              </p>
              <p className="text-[11px] text-muted">
                High resolution or uncompressed
              </p>
            </div>

            <div className="card p-5 rounded-2xl space-y-1">
              <span className="text-xs text-muted flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-500" /> Quality & Health
              </span>
              <p className="font-serif text-2xl font-bold text-text">
                {data.summary.lowResolutionCount === 0 ? 'Optimal' : `${data.summary.lowResolutionCount} flagged`}
              </p>
              <p className="text-[11px] text-muted">
                {data.summary.missingFilesCount} missing file references
              </p>
            </div>
          </div>

          {/* Tab Navigation & Batch Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { id: 'duplicates', label: `Exact Duplicates (${data.summary.duplicateGroupCount})` },
                { id: 'large', label: `Large Files (${data.summary.largeFilesCount})` },
                { id: 'quality', label: `Quality & Blur (${data.summary.lowResolutionCount})` },
                { id: 'storage', label: 'Storage Breakdown' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                    activeTab === t.id
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-muted hover:text-text hover:bg-card'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {selectedDeleteIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="btn-primary bg-red-600 hover:bg-red-700 text-xs flex items-center gap-2 py-2 px-4 shadow-sm"
              >
                <Trash2 size={13} />
                <span>Delete Selected ({selectedDeleteIds.size})</span>
              </button>
            )}
          </div>

          {/* Tab 1: Exact Duplicates */}
          {activeTab === 'duplicates' && (
            <div className="space-y-6">
              {data.duplicateGroups.length === 0 ? (
                <div className="card p-12 text-center rounded-2xl">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-serif text-lg font-bold text-text">Zero Duplicates Found</h3>
                  <p className="text-muted text-xs max-w-sm mx-auto mt-1">
                    Every image in your library has a unique SHA-256 fingerprint. No redundant space is wasted.
                  </p>
                </div>
              ) : (
                data.duplicateGroups.map((group, gIdx) => (
                  <div key={group.checksum || gIdx} className="card p-6 rounded-2xl space-y-4 border-border/80">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div>
                        <span className="text-xs font-mono text-muted">
                          SHA-256: {group.checksum.slice(0, 16)}...
                        </span>
                        <div className="text-xs font-semibold text-text mt-0.5">
                          {group.count} identical files · Potential saving: {formatBytes(group.potentialSavingsBytes)}
                        </div>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-medium">
                        Binary Duplicate
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {group.photos.map((photo, pIdx) => {
                        const isSelected = selectedDeleteIds.has(photo._id);
                        return (
                          <div
                            key={photo._id}
                            className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                              isSelected ? 'border-red-500/50 bg-red-500/5' : 'border-border/70 bg-bg'
                            }`}
                          >
                            <div
                              onClick={() => setViewer({ photo, photos: group.photos, index: pIdx })}
                              className="aspect-square rounded-lg overflow-hidden cursor-pointer relative mb-2"
                            >
                              <img
                                src={getImageUrl(photo.storageName)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>

                            <div className="space-y-1 mb-2">
                              <p className="text-xs font-medium text-text truncate">
                                {photo.originalName}
                              </p>
                              <p className="text-[11px] text-muted">
                                {formatBytes(photo.fileSize)} · {photo.width}x{photo.height}
                              </p>
                            </div>

                            <button
                              onClick={() => toggleSelect(photo._id)}
                              className={`w-full py-1.5 px-2 rounded text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'bg-red-500 text-white'
                                  : 'border border-border text-muted hover:text-red-500 hover:border-red-500/40'
                              }`}
                            >
                              {isSelected ? 'Marked for Deletion' : 'Mark Duplicate'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Large Files */}
          {activeTab === 'large' && (
            <div className="space-y-4">
              {data.largeFiles.length === 0 ? (
                <div className="card p-12 text-center rounded-2xl">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-serif text-lg font-bold text-text">No Bloated Files Found</h3>
                  <p className="text-muted text-xs max-w-sm mx-auto mt-1">
                    All images are well-optimized within standard storage sizes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.largeFiles.map((photo) => (
                    <div key={photo._id} className="card p-4 rounded-xl space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden border border-border">
                        <img
                          src={getImageUrl(photo.storageName)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-text truncate">{photo.originalName}</p>
                        <p className="text-xs font-bold text-accent mt-0.5">
                          {formatBytes(photo.fileSize)}
                        </p>
                        <p className="text-[11px] text-muted">
                          Resolution: {photo.width} x {photo.height}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Quality & Blur */}
          {activeTab === 'quality' && (
            <div className="space-y-4">
              {data.lowResolutionOrBlurry.length === 0 ? (
                <div className="card p-12 text-center rounded-2xl">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-3" />
                  <h3 className="font-serif text-lg font-bold text-text">High Library Fidelity</h3>
                  <p className="text-muted text-xs max-w-sm mx-auto mt-1">
                    No severely blurred or sub-standard resolution files were detected.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {data.lowResolutionOrBlurry.map(({ photo, reason }) => (
                    <div key={photo._id} className="card p-4 rounded-xl flex items-center gap-4">
                      <img
                        src={getImageUrl(photo.storageName)}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-medium text-text truncate">{photo.originalName}</p>
                        <span className="text-[11px] text-amber-500 font-medium block mt-0.5">
                          {reason}
                        </span>
                        <p className="text-[10px] text-muted mt-1">
                          Dimensions: {photo.width}x{photo.height}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Storage Breakdown */}
          {activeTab === 'storage' && (
            <div className="card p-6 rounded-2xl space-y-6">
              <h3 className="font-serif text-lg font-bold text-text">Storage Distribution by Format</h3>
              <div className="space-y-4">
                {Object.entries(data.formatBreakdown).map(([fmt, info]) => {
                  const pct = Math.round((info.bytes / (data.summary.totalStorageBytes || 1)) * 100);
                  return (
                    <div key={fmt} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium uppercase text-text">{fmt}</span>
                        <span className="text-muted">
                          {info.count} files · {formatBytes(info.bytes)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-bg rounded-full overflow-hidden border border-border">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}

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
