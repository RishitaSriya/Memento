import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Images, BookOpen, Heart, Clock, Upload,
  HardDrive, Folder, RotateCcw, Lock, Film, ShieldAlert
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { formatBytes } from '../utils/helpers';

const navigationSections = [
  {
    title: 'Archive',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Overview' },
      { to: '/photos', icon: Images, label: 'All Photos' },
      { to: '/albums', icon: BookOpen, label: 'Albums' },
      { to: '/favorites', icon: Heart, label: 'Favorites' },
    ],
  },
  {
    title: 'Discovery',
    items: [
      { to: '/memories', icon: Clock, label: 'Memories' },
      { to: '/rewind', icon: RotateCcw, label: 'Memory Rewind' },
      { to: '/capsules', icon: Lock, label: 'Memory Capsules' },
    ],
  },
  {
    title: 'Experiences',
    items: [
      { to: '/cinema', icon: Film, label: 'Memory Cinema' },
      { to: '/detective', icon: ShieldAlert, label: 'Photo Detective' },
    ],
  },
];

export default function Sidebar({ stats, onSyncSample }) {
  const { setUploadModalOpen } = useApp();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-card border-r border-border fixed top-0 left-0 z-30 select-none">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-border/80">
        <h1 className="font-serif text-2xl font-bold text-text tracking-tight flex items-center gap-2">
          <span>MEMENTO</span>
        </h1>
        <p className="text-[11px] text-muted mt-0.5 font-light">Your life, preserved in little moments.</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {navigationSections.map((sec) => (
          <div key={sec.title} className="space-y-1">
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted/70 block mb-1">
              {sec.title}
            </span>
            {sec.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'text-muted hover:text-text hover:bg-bg'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={isActive ? 'text-accent' : 'text-muted'} />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Upload button & Storage Info */}
      <div className="px-4 py-4 border-t border-border/80 bg-card">
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs shadow-sm"
        >
          <Upload size={14} />
          <span>Upload Photos</span>
        </button>

        {/* Storage indicator */}
        {stats && (
          <div className="mt-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted flex items-center gap-1 font-medium">
                <HardDrive size={11} /> Storage
              </span>
              <span className="text-muted font-mono">{formatBytes(stats.totalStorage)}</span>
            </div>
            <div className="h-1 bg-border rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min((stats.totalStorage / (5 * 1024 * 1024 * 1024)) * 100, 100)}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>{stats.totalPhotos} photos</span>
              <span>{stats.totalAlbums} albums</span>
            </div>

            {onSyncSample && (
              <button
                onClick={onSyncSample}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] text-muted hover:text-accent hover:bg-accent/5 border border-border transition-colors"
                title="Sync photos added to sample-photos folder"
              >
                <Folder size={11} className="text-accent" />
                <span>Sync Sample Folder</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
