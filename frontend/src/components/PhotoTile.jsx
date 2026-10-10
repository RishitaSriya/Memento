import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MoreVertical, Check } from 'lucide-react';
import { getImageUrl } from '../services/api';

export default function PhotoTile({ photo, onOpen, onToggleFavorite, selected, onSelect, index = 0 }) {
  return (
    <motion.div
      className="masonry-item"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
    >
      <div
        className={`photo-tile rounded overflow-hidden border ${selected ? 'border-accent ring-2 ring-accent' : 'border-border'} transition-all duration-150`}
        onClick={() => onOpen(photo)}
      >
        <img
          src={getImageUrl(photo.storageName)}
          alt={photo.originalName}
          loading="lazy"
          className="w-full h-auto block"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Select checkbox */}
        <button
          className={`absolute top-2 left-2 w-6 h-6 rounded border transition-all duration-150 flex items-center justify-center z-10 ${
            selected
              ? 'bg-accent border-accent text-white opacity-100'
              : 'bg-white/80 border-white/60 text-transparent opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(photo._id);
          }}
        >
          {selected && <Check size={12} />}
        </button>

        {/* Favorite button */}
        <button
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-all duration-150 ${
            photo.isFavorite
              ? 'bg-red-500 text-white opacity-100'
              : 'bg-white/80 text-muted opacity-0 group-hover:opacity-100'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(photo._id);
          }}
        >
          <Heart size={13} className={photo.isFavorite ? 'fill-white' : ''} />
        </button>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <p className="text-white text-xs truncate font-medium drop-shadow-sm">{photo.originalName}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function PhotoSkeleton() {
  const heights = ['h-48', 'h-36', 'h-56', 'h-44', 'h-32', 'h-52'];
  const h = heights[Math.floor(Math.random() * heights.length)];
  return (
    <div className="masonry-item">
      <div className={`skeleton rounded ${h} w-full`} />
    </div>
  );
}
