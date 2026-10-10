import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ImagePlus, CheckCircle2, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { photoService } from '../services/api';
import { formatBytes, validateImageFile } from '../utils/helpers';

export default function UploadModal({ isOpen, onClose, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    const validated = acceptedFiles.map((file) => {
      const check = validateImageFile(file);
      return {
        file,
        preview: URL.createObjectURL(file),
        valid: check.valid,
        error: check.error || null,
        status: check.valid ? 'pending' : 'error',
      };
    });

    rejectedFiles.forEach((r) => {
      validated.push({
        file: r.file,
        preview: null,
        valid: false,
        error: r.errors[0]?.message || 'File rejected',
        status: 'error',
      });
    });

    setFiles((prev) => [...prev, ...validated]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
    noClick: false,
  });

  const removeFile = (index) => {
    setFiles((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.valid && f.status !== 'success');
    if (validFiles.length === 0) return;

    setUploading(true);
    setProgress(0);
    setResults(null);

    const formData = new FormData();
    validFiles.forEach((f) => formData.append('photos', f.file));

    try {
      const res = await photoService.upload(formData, setProgress);
      const { photos, errors } = res.data;

      setResults({ uploaded: photos.length, failed: errors.length, errors });

      // Update individual file statuses
      const errorMap = {};
      errors.forEach((e) => { errorMap[e.file] = e.error; });

      setFiles((prev) =>
        prev.map((f) => {
          if (!f.valid) return f;
          if (errorMap[f.file.name]) return { ...f, status: 'error', error: errorMap[f.file.name] };
          return { ...f, status: 'success' };
        })
      );

      if (photos.length > 0 && onUploaded) onUploaded(photos);
    } catch (err) {
      setResults({ uploaded: 0, failed: validFiles.length, errors: [{ error: err.response?.data?.message || err.message }] });
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = async (index) => {
    const f = files[index];
    if (!f || !f.valid) return;

    const formData = new FormData();
    formData.append('photos', f.file);

    setFiles((prev) => prev.map((item, i) => i === index ? { ...item, status: 'pending' } : item));

    try {
      const res = await photoService.upload(formData);
      const { photos, errors } = res.data;
      if (photos.length > 0) {
        setFiles((prev) => prev.map((item, i) => i === index ? { ...item, status: 'success' } : item));
        if (onUploaded) onUploaded(photos);
      } else {
        const err = errors[0]?.error || 'Upload failed';
        setFiles((prev) => prev.map((item, i) => i === index ? { ...item, status: 'error', error: err } : item));
      }
    } catch (err) {
      setFiles((prev) => prev.map((item, i) => i === index ? { ...item, status: 'error', error: err.message } : item));
    }
  };

  const handleClose = () => {
    files.forEach((f) => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setFiles([]);
    setResults(null);
    setProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  const pendingCount = files.filter((f) => f.valid && f.status === 'pending').length;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" onClick={handleClose} />
        <motion.div
          className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-serif text-xl font-semibold text-text">Upload Photos</h2>
            <button onClick={handleClose} className="btn-ghost p-1.5 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-150 ${
                isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-bg'
              }`}
            >
              <input {...getInputProps()} />
              <ImagePlus size={32} className="mx-auto mb-3 text-muted" />
              <p className="text-sm font-medium text-text mb-1">
                {isDragActive ? 'Drop photos here' : 'Drag & drop photos, or click to browse'}
              </p>
              <p className="text-xs text-muted">JPEG, PNG, GIF, WebP, TIFF, BMP, HEIC · Up to 50 MB each · Max 20 files</p>
            </div>

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Uploading...
                  </span>
                  <span className="text-text font-medium">{progress}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-accent rounded-full"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Results summary */}
            {results && (
              <div className={`p-3 rounded-lg text-sm ${results.uploaded > 0 ? 'bg-accent-secondary/10 border border-accent-secondary/20' : 'bg-red-50 border border-red-200'}`}>
                {results.uploaded > 0 && (
                  <p className="text-accent-secondary flex items-center gap-2">
                    <CheckCircle2 size={15} /> {results.uploaded} photo{results.uploaded !== 1 ? 's' : ''} uploaded successfully
                  </p>
                )}
                {results.failed > 0 && (
                  <p className="text-red-600 flex items-center gap-2 mt-1">
                    <AlertCircle size={15} /> {results.failed} failed
                  </p>
                )}
              </div>
            )}

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-bg">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded bg-border flex-shrink-0 overflow-hidden">
                      {f.preview ? (
                        <img src={f.preview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImagePlus size={16} className="text-muted" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text truncate">{f.file.name}</p>
                      <p className="text-xs text-muted">{formatBytes(f.file.size)}</p>
                      {f.error && <p className="text-xs text-red-500 mt-0.5">{f.error}</p>}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {f.status === 'success' && <CheckCircle2 size={16} className="text-accent-secondary" />}
                      {f.status === 'error' && (
                        <>
                          <AlertCircle size={16} className="text-red-500" />
                          {f.valid && (
                            <button onClick={() => handleRetry(i)} className="btn-ghost p-1">
                              <RefreshCw size={13} />
                            </button>
                          )}
                        </>
                      )}
                      {f.status === 'pending' && !uploading && (
                        <button onClick={() => removeFile(i)} className="btn-ghost p-1">
                          <X size={14} />
                        </button>
                      )}
                      {f.status === 'pending' && uploading && (
                        <Loader2 size={16} className="text-muted animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <span className="text-xs text-muted">
              {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''} selected` : 'No files selected'}
            </span>
            <div className="flex gap-2">
              <button onClick={handleClose} className="btn-outline">
                {results ? 'Close' : 'Cancel'}
              </button>
              {pendingCount > 0 && !uploading && (
                <button onClick={handleUpload} className="btn-primary flex items-center gap-2">
                  <Upload size={14} />
                  Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
