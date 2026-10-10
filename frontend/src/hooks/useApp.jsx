import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [viewerPhoto, setViewerPhoto] = useState(null);
  const [viewerPhotos, setViewerPhotos] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  const openViewer = useCallback((photo, allPhotos = [], index = 0) => {
    setViewerPhoto(photo);
    setViewerPhotos(allPhotos);
    setViewerIndex(index);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerPhoto(null);
    setViewerPhotos([]);
    setViewerIndex(0);
  }, []);

  const navigateViewer = useCallback((direction) => {
    setViewerIndex((prev) => {
      const next = prev + direction;
      if (next < 0 || next >= viewerPhotos.length) return prev;
      setViewerPhoto(viewerPhotos[next]);
      return next;
    });
  }, [viewerPhotos]);

  const toggleSelectPhoto = useCallback((id) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedPhotos(new Set()), []);

  return (
    <AppContext.Provider value={{
      uploadModalOpen, setUploadModalOpen,
      selectedPhotos, toggleSelectPhoto, clearSelection,
      viewerPhoto, viewerPhotos, viewerIndex,
      openViewer, closeViewer, navigateViewer,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
