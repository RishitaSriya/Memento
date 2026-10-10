import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Images, BookOpen, Heart, Clock, Upload, HardDrive, RefreshCw, Folder
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { formatBytes } from '../utils/helpers';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/photos', icon: Images, label: 'All Photos' },
  { to: '/albums', icon: BookOpen, label: 'Albums' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/memories', icon: Clock, label: 'Memories' },
];

export default function Sidebar({ stats, onSyncSample }) {
  const { setUploadModalOpen } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border fixed top-0 left-0 z-30">
      {/* Brand */}
      <div className="px-6 py-8 border-b border-border">
        <h1 className="font-serif text-2xl font-bold text-text tracking-tight">MEMENTO</h1>
        <p className="text-xs text-muted mt-1 font-light">Your memories, collected.</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-text hover:bg-bg'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className={isActive ? 'text-accent' : 'text-muted'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Upload button */}
      <div className="px-4 py-4 border-t border-border">
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Upload size={15} />
          Upload Photos
        </button>

        {/* Storage indicator */}
        {stats && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted flex items-center gap-1">
                <HardDrive size={12} />
                Storage
              </span>
              <span className="text-xs text-muted">{formatBytes(stats.totalStorage)}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              {/* Visual bar - 5GB cap for display */}
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((stats.totalStorage / (5 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-muted mt-1.5">
              {stats.totalPhotos} photo{stats.totalPhotos !== 1 ? 's' : ''} · {stats.totalAlbums} album{stats.totalAlbums !== 1 ? 's' : ''}
            </p>

            {onSyncSample && (
              <button
                onClick={onSyncSample}
                className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs text-muted hover:text-accent hover:bg-accent/5 border border-border transition-colors"
                title="Sync photos added to memento/sample-photos folder"
              >
                <Folder size={12} className="text-accent" />
                <span>Sync Sample Folder</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
