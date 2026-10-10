import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './hooks/useApp';
import { useToast } from './hooks/useToast';
import { photoService } from './services/api';

import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';
import ToastContainer from './components/ToastContainer';
import UploadModal from './components/UploadModal';

import OverviewPage from './pages/OverviewPage';
import PhotosPage from './pages/PhotosPage';
import AlbumsPage from './pages/AlbumsPage';
import FavoritesPage from './pages/FavoritesPage';
import MemoriesPage from './pages/MemoriesPage';
import MemoryRewindPage from './pages/MemoryRewindPage';
import CapsulesPage from './pages/CapsulesPage';
import MemoryCinemaPage from './pages/MemoryCinemaPage';
import PhotoDetectivePage from './pages/PhotoDetectivePage';

function AppInner() {
  const { uploadModalOpen, setUploadModalOpen } = useApp();
  const { toasts, addToast, removeToast } = useToast();
  const [stats, setStats] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cinemaPayload, setCinemaPayload] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    photoService.getStats()
      .then((res) => setStats(res.data.stats))
      .catch(() => {});
  }, [refreshKey]);

  const handleUploaded = (photos) => {
    addToast(`${photos.length} photo${photos.length > 1 ? 's' : ''} uploaded!`, 'success');
    setRefreshKey((k) => k + 1);
  };

  const handleSyncSample = async () => {
    await photoService.syncSampleFolder();
    setRefreshKey((k) => k + 1);
    addToast('Sample photos folder synced!', 'success');
  };

  const handleLaunchCinema = (photos, title) => {
    setCinemaPayload({ photos, title });
    navigate('/cinema');
  };

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Desktop sidebar */}
      <Sidebar stats={stats} onSyncSample={handleSyncSample} />

      {/* Mobile nav */}
      <MobileNav />

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen">
        <Routes>
          <Route path="/" element={<OverviewPage addToast={addToast} key={refreshKey} />} />
          <Route path="/photos" element={<PhotosPage addToast={addToast} />} />
          <Route path="/albums" element={<AlbumsPage addToast={addToast} />} />
          <Route path="/favorites" element={<FavoritesPage addToast={addToast} />} />
          <Route path="/memories" element={<MemoriesPage addToast={addToast} />} />
          <Route
            path="/rewind"
            element={
              <MemoryRewindPage addToast={addToast} onLaunchCinema={handleLaunchCinema} />
            }
          />
          <Route path="/capsules" element={<CapsulesPage addToast={addToast} />} />
          <Route
            path="/cinema"
            element={
              <div className="p-4 md:p-6">
                <MemoryCinemaPage
                  initialPhotos={cinemaPayload?.photos || []}
                  initialTitle={cinemaPayload?.title || ''}
                  onClose={() => navigate(-1)}
                />
              </div>
            }
          />
          <Route path="/detective" element={<PhotoDetectivePage addToast={addToast} />} />
        </Routes>
      </main>

      {/* Upload modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={handleUploaded}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </BrowserRouter>
  );
}
