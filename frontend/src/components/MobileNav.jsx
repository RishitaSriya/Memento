import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Images, BookOpen, Heart, Clock, Upload } from 'lucide-react';
import { useApp } from '../hooks/useApp';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/photos', icon: Images, label: 'Photos' },
  { to: '/albums', icon: BookOpen, label: 'Albums' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/memories', icon: Clock, label: 'Memories' },
];

export default function MobileNav() {
  const { setUploadModalOpen } = useApp();

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border flex items-center justify-between px-4 py-3">
        <h1 className="font-serif text-xl font-bold text-text tracking-tight">MEMENTO</h1>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
        >
          <Upload size={13} />
          Upload
        </button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-muted'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} className={isActive ? 'text-accent' : 'text-muted'} />
                <span className="text-[10px]">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
